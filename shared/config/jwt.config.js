import 'dotenv/config';

export const jwtCredentials = {
  secretKey: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRY || '30m',
};

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  maxAge: 30 * 60 * 1000,
};

export const authCookieName = 'accessToken';
