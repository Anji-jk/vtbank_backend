import jwt from 'jsonwebtoken';
import { jwtCredentials } from '../config/jwt.config.js';

export const signAccessToken = (payload) => {
  return jwt.sign(payload, jwtCredentials.secretKey, {
    expiresIn: jwtCredentials.expiresIn,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, jwtCredentials.secretKey);
};
