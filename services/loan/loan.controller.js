import { success } from "../../shared/utils/apiResponse.util.js";
import AppError from "../../shared/utils/appError.util.js";
import * as loanService from './loan.service.js';

// ─── Account-level ─────────────────────────────────────────────

export const getLoanAccountDetails = async (req, res, next) => {
    try {
        const { accountNumber } = req.params;
        if (!accountNumber) {
            throw new AppError("Account number is required", 400);
        }
        const result = await loanService.getLoanAccountDetails(accountNumber);
        return success(res, result, "Fetched loan account details successfully");
    } catch (err) {
        return next(err);
    }
};

export const getAllLoanRequests = async(req,res,next) => {

}

export const getAccountRequests = async (req, res, next) => {
    try {
        const { accountNumber } = req.params;
        if (!accountNumber) {
            throw new AppError("Account number is required", 400);
        }
        const result = await loanService.getAccountRequests(accountNumber);
        return success(res, result, "Fetched loan requests successfully");
    } catch (err) {
        return next(err);
    }
};

export const getEmiSchedule = async (req, res, next) => {
    try {
        const { accountNumber } = req.params;
        if (!accountNumber) {
            throw new AppError("Account number is required", 400);
        }
        const result = await loanService.getEmiSchedule(accountNumber);
        return success(res, result, "Fetched EMI schedule successfully");
    } catch (err) {
        return next(err);
    }
};

// ─── Request-level ─────────────────────────────────────────────
export const getLoanTypes = async (req, res, next) => {
    try {
        const loanTypes = await loanService.getActiveLoanTypes();
        return success(res, loanTypes, "Loan types fetched successfully");
    } catch (err) {
        return next(err);
    }
};

export const getLoanTypeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new AppError("Loan Type ID is required", 400);
        }

        const loanType = await loanService.getLoanTypeById(id);
        if (!loanType) {
            throw new AppError("Loan type not found", 404);
        }

        return success(res, loanType, "Loan type retrieved successfully");
    } catch (err) {
        return next(err);
    }
};


export const createLoanRequest = async (req, res, next) => {
    try {
        const { customerId, loanTypeId, requestedAmount, tenureMonths, purpose, linkedSavingsAccountNumber, remarks } = req.body;
        if (!customerId || !loanTypeId || !requestedAmount || !tenureMonths) {
            throw new AppError("customerId, loanTypeId, requestedAmount and tenureMonths are required", 400);
        }

        console.log("request coming",req.body)


        const result = await loanService.submitLoanRequest(customerId, {
            loanTypeId,
            requestedAmount,
            tenureMonths,
            purpose,
            linkedSavingsAccountNumber,
            remarks,
        });
        return success(res, result, "Loan request submitted successfully", 201);
    } catch (err) {
        return next(err);
    }
};

export const getRequestDetails = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        if (!requestId) {
            throw new AppError("Request ID is required", 400);
        }
        const result = await loanService.getRequestDetails(requestId);
        return success(res, result, "Fetched request details successfully");
    } catch (err) {
        return next(err);
    }
};

export const approveRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        if (!requestId) {
            throw new AppError("Request ID is required", 400);
        }
        const result = await loanService.approveLoanRequest(requestId);
        return success(res, result, "Loan approved and disbursed successfully");
    } catch (err) {
        return next(err);
    }
};

export const rejectRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { rejectionReason } = req.body;
        if (!requestId) {
            throw new AppError("Request ID is required", 400);
        }
        const result = await loanService.rejectLoanRequest(requestId, rejectionReason);
        return success(res, result, "Loan request rejected successfully");
    } catch (err) {
        return next(err);
    }
};

// ─── EMI-level ─────────────────────────────────────────────────

export const getEmiDetail = async (req, res, next) => {
    try {
        const { scheduleId } = req.params;
        if (!scheduleId) {
            throw new AppError("Schedule ID is required", 400);
        }
        const result = await loanService.getEmiDetail(scheduleId);
        return success(res, result, "Fetched EMI details successfully");
    } catch (err) {
        return next(err);
    }
};

export const processEmiPayment = async (req, res, next) => {
    try {
        const { scheduleId } = req.params;
        if (!scheduleId) {
            throw new AppError("Schedule ID is required", 400);
        }
        const result = await loanService.payEmiInstallment(scheduleId);
        return success(res, result, "EMI paid successfully");
    } catch (err) {
        return next(err);
    }
};