import express from 'express';
import * as loanController from './loan.controller.js';

const router = express.Router();

// ─── Account-level queries ─────────────────────────────────────


// Get loan account details (overview card data)
router.get('/accounts/:accountNumber', loanController.getLoanAccountDetails);

// Get all loan requests for an account
router.get('/accounts/:accountNumber/requests', loanController.getAccountRequests);

// Get EMI schedule for an account
router.get('/accounts/:accountNumber/schedule', loanController.getEmiSchedule);

// ─── Request-level actions ─────────────────────────────────────

router.get('/types',loanController.getLoanTypes);

router.get('/types/:id',loanController.getLoanTypeById);

// Create new loan request
router.get('/all-requests',loanController.getAllLoanRequests);

router.post('/requests', loanController.createLoanRequest);

// Get single request details
router.get('/requests/:requestId', loanController.getRequestDetails);

// Approve loan request
router.patch('/requests/:requestId/approve', loanController.approveRequest);

// Reject loan request
router.patch('/requests/:requestId/reject', loanController.rejectRequest);

// ─── EMI-level actions ─────────────────────────────────────────

// Get single EMI detail
router.get('/schedule/:scheduleId', loanController.getEmiDetail);

// Pay EMI
router.post('/schedule/:scheduleId/pay', loanController.processEmiPayment);

export default router;