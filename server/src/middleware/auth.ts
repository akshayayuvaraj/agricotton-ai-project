import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { memoryDb } from '../data/store.js';
import { mongoIsReady, readDomainRecords } from '../data/mongoStore.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromHeader ?? req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { userId: string };
    let user = memoryDb.users.find((entry) => entry.id === decoded.userId);
    if (!user && mongoIsReady()) {
      const users = await readDomainRecords<typeof memoryDb.users[number]>('users');
      user = users.find((entry) => entry.id === decoded.userId);
      if (user) memoryDb.users.push(user);
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
