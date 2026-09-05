import dotenv from 'dotenv';

dotenv.config();

export const sequelizeOptions = {
  // host: process.env.DB_HOST,
  // port: Number(process.env.DB_PORT),
  dialect: 'mysql',
   dialectOptions: {
    socketPath: process.env.DB_HOST,
  },
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

export const dbCredentials = {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};