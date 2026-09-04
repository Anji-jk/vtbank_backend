import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import managerRoutes from './manager.routes.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';

export const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use('/', managerRoutes);
app.use(errorMiddleware);

export const handler = app;
