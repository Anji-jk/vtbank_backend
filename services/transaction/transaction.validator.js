import Joi from 'joi';
// import { randomUUID } from 'crypto';

export const sendMoneySchema = Joi.object({
    // Destination account/UPI details
    toAccountNumber: Joi.string()
        .trim()
        .required()
        .pattern(/^0123\d{12}$/)
        .messages({
            'string.empty': 'Recipient account number or UPI ID is required.',
        }),

    beneficiaryName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Beneficiary name is required.',
        }),

    // Transfer channel & conditional validations
    transferMethod: Joi.string()
        .valid('UPI', 'IMPS', 'NEFT', 'RTGS')
        .required()
        .messages({
            'any.only': 'Transfer method must be UPI, IMPS, NEFT, or RTGS.',
        }),


    // Financial values
    amount: Joi.number()
        .positive()
        .precision(2)
        .max(1000000) // Adjust max transaction limit per business rules
        .required()
        .messages({
            'number.positive': 'Amount must be greater than 0.',
            'number.precision': 'Amount cannot have more than 2 decimal places.',
        }),

    // Fully optional IFSC Code (validates format ONLY if provided)
    ifscCode: Joi.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .optional()
        .allow('', null)
        .messages({
            'string.pattern.base': 'Invalid IFSC code format (e.g., HDFC0001234).',
        }),
    remarks: Joi.string()
        .trim()
        .max(150)
        .optional()
        .allow('', null),

});

export const depositMoneySchema = Joi.object({
    accountHolder: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Account holder name is required.',
        }),

    // Payment method validation
    paymentMethod: Joi.string()
        .valid(
            'UPI',
            'Net Banking',
            'Debit Card',
            'Cash / Branch Deposit'
        )
        .required()
        .messages({
            'any.only':
                'Payment method must be UPI, Net Banking, Debit Card, or Cash / Branch Deposit.',
            'any.required': 'Payment method is required.',
            'string.empty': 'Payment method is required.',
        }),
    // Financial values
    amount: Joi.number()
        .positive()
        .precision(2)
        .max(1000000) // Adjust max transaction limit per business rules
        .required()
        .messages({
            'number.positive': 'Amount must be greater than 0.',
            'number.precision': 'Amount cannot have more than 2 decimal places.',
        }),

    remarks: Joi.string()
        .trim()
        .max(150)
        .optional()
        .allow('', null),

});