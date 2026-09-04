import db from './shared/db/models/index.js';
import AppError from './shared/utils/appError.util.js';
import { calculateEmiDetails, generateAmortizationSchedule } from './shared/utils/loanCalculation.util.js';
import { generateReferenceNumber, generateTransactionId } from './shared/utils/transaction.util.js';
import crypto from 'crypto';

// ─── Account-level queries ─────────────────────────────────────

export const getLoanAccountDetails = async (accountNumber) => {
    const loanAccount = await db.Account.findByPk(String(accountNumber));
    if (!loanAccount || loanAccount.accountType.toLowerCase() !== 'loan') {
        throw new AppError("Account is not a loan account", 404);
    }

    const loanAccountDetails = await db.LoanAccount.findByPk(accountNumber, {
        include: [
            {
                model: db.LoanRequest,
                include: [{ model: db.SavingsAccount, as: 'linkedSavingsAccount' }]
            }
        ]
    });
    
    if (!loanAccountDetails) {
        throw new AppError('Loan account details not found', 404);
    }

    return loanAccountDetails;
};

export const getActiveLoanTypes = async () => {
    return await db.LoanType.findAll({
        where: { isActive: true },
        order: [['typeName', 'ASC']],
    });
};

export const getLoanTypeById = async (id) => {
    try {
        return await db.LoanType.findOne({
            where: { loanTypeId: id, isActive: true },
            attributes: ['loanTypeId', 'typeName', 'fixedInterestRate'],
        });
    } catch (error) {
        throw new Error(`Error fetching loan type by ID: ${error.message}`);
    }
};

export const getAccountRequests = async (accountNumber) => {
    const loanAccount = await db.LoanAccount.findByPk(accountNumber, {
        include: [{ model: db.Account }],
    });

    if (!loanAccount) {
        throw new AppError('Loan account not found', 404);
    }

    return await db.LoanRequest.findAll({
        where: { customerId: loanAccount.Account.customerId },
        include: [{ model: db.LoanType }, { model: db.SavingsAccount, as: 'linkedSavingsAccount' }],
        order: [['createdAt', 'DESC']],
    });
};

export const getEmiSchedule = async (accountNumber) => {
    return await db.LoanEmiSchedule.findAll({
        where: { accountNumber },
        order: [['installmentNumber', 'ASC']],
    });
};

// ─── Request-level actions ─────────────────────────────────────

export const submitLoanRequest = async (customerId, { loanTypeId, requestedAmount, tenureMonths, purpose, linkedSavingsAccountNumber, remarks }) => {
    const loanType = await db.LoanType.findByPk(loanTypeId);
    if (!loanType || !loanType.isActive) {
        throw new AppError('Invalid or inactive loan type selected.', 400);
    }

    // Verify linked savings account belongs to customer
    const savingsAccount = await db.SavingsAccount.findByPk(linkedSavingsAccountNumber, {
        include: [{
            model: db.Account,
            where: { customerId, accountType: 'savings', status: 'active' }
        }]
    });

    if (!savingsAccount) {
        throw new AppError('Provided linked savings account is invalid or does not belong to the customer.', 400);
    }

    const emiValue = calculateEmiDetails(requestedAmount, loanType.fixedInterestRate, tenureMonths);

    return await db.LoanRequest.create({
        customerId,
        loanTypeId,
        requestedAmount,
        tenureMonths,
        calculatedEmi: emiValue,
        purpose: purpose || null,
        linkedSavingsAccountNumber,
        remarks: remarks || null,
        status: 'pending',
    });
};

export const getRequestDetails = async (requestId) => {
    const request = await db.LoanRequest.findByPk(requestId, {
        include: [
            { model: db.LoanType },
            { model: db.SavingsAccount, as: 'linkedSavingsAccount' }
        ],
    });

    if (!request) {
        throw new AppError('Loan request not found', 404);
    }

    return request;
};

export const approveLoanRequest = async (requestId) => {
    const transaction = await db.sequelize.transaction();

    try {
        const loanRequest = await db.LoanRequest.findByPk(requestId, { transaction, lock: true });
        if (!loanRequest) throw new AppError('Loan request not found', 404);
        if (loanRequest.status !== 'pending') throw new AppError(`Request is already ${loanRequest.status}`, 409);

        const loanType = await db.LoanType.findByPk(loanRequest.loanTypeId, { transaction });

        // 1. Fetch linked Savings Account specified in the request
        const savingsAccount = await db.SavingsAccount.findByPk(loanRequest.linkedSavingsAccountNumber, {
            transaction,
            lock: true
        });

        if (!savingsAccount) {
            throw new AppError('Linked savings account specified in request not found.', 400);
        }

        // 2. Locate Loan Account container
        const loanAccount = await db.LoanAccount.findOne({
            include: [{
                model: db.Account,
                where: { customerId: loanRequest.customerId, accountType: 'loan' }
            }],
            transaction,
            lock: true
        });

        if (!loanAccount) {
            throw new AppError('Loan Account container not found for customer.', 404);
        }

        // 3. Update Loan Request status
        await loanRequest.update({
            status: 'approved',
            reviewedAt: new Date()
        }, { transaction });

        // 4. Update Loan Account details
        await loanAccount.update({
            requestId: loanRequest.requestId,
            totalLoanAmount: loanRequest.requestedAmount,
            interestRate: loanType.fixedInterestRate,
            tenureMonths: loanRequest.tenureMonths,
            emiAmount: loanRequest.calculatedEmi,
            remainingBalance: loanRequest.requestedAmount,
            status: 'active',
            disbursedAt: new Date()
        }, { transaction });

        // 5. Generate and bulk-insert EMI Schedule
        const emiSchedule = generateAmortizationSchedule(
            loanAccount.accountNumber,
            loanRequest.requestedAmount,
            loanType.fixedInterestRate,
            loanRequest.tenureMonths
        );
        await db.LoanEmiSchedule.bulkCreate(emiSchedule, { transaction });

        // 6. Credit customer's LINKED savings account
        const currentBalance = parseFloat(savingsAccount.balance || 0);
        const newBalance = currentBalance + parseFloat(loanRequest.requestedAmount);
        await savingsAccount.update({ balance: newBalance }, { transaction });

        // 7. Record transaction entry in Savings Ledger
        const txnRef = generateReferenceNumber('DISB');
        await db.SavingsTransaction.create({
            transactionId: generateReferenceNumber('TXN'),
            accountNumber: savingsAccount.accountNumber,
            transactionType: 'credit',
            amount: loanRequest.requestedAmount,
            balanceAfter: newBalance,
            referenceNumber: txnRef,
            channel: 'BRANCH',
            description: `Loan disbursement for ${loanAccount.accountNumber}`,
            status: 'completed'
        }, { transaction });

        await transaction.commit();
        return {
            message: 'Loan approved, schedule generated, and amount disbursed to linked savings account',
            accountNumber: loanAccount.accountNumber,
            disbursedToAccount: savingsAccount.accountNumber
        };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

export const rejectLoanRequest = async (requestId, rejectionReason) => {
    const loanRequest = await db.LoanRequest.findByPk(requestId);
    if (!loanRequest) throw new AppError('Loan request not found', 404);
    if (loanRequest.status !== 'pending') throw new AppError(`Request is already ${loanRequest.status}`, 409);

    await loanRequest.update({
        status: 'rejected',
        rejectionReason: rejectionReason || 'Loan application rejected',
        reviewedAt: new Date()
    });

    return loanRequest;
};

// ─── EMI-level actions ─────────────────────────────────────────

export const getEmiDetail = async (scheduleId) => {
    const emi = await db.LoanEmiSchedule.findByPk(scheduleId);
    if (!emi) {
        throw new AppError('EMI record not found', 404);
    }
    return emi;
};

export const payEmiInstallment = async (scheduleId) => {
    const transaction = await db.sequelize.transaction();

    try {
        const emiItem = await db.LoanEmiSchedule.findByPk(scheduleId, { transaction, lock: true });
        if (!emiItem) throw new AppError('EMI Schedule record not found', 404);
        if (emiItem.status === 'paid') throw new AppError('EMI is already paid', 400);

        // Fetch Loan Account along with the active Loan Request to get linkedSavingsAccountNumber
        const loanAccount = await db.LoanAccount.findByPk(emiItem.accountNumber, {
            include: [{ model: db.LoanRequest }],
            transaction,
            lock: true
        });

        if (!loanAccount) throw new AppError('Loan Account not found', 404);
        if (!loanAccount.LoanRequest || !loanAccount.LoanRequest.linkedSavingsAccountNumber) {
            throw new AppError('No linked savings account found for this loan', 404);
        }

        const linkedSavingsAccountNumber = loanAccount.LoanRequest.linkedSavingsAccountNumber;

        // Fetch linked savings account
        const savingsAccount = await db.SavingsAccount.findByPk(linkedSavingsAccountNumber, {
            transaction,
            lock: true
        });

        if (!savingsAccount) {
            throw new AppError('Linked savings account for loan repayment not found', 404);
        }

        const emiAmount = parseFloat(emiItem.emiAmount);
        const currentSavingsBalance = parseFloat(savingsAccount.balance);

        if (currentSavingsBalance < emiAmount) {
            throw new AppError(`Insufficient balance in linked savings account (${savingsAccount.accountNumber}) to process EMI. Required: ${emiAmount}, Available: ${currentSavingsBalance}`, 400);
        }

        // 1. Deduct from Linked Savings Account
        const newSavingsBalance = currentSavingsBalance - emiAmount;
        await savingsAccount.update({ balance: newSavingsBalance }, { transaction });

        // 2. Reduce remaining principal balance on Loan Account using principalAmount
        const principalPaid = parseFloat(emiItem.principalAmount || 0);
        const updatedLoanBalance = Math.max(0, parseFloat(loanAccount.remainingBalance) - principalPaid);
        await loanAccount.update({
            remainingBalance: updatedLoanBalance,
        }, { transaction });

        // 3. Record transaction in Savings Ledger
        const txnRef = `EMI-${emiItem.installmentNumber}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        await db.SavingsTransaction.create({
            transactionId: generateReferenceNumber('TXN'),
            accountNumber: savingsAccount.accountNumber,
            transactionType: 'debit',
            amount: emiAmount,
            balanceAfter: newSavingsBalance,
            referenceNumber: txnRef,
            channel: 'BRANCH',
            description: `EMI payment for loan account ${loanAccount.accountNumber}, installment ${emiItem.installmentNumber}`,
            status: 'completed'
        }, { transaction });

        // 4. Update EMI schedule record
        await emiItem.update({
            status: 'paid',
            amountPaid: emiAmount,
            paidAt: new Date(),
            transactionReference: txnRef
        }, { transaction });

        await transaction.commit();
        return { message: 'EMI paid successfully', referenceNumber: txnRef };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};