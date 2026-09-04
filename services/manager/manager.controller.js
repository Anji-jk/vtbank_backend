import { success } from "../../shared/utils/apiResponse.util.js";
import AppError from "../../shared/utils/appError.util.js";
import * as managerService from './manager.service.js'
import { generateStatementPDF } from '../../shared/utils/pdfStatement.util.js';


export const getCustomersForAdmin = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, status,accountType, startDate, endDate } = req.query;

        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);

        if (
            Number.isNaN(parsedPage) || 
            Number.isNaN(parsedLimit) || 
            parsedPage < 1 || 
            parsedLimit < 1 || 
            parsedLimit > 100
        ) {
            throw new AppError('Invalid pagination parameters', 400);
        }

        const result = await managerService.getCustomers({
            page: parsedPage,
            limit: parsedLimit,
            search,
            status,
            startDate,
            endDate,
        });

        return success(res, result, 'Fetched customers successfully');
    } catch (err) {
        return next(err);
    }
};


export const getCustomerTransactionsForAdmin = async (req, res, next) => {
    try {
        const { customerId } = req.params;
        const { search, startDate, endDate, transactionType, status, page = 1, limit = 10 } = req.query;

        if (!customerId || !req.query) {
            throw new AppError("Can't find any customerId or any params", 400)
        }

        const result = await managerService.getCustomerTransactions(customerId, { 
            search, 
            startDate, 
            endDate, 
            transactionType, 
            status, 
            page , 
            limit 
        });

        return success(res, result, 'Fetched customer transactions successfully');

    }
    catch (err) {
        return next(err);
    }
}


export const approveCustomer = async (req, res, next) => {

    try {
        const { customerId } = req.params;

        if (!customerId) {
            throw new AppError("Can't find any customer Id", 400);
        }

        const result = await managerService.approveCustomerRegistration(customerId);
        return success(res, result, "Approved Customers Successfully");

    }
    catch (err) {
        return next(err);
    }
}

export const rejectCustomer = async (req, res, next) => {

    try {
        const { customerId } = req.params;

        if (!customerId) {
            throw new AppError("Can't find any customer Id", 400);
        }

        const result = await managerService.rejectCustomerRegistration(customerId);
        return success(res, result, "rejected Customers Successfully");

    }
    catch (err) {
        return next(err);
    }
}


export const getCustomerById = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        if (!customerId) {
            throw new AppError("can't find any customerId", 400);
        }

        const result = await managerService.getCustomerProfileById(customerId);
        return success(res, result, "Fetched Customer Profile Successfully");
    }
    catch (err) {
        return next(err);
    }
}

export const editCustomerByAdmin = async(req, res, next) => {
    try{
        const {customerId} = req.params;

        if (!customerId) {
            throw new AppError("can't find any customerId", 400);
        }

        if (!req.body){
            throw new AppError("No edit info found");
        }

        const result = await managerService.editCustomer(customerId, req.body);
        return success(res, result, "Customer Edited successfully",201);

    }
    catch(err){
        return next(err);
    }
}

export const createAccount = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        if (!customerId) {
            throw new AppError("can't find any customerId", 400);
        }

        if (!req.body) {
            throw new AppError("No account info found", 400);
        }

        const result = await managerService.createAccountForCustomer(customerId, req.body)
        return success(res, result, 'Account created Successfully', 201);

    }
    catch (err) {
        return next(err);
    }
}

export const freezeCustomer = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        if (!customerId) {
            throw new AppError("can't find any customerId", 400);
        }
        const result = await managerService.freezeCustomerByManager(customerId)
        return success(res, result, 'freeze customer successfully', 201);

    }
    catch (err) {
        return next(err);
    }
}

export const activateCustomer = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        if (!customerId) {
            throw new AppError("can't find any customerId", 400);
        }
        const result = await managerService.activateCustomerByManager(customerId)
        return success(res, result, 'freeze customer successfully', 201);

    }
    catch (err) {
        return next(err);
    }
}
