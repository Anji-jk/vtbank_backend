import { Op } from "sequelize";
import AppError from '../../shared/utils/appError.util.js';
import db from '../../shared/db/models/index.js';
import { resolveDateRange } from '../../shared/utils/dateFilter.util.js';
import { generateReferenceNumber, generateTransactionId, chooseAccountModel } from "../../shared/utils/transaction.util.js";

export const getSingleAccountTransactions = async (accountNumber, { page,
    limit,
    search,
    startDate,
    endDate,
    transactionType,
    status }) => {

    const account = await db.Account.findByPk(accountNumber);
    if (!account) {
        throw new AppError('Account Not found', 404)
    }

    const where = { accountNumber };

    if (search) {
        const searchTrimmed = search.trim();

        where[Op.or] = [
            { referenceNumber: { [Op.like]: `%${searchTrimmed}%` } },
            { transactionId: { [Op.like]: `%${searchTrimmed}%` } },
        ];
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    if (transactionType) {
        where.transactionType = transactionType; // 'Deposit' | 'Withdrawal'
    }

    if (status) {
        where.status = status; // 'Completed' | 'Failed'
    }

    // Dynamic Model Selection based on account type
    let TransactionModel;

    if (account.accountType?.toLowerCase() === 'savings') {
        TransactionModel = db.SavingsTransaction
    }

    //  Pagination calculation using `limit`
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, parseInt(limit, 10));
    const offset = (parsedPage - 1) * parsedLimit;

    // Execute paginated query
    const { rows, count } = await TransactionModel.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parsedLimit,
        offset: offset,
    });

    return {
        transactions: rows,
        total: count,
    };

}


export const transferMoneyToOthers = async (fromAccountNumber, transferData) => {
    console.log(`Transactions happening from ${fromAccountNumber} with data:`, transferData);
    const { toAccountNumber, amount, remarks = '', transferMethod = 'UPI' } = transferData;
    const numericAmount = Number(amount);

    if (fromAccountNumber === toAccountNumber) {
        throw new AppError('Source and destination accounts cannot be identical.', 400);
    }

    const transaction = await db.sequelize.transaction();

    try {
        // 1. Order account numbers alphanumerically to prevent deadlocks
        const [firstAccountNum, secondAccountNum] = [fromAccountNumber, toAccountNumber].sort();

        // 2. Lock accounts with pessimistic locking
        const accounts = await db.Account.findAll({
            where: {
                accountNumber: [firstAccountNum, secondAccountNum],
            },
            lock: db.Sequelize.Transaction.LOCK.UPDATE,
            transaction,
        });

        const sourceAccount = accounts.find((a) => a.accountNumber === fromAccountNumber);
        const destinationAccount = accounts.find((a) => a.accountNumber === toAccountNumber);

        if (!sourceAccount) throw new AppError('Source account not found.', 404);
        if (!destinationAccount) throw new AppError('Destination account not found.', 404);

        if (sourceAccount.status !== 'active') throw new AppError('Source account is inactive.', 400);
        if (destinationAccount.status !== 'active') throw new AppError('Destination account is inactive.', 400);

        // 3. Fetch specific sub-accounts within transaction context
        const sourceAccountDetails = await chooseAccountModel(sourceAccount.accountType).findByPk(
            sourceAccount.accountNumber,
            { transaction }
        );
        const destinationAccountDetails = await chooseAccountModel(destinationAccount.accountType).findByPk(
            destinationAccount.accountNumber,
            { transaction }
        );

        // 4. Validate balances
        const sourceBalance = Number(sourceAccountDetails.currentBalance);
        const destinationBalance = Number(destinationAccountDetails.currentBalance);

        if (sourceBalance < numericAmount) throw new AppError('Insufficient funds.', 400);

        // 5. Pre-calculate balance snapshots
        const sourceBalanceAfter = sourceBalance - numericAmount;
        const destinationBalanceAfter = destinationBalance + numericAmount;

        // 6. Perform balance mutations
        await sourceAccountDetails.decrement('currentBalance', { by: numericAmount, transaction });
        await destinationAccountDetails.increment('currentBalance', { by: numericAmount, transaction });

        // 7. Generate shared Reference Number (UTR) & Unique Transaction IDs
        const methodPrefix = ['UPI', 'IMPS', 'NEFT', 'RTGS'].includes(transferMethod) ? transferMethod : 'UPI';

        const sharedRefNo = generateReferenceNumber(methodPrefix); // Shared tracking number
        const senderTxnId = generateTransactionId('DR');           // Unique Debit Txn ID
        const receiverTxnId = generateTransactionId('CR');         // Unique Credit Txn ID

        // 8. Create Double-Entry Ledger Records
        const senderTransaction = await db.SavingsTransaction.create(
            {
                transactionId: senderTxnId,
                accountNumber: fromAccountNumber,
                transactionType: 'debit',
                amount: numericAmount,
                balanceAfter: sourceBalanceAfter,
                referenceNumber: sharedRefNo,
                channel: methodPrefix,
                description: `Transfer to ${toAccountNumber} via ${methodPrefix}${remarks ? ` - ${remarks}` : ''}`,
                status: 'completed',
            },
            { transaction }
        );

        await db.SavingsTransaction.create(
            {
                transactionId: receiverTxnId,
                accountNumber: toAccountNumber,
                transactionType: 'credit',
                amount: numericAmount,
                balanceAfter: destinationBalanceAfter,
                referenceNumber: sharedRefNo,
                channel: methodPrefix,
                description: `Transfer from ${fromAccountNumber} via ${methodPrefix}${remarks ? ` - ${remarks}` : ''}`,
                status: 'completed',
            },
            { transaction }
        );

        // 9. Commit transaction atomically
        await transaction.commit();

        return {
            transactionId: senderTxnId,
            referenceNumber: sharedRefNo,
            sourceBalanceAfter,

        };
    } catch (err) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error during transaction transfer:', err);
        throw err instanceof AppError ? err : new AppError('Transaction failed.', 500);
    }
};


export const depositMoneyToBank = async (accountNumber, depositData) => {
    const { accountHolder, paymentMethod, amount, remarks } = depositData;

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
        throw new AppError('Deposit amount must be a valid number greater than zero.', 400);
    }

    // 2. Account existence
    const account = await db.Account.findByPk(accountNumber);
    if (!account) {
        throw new AppError('Account not found', 404);
    }

    // 4. Account status — CORRECT casing ('Active', matching the real
    // enum), not previously checked in the stub at all.
    if (account.status !== 'active') {
        throw new AppError(`Cannot deposit — account status is '${account.status}'.`, 409);
    }

    // 5. Customer + name-match validation 
    const customer = await db.Customer.findByPk(account.customerId);
    if (!customer) {
        throw new AppError('Customer not found', 404);
    }

    const customerName = `${customer.firstName} ${customer.lastName}`.trim().toLowerCase();
    const providedName = (accountHolder || '').trim().toLowerCase();

    if (customerName !== providedName) {
        throw new AppError('Account holder name does not match our records. Please verify and try again.', 400);
    }

    const transaction = await db.sequelize.transaction();

    try {
        // 6. Lock the SavingsAccount row FOR UPDATE —
        const depositAccount = await chooseAccountModel(account.accountType).findByPk(accountNumber, {
            lock: db.Sequelize.Transaction.LOCK.UPDATE,
            transaction,
        });

        if (!depositAccount) {
            throw new AppError('Savings account details not found — data inconsistency.', 500);
        }

        const currentBalance = Number(depositAccount.currentBalance);

        //  Per-transaction cap  — read AFTER locking, 
        const balanceAfter = currentBalance + numericAmount;

        const referenceNumber = generateReferenceNumber(paymentMethod || 'DEP');
        const transactionId = generateTransactionId('CR');

        // 8. Create the ledger record and update the balance — both
        // inside the same transaction. 
        await db.SavingsTransaction.create(
            {
                transactionId,
                accountNumber,
                transactionType: 'deposit',
                amount: numericAmount,
                balanceAfter,
                referenceNumber,
                description: `depostet amount ${numericAmount}by banker - ${remarks}` ,
                status: 'completed',
            },
            { transaction }
        );

        await depositAccount.increment('currentBalance', { by: numericAmount, transaction });

        await transaction.commit();

        return { transactionId, referenceNumber, balanceAfter };
    } catch (err) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error during deposit:', err);
        throw err instanceof AppError ? err : new AppError('Deposit failed.', 500);
    }
};