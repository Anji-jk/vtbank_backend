import * as authService from './auth.service.js';
import { success } from '../../shared/utils/apiResponse.util.js';
import { authCookieName, cookieOptions } from '../../shared/config/jwt.config.js';
import AppError from '../../shared/utils/appError.util.js';
import db from '../../shared/db/models/index.js'


export const register = async (req, res, next) => {
    try {
        if (!req.body) {
            throw new AppError('Missing Registartion Fields', 400)

        }

        const result = await authService.registerCustomer(req.body, req.file);
        return success(res, result, 'Registration Submitted Successfully', 201);
    }
    catch (err) {
        return next(err);
    }
};


export const loginAsCustomer = async (req, res, next) => {
    try {
        console.log(req.headers['content-type']);
        console.log(req.body);
        if (!req.body) {
            throw new AppError('Credentials can not be empty', 400);
        }

        const result = await authService.loginCustomer(req.body);
        res.cookie(authCookieName, result.token, cookieOptions);
        return success(res, { user: result.user }, 'Login Successful');

    }
    catch (err) {
        return next(err);
    }
};

export const loginAsManager = async (req, res, next) => {
    try {
        console.log(req.headers['content-type']);
        console.log(req.body);
        if (!req.body) {
            throw new AppError('Credentials can not be empty', 400);
        }

        const result = await authService.loginManager(req.body);
        res.cookie(authCookieName, result.token, cookieOptions);
        return success(res, { user: result.user }, 'Login Successful');

    }
    catch (err) {
        return next(err);
    }
};

export const getCurrentUser = async(req, res, next) => {
    try{
        const {sub, role} = req.user;

        if (role == 'manager'){
            return res.status(200).json({
                success: true,
                data: {
                    role: 'manager',
                    name: process.env.ADMIN_USERNAME || 'Bank Manager',

                },
            });
        }


        const customer = await db.Customer.findByPk(sub);
        if (!customer || customer.status !== 'active') {
            throw new AppError("Authetication Required", 401);
        }
 
        return res.status(200).json({
            success: true,
            data: {
                role: 'customer',
                name: customer.firstName,
                customerId: customer.customerId,
                customerCode: customer.customerCode,
            },
        });

    }
    catch(err){
        next(err);

    }
};



export const logout = async (req, res, next) => {
    try {
        res.clearCookie(authCookieName, cookieOptions);
        return success(res, null, 'Logged out successfully');
    } catch (error) {
        return next(error);
    }
};