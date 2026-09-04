import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authMiddleware }from './shared/middleware/auth.middleware.js';

import { validate } from './shared/middleware/validate.middleware.js';

import {
  registerSchema,
  customerLoginSchema,
  managerLoginSchema
} from './auth.validator.js';

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  authController.register
);

router.post(
  '/customer/login',
  validate(customerLoginSchema),
  authController.loginAsCustomer
);

router.post(
  '/manager/login',
  validate(managerLoginSchema),
  authController.loginAsManager
);

router.get('/me', authMiddleware, authController.getCurrentUser);


export default router;
