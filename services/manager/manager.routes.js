import {Router} from 'express';
import * as ManagerController from './manager.controller.js';
import { authMiddleware } from './shared/middleware/auth.middleware.js';
import { requireRole } from './shared/middleware/role.middleware.js';
import { validate } from './shared/middleware/validate.middleware.js';

import { createAccountSchema } from './account.validator.js';



const router = Router();

router.get(
    '/customers', 
    authMiddleware, 
    requireRole("manager"),
    ManagerController.getCustomersForAdmin
);

router.get(
    '/customers/:customerId',
    authMiddleware,
    requireRole("manager"),
    ManagerController.getCustomerById
)

router.get(
    '/customers/:customerId/transactions',
    authMiddleware,
    requireRole("manager"),
    ManagerController.getCustomerTransactionsForAdmin
);

router.patch(
    '/customers/:customerId/edit',
    authMiddleware,
    requireRole("manager"),
    ManagerController.editCustomerByAdmin
)
router.patch(
    '/customers/:customerId/approve',
    authMiddleware,
    requireRole('manager'),
    ManagerController.approveCustomer
);

router.patch(
    '/customers/:customerId/reject',
    authMiddleware,
    requireRole('manager'),
    ManagerController.rejectCustomer
);


router.post(
    '/customers/:customerId/accounts/create',
    authMiddleware,
    requireRole('manager'),
    validate(createAccountSchema),
    ManagerController.createAccount

)

router.patch(
    '/customers/:customerId/freeze',
    authMiddleware,
    requireRole('manager'),
    ManagerController.freezeCustomer
)

router.patch(
    '/customers/:customerId/activate',
    authMiddleware,
    requireRole('manager'),
    ManagerController.activateCustomer
)



export default router;