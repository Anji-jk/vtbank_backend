import db from '../db/models/index.js'
import crypto from 'crypto';

// Generates a shared tracking UTR (e.g. UPI512345678912)
export const generateReferenceNumber = (prefix = 'UPI') => {
    const numericPart = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}${numericPart}`;
};

// Generates a unique Transaction ID for individual ledger records
export const generateTransactionId = (type = 'TXN') => {
    const timestamp = Date.now();
    const uuidSnippet = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    return `${type}${timestamp}${uuidSnippet}`;
};

export const chooseAccountModel = (accountType) => {
    switch (accountType?.toLowerCase()) {
        case 'savings':
            return db.SavingsAccount;
        case 'loan':
            return db.LoanAccount;
        case 'current':
            return db.CurrentAccount;
        default:
            throw new AppError(`Unsupported or invalid account type: ${accountType}`, 400);
    }
};
