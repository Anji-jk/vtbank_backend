import multer from 'multer';
import AppError from '../utils/appError.util.js';
import { fail } from '../utils/apiResponse.util.js';

export const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return fail(res, err.message, err.statusCode, err.errors);
  }

  if (err.isJoi) {
    const errors = err.details?.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return fail(res, 'Validation failed', 400, errors);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return fail(res, 'Unauthorized', 401);
  }

//   if (err instanceof multer.MulterError) {
//     if (err.code === 'LIMIT_FILE_SIZE') {
//       return fail(res, 'KYC file must be 100KB or smaller', 400);
//     }
//     return fail(res, err.message, 400);
//   }

//   if (err.message?.includes('Only PDF and image files')) {
//     return fail(res, err.message, 400);
//   }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    return fail(res, `${field} already exists`, 409);
  }

  console.error(err);
  return fail(res, 'Internal server error', 500);
};
