import {Router} from 'express';
import * as transactionController from './transaction.controller.js';
import { authMiddleware } from './shared/middleware/auth.middleware.js';
import { requireRole } from './shared/middleware/role.middleware.js';
import { validate } from './shared/middleware/validate.middleware.js';

import { sendMoneySchema, depositMoneySchema } from './transaction.validator.js';

const router = Router();

router.get(
    '/accounts/:accountNumber', 
    authMiddleware, 
    requireRole("manager"),
    transactionController.getAccountTransactionByFilters
);

router.post(
    '/accounts/:accountNumber/transfer',
    authMiddleware,
    requireRole("manager"),
    validate(sendMoneySchema),
    transactionController.transferMoney
);

router.post(
    '/accounts/:accountNumber/deposit',
    authMiddleware,
    requireRole("manager"),
    validate(depositMoneySchema),
    transactionController.depositMoney
);




export default router;