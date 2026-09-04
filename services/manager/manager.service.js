import db from './shared/db/models/index.js';
import { Op } from "sequelize";
import AppError from './shared/utils/appError.util.js';
import { generateRandomPassword, hashPassword } from './shared/utils/password.util.js';
import { generateAccountNumber } from './shared/utils/accountNumber.util.js';
import { sendRegistrationApprovedEmail, sendAccountCreatedEmail, sendRegistrationRejectedEmail } from './shared/mail/mail.service.js';




export const getCustomers = async ({
    page,
    limit,
    search,
    status,
    accountType,
    startDate,
    endDate,
}) => {
    const where = {};

    if (status) {
        // DB enum stores lowercase values ('active' | 'suspended' | 'pending') —
        // normalize whatever case the frontend sends so the match actually hits.
        where.status = Array.isArray(status)
            ? { [Op.in]: status.map((s) => s.toLowerCase()) }
            : status.toLowerCase();
    }

    if (accountType) {
        where.intendedAccountType = accountType; // 'savings' | 'loan'
    }

    if (search) {
        const searchTrimmed = search.trim();
        where[Op.or] = [
            { firstName: { [Op.like]: `%${searchTrimmed}%` } },
            { lastName: { [Op.like]: `%${searchTrimmed}%` } },
            { email: { [Op.like]: `%${searchTrimmed}%` } },
            { phoneNumber: { [Op.like]: `%${searchTrimmed}%` } },
            { customerCode: { [Op.like]: `%${searchTrimmed}%` } },
        ];
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (parsedPage - 1) * parsedLimit;

    // Stats should reflect search/date filters (so the cards stay relevant
    // to what the manager is looking at) but NEVER the status filter itself —
    // status is what the cards break down BY. Locking stats to the same
    // `where` as the list would make "Total Customers" collapse to whatever
    // single status tab happens to be selected.
    const { status: _omitStatus, ...statsWhere } = where;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [{ rows, count }, totalEntries, activeCount, frozenCount, newThisMonthCount] =
        await Promise.all([
            db.Customer.findAndCountAll({
                where,
                attributes: [
                    "customerId",
                    "customerCode",
                    "firstName",
                    "lastName",
                    "email",
                    "phoneNumber",
                    "intendedAccountType",
                    "status",
                    "createdAt",
                ],
                order: [["createdAt", "DESC"]],
                limit: parsedLimit,
                offset,
            }),
            db.Customer.count({ where: statsWhere }),
            db.Customer.count({ where: { ...statsWhere, status: "active" } }),
            db.Customer.count({ where: { ...statsWhere, status: "suspended" } }),
            db.Customer.count({
                where: { ...statsWhere, createdAt: { [Op.gte]: startOfMonth } },
            }),
        ]);

    return {
        customers: rows,
        totalCount: count,
        stats: {
            totalEntries,
            activeCount,
            frozenCount,
            newThisMonthCount,
        },
    };
};

// getRegistrationQueue — powers RegistrationQueue.jsx (pending customers only)
export const getRegistrationQueue = async ({
    page,
    limit,
    search,
    accountType,
    startDate,
    endDate,
}) => {
    const where = { status: "pending" };

    if (accountType) {
        where.intendedAccountType = accountType; // 'savings' | 'loan'
    }

    if (search) {
        const searchTrimmed = search.trim();
        where[Op.or] = [
            { firstName: { [Op.like]: `%${searchTrimmed}%` } },
            { lastName: { [Op.like]: `%${searchTrimmed}%` } },
            { email: { [Op.like]: `%${searchTrimmed}%` } },
            { phoneNumber: { [Op.like]: `%${searchTrimmed}%` } },
            { customerCode: { [Op.like]: `%${searchTrimmed}%` } },
        ];
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await db.Customer.findAndCountAll({
        where,
        attributes: [
            "customerId",
            "customerCode",
            "firstName",
            "lastName",
            "email",
            "phoneNumber",
            "intendedAccountType",
            "status",
            "createdAt",
        ],
        order: [["createdAt", "DESC"]],
        limit: parsedLimit,
        offset,
    });

    return { customers: rows, totalCount: count };
};

export const approveCustomerRegistration = async (customerId) => {
    const customer = await db.Customer.findByPk(customerId);

    if (!customer) {
        throw new AppError("Customer not Found", 404);
    }

    if (customer.status != "pending") {
        throw new AppError(`Cannot approve — customer status is already ${customer.status}`, 409);
    }

    const temporaryPassword = generateRandomPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const transaction = await db.sequelize.transaction();
    let accountNum = null;

    try {

        await customer.update(
            { status: 'active', password: passwordHash },
            { transaction }
        );

        accountNum = generateAccountNumber(customer.customerCode);

        if (customer.intendedAccountType == 'savings') {
            await db.Account.create({
                accountNumber: accountNum,
                customerId: customerId,
                accountType: "savings",
                status: 'active'
            },
                { transaction }
            )

            await db.SavingsAccount.create({
                accountNumber: accountNum,
            }, { transaction })
        }
        else {
            await db.Account.create({
                accountNumber: accountNum,
                customerId: customerId,
                accountType: "loan",
                status: 'active'
            },
                { transaction }
            )
            await db.LoanAccount.create({
                accountNumber: accountNum,
            }, { transaction })


        }

        await transaction.commit();
    }
    catch (err) {
        await transaction.rollback();
        throw err;
    }

    await sendRegistrationApprovedEmail(customer.email, customer.firstName, {
        customerCode: customer.customerCode,
        accountNumber: accountNum,
        temporaryPassword: temporaryPassword,
    });

    return {
        customerId: customer.customerId,
        customerCode: customer.customerCode,
        status: customer.status,
        accountNumber: accountNum,
        message: "Customer Account is active"
    };

}


export const rejectCustomerRegistration = async (customerId, rejectionReason = null) => {
    const customer = await db.Customer.findByPk(customerId);

    if (!customer) {
        throw new AppError("Customer not Found", 404);
    }

    if (customer.status !== "pending") {
        throw new AppError(`Cannot reject — customer status is already ${customer.status}`, 409);
    }

    // Capture details before deleting the record
    const { email, firstName, customerCode } = customer;

    const transaction = await db.sequelize.transaction();

    try {
        await customer.destroy({ transaction });
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    // Send rejection email after successful DB cleanup
    await sendRegistrationRejectedEmail(email, firstName, {
        customerCode,
        reason: rejectionReason || "Application did not meet the eligibility criteria.",
    });

    return {
        customerId,
        customerCode,
        status: "rejected",
        message: "Customer registration has been rejected and record deleted."
    };
};


export const getCustomerProfileById = async (customerId) => {
    const customer = await db.Customer.findByPk(customerId, {
        attributes: {
            exclude: ['password'], // never returned, even to a Manager
        },
    });

    if (!customer) {
        throw new AppError('Customer not found', 404);
    }

    const accounts = await db.Account.findAll({
        where: { customerId },
        include: [
            {
                model: db.SavingsAccount,
                required: false,
            },
            {
                model: db.LoanAccount,
                required: false,
            },
        ],
    });

    return { customer, accounts };
}


export const createAccountForCustomer = async (customerId, accountData) => {

    console.log("customerId", customerId)
    console.log("account ", accountData)

    const customer = await db.Customer.findByPk(customerId);
    if (!customer) {
        throw new AppError('Customer not found', 404);
    }

    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {

        const transaction = await db.sequelize.transaction();
        let accountNum = null;

        try {

            const accountNum = generateAccountNumber(customer.customerCode);
            console.log("geneerated", accountNum)
            const newAccount = await db.Account.create({
                accountNumber: accountNum,
                customerId: Number(customerId),
                accountType: accountData.accountType,
                currency: accountData.currency || 'INR',
                status: 'active'
            }, { transaction });

            if (accountData.accountType == 'savings') {
                await db.SavingsAccount.create(
                    {
                        accountNumber: accountNum,
                        currentBalance: accountData.currentBalance || 0.0,
                        minimumBalance: accountData.minimumBalance || 0.0,
                        withdrawalLimit: accountData.withdrawalLimit || 500000,
                    },
                    { transaction }
                );
            }
            else {
                await db.LoanAccount.create({
                    accountNumber: accountNum,
                }, { transaction })

            }

            await transaction.commit();

            try {
                await sendAccountCreatedEmail(
                    customer.email,
                    customer.firstName,
                    accountNum,
                    accountData.accountType
                );
            } catch (emailError) {
                // Log email failure so it doesn't interrupt the API response
                console.error('Failed to send account creation email:', emailError);
            }

            return {
                customerId: customer.customerId,
                customerCode: customer.customerCode,
                accountNumber: accountNum,
                message: 'Account created.'
            }


        }
        catch (error) {
            await transaction.rollback();
            console.error(error)

            // Retry if it was a unique constraint error (account number collision)
            if (error.name === 'SequelizeUniqueConstraintError') {
                attempt++;
                if (attempt >= maxRetries) {
                    throw new AppError('Failed to generate a unique account number. Please try again.', 500);
                }
            } else {
                throw new AppError("Account creation is not successful", 400);
            }
        }

    }
}


export const freezeCustomerByManager = async (customerId) => {
    // 1. Check if customer exists
    const customer = await db.Customer.findByPk(customerId);
    if (!customer) {
        throw new AppError('Customer not found', 404);
    }

    // 2. Start managed transaction
    const transaction = await db.sequelize.transaction();

    try {
        // Step A: Update customer status to inactive
        await customer.update(
            { status: 'suspended' },
            { transaction }
        );

        // Step B: Freeze all associated accounts for this customer
        await db.Account.update(
            { status: 'closed' },
            {
                where: { customerId: customerId },
                transaction
            }
        );

        // Step C: Commit all changes
        await transaction.commit();

        return {
            success: true,
            message: 'Customer and all associated accounts have been successfully frozen.',
        };
    } catch (error) {
        // Rollback transaction on any failure
        await transaction.rollback();
        console.error(error.message)
        throw new AppError(
            error.message || 'Failed to freeze customer and accounts',
            500
        );
    }
};



export const activateCustomerByManager = async (customerId) => {
    // 1. Check if customer exists
    console.log("unfreeze", customerId)
    const customer = await db.Customer.findByPk(customerId);
    if (!customer) {
        throw new AppError('Customer not found', 404);
    }

    // 2. Start managed transaction
    const transaction = await db.sequelize.transaction();

    try {
        // Step A: Update customer status to inactive
        await customer.update(
            { status: 'active' },
            { transaction }
        );

        // Step B: Freeze all associated accounts for this customer
        await db.Account.update(
            { status: 'active' },
            {
                where: { customerId: customerId },
                transaction
            }
        );

        // Step C: Commit all changes
        await transaction.commit();

        return {
            success: true,
            message: 'Customer and all associated accounts have been successfully re-activated.',
        };
    } catch (error) {
        // Rollback transaction on any failure
        await transaction.rollback();
        console.error(error.message)
        throw new AppError(
            error.message || 'Failed to re-activate customer and accounts',
            500
        );
    }
};

export const editCustomer = async (customerId, editData) => {
    try {
        const customer = await db.Customer.findByPk(customerId);
        if (!customer) {
            throw new AppError("Customer not found", 404);
        }

        console.log("updatedata", editData)

        const {
            email,
            phoneNumber,
            occupation,
            gender,
            maritalStatus,
        } = editData;

        // 3. Perform the update operation inside try block
        await customer.update({
            ...(email !== undefined && { email }),
            ...(phoneNumber !== undefined && { phoneNumber }),
            // ...(occupation !== undefined && { occupation }),
            // ...(gender !== undefined && { gender }),
            // ...(maritalStatus !== undefined && { maritalStatus }),
        });

        // 4. Return success outcome
        return {
            message: "Customer profile updated successfully",
            customer: customer.toJSON(),
        };
    } catch (error) {
        console.error("Failed to update customer:", error);
        throw new AppError("Failed to update customer profile due to a server error", 500);
    }
};


export const getCustomerTransactions = async (customerId, {
    search,
    startDate,
    endDate,
    transactionType,
    status,
    page = 1,
    limit = 10
}) => {
    const customer = await db.Customer.findByPk(customerId);
    if (!customer) {
        throw new AppError('Customer not found', 404);
    }

    // find this customer's ACTIVE accounts only .
    const activeAccounts = await db.Account.findAll({
        where: { customerId, status: 'active' },
        attributes: ['accountNumber'],
    });

    const accountNumbers = activeAccounts.map((acc) => acc.accountNumber);

    if (accountNumbers.length === 0) {
        return { rows: [], totalCount: 0 };
    }

    // Step 2: transactions across those specific accounts, with the
    // usual filters applied.
    const where = {
        accountNumber: { [Op.in]: accountNumbers },
    };

    if (search) {
        where[Op.or] = [
            { referenceNumber: { [Op.like]: `%${search}%` } },
            { transactionId: { [Op.like]: `%${search}%` } },
            { accountNumber: { [Op.like]: `%${search}%` } }
        ];
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    if (transactionType) where.transactionType = transactionType;
    if (status) where.status = status;

    const { rows, count } = await db.SavingsTransaction.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
    });

    return { transactions: rows, totalCount: count };

}