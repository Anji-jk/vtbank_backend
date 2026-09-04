import Joi from "joi";

export const createAccountSchema = Joi.object({
    customerId: Joi.number().integer().positive().required(),
    accountType: Joi.string().valid('savings', 'loan').required(),
    currency: Joi.string().valid('INR').default('INR'),
    currentBalance: Joi.number().min(0).precision(2).required(),
    withdrawalLimit: Joi.number().min(0).precision(2).when('accountType', {
      is: 'savings',
      then: Joi.required(),
      otherwise: Joi.optional().allow(0)
    }),
  });