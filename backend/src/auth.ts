import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
export type AuthUser = { userId: string; email: string; name: string };

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const signToken = (user: AuthUser) => jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

export const authMiddleware = (req: Request & { user?: AuthUser }, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
