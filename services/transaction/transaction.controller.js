import { success } from "../../shared/utils/apiResponse.util.js";
import AppError from "../../shared/utils/appError.util.js";
import * as transactionService from './transaction.service.js'
import { generateStatementPDF } from '../../shared/utils/pdfStatement.util.js';


export const getAccountTransactionByFilters = async (req, res, next) => {
    try {
        const { accountNumber } = req.params;
        const {
            page = 1,
            limit = 10,
            search,
            startDate,
            endDate,
            transactionType,
            status
        } = req.query;

        // Call service passing all filter criteria
        const result = await transactionService.getSingleAccountTransactions(accountNumber, {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            search,
            startDate,
            endDate,
            transactionType,
            status,
        });

        return success(res, result,"Transactions fetched Successfully",200)
        
    } catch (err) {
        next(err);
    }
};

export const transferMoney = async (req, res, next) => {
    try {
        const { accountNumber } = req.params;

        if (!accountNumber || !req.body) {
            throw new AppError("no account or transfer data found", 400)
        }

        const result = await transactionService.transferMoneyToOthers(accountNumber, req.body)
        return success(res, result, 'Transfer done sucessfully', 200)

    }
    catch (err) {
        return next(err)
    }
}

export const depositMoney = async (req, res, next) => {
    try {
        const { accountNumber } = req.params;

        if (!accountNumber || !req.body) {
            throw new AppError("no account or transfer data found", 400)
        }

        const result = await transactionService.depositMoneyToBank(accountNumber, req.body)
        return success(res, result, 'Amount deposited sucessfully', 200)

    }
    catch (err) {
        return next(err)
    }
}


