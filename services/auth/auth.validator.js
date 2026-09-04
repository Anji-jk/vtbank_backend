import Joi from 'joi';

export const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  phoneNumber: Joi.string().trim()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'phoneNumber must be a valid 10-digit mobile number' }),
  dateOfBirth: Joi.date()
    .less('now')
    .max(new Date(new Date().setFullYear(new Date().getFullYear() - 18)))
    .required()
    .messages({ 'date.max': 'Customer must be at least 18 years old' }),
  aadhaarId: Joi.string().trim()
    .pattern(/^\d{12}$/)
    .required()
    .messages({
      'string.pattern.base': 'aadhaarId must be a 12-digit number',
    }),
  address: Joi.string().trim().required(),
  city: Joi.string().trim().max(100).required(),
  state: Joi.string().trim().max(100).required(),
  country: Joi.string().trim().max(100).required(),
  postalCode: Joi.string().trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'postalCode must be a 6-digit PIN code',
    }),
  intendedAccountType: Joi.string().valid('savings', 'loan').required(),

});


export const customerLoginSchema = Joi.object({
  customerCode:Joi.string().required(),
  password: Joi.string().required(),
});


export const managerLoginSchema = Joi.object({
  username: Joi.string().trim().required(),
  password: Joi.string().trim().required(),
});

export const changePassowrdSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({
      'any.only': 'confirmPassword must match newPassword',
    }),
});



