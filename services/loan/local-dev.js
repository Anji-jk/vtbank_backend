// services/auth/local-dev.js
import { app } from './handler.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`loan-fn listening locally on ${PORT}`));