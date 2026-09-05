import express from 'express'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import loanRoutes from './loan.routes.js'
import { errorMiddleware } from './shared/middleware/error.middleware.js';

export const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use('/api/loan', loanRoutes);
app.use(errorMiddleware);

export const handler = app;