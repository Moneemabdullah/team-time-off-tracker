import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

const createToken = (payload: JwtPayload, secret: string, { expiresIn }: SignOptions) => {
  const token = jwt.sign(payload, secret, { expiresIn });
  return token;
};

const verifyToken = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret);
    return {
      success: true,
      data: decoded,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown token verification error',
      error,
    };
  }
};

const decodeToken = (token: string) => {
  return jwt.decode(token);
};

export const jwtUtils = {
  createToken,
  verifyToken,
  decodeToken,
};