import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { memoryDb, updateTimestamp } from '../data/store.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { mongoIsReady, saveDomainRecord } from '../data/mongoStore.js';

const buildToken = (userId: string) => jwt.sign({ userId }, env.jwtSecret, { expiresIn: '7d' });

const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ message: 'Name, valid email, and password (6+ chars) are required.' });
  }

  const existing = memoryDb.users.find(
    (user) =>
      typeof user.email === "string" &&
      user.email.toLowerCase() === String(email).toLowerCase(),
  );
  if (existing) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: randomUUID(),
    name: String(name),
    email: String(email),
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (mongoIsReady()) {
    try {
      await saveDomainRecord('users', newUser);
    } catch (error) {
      console.error('Unable to persist the new user.', error);
      return res.status(500).json({ message: 'Unable to create account right now.' });
    }
  }
  memoryDb.users.push(newUser);
  const token = buildToken(newUser.id);
  setAuthCookie(res, token);

  return res.status(201).json({
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
    token,
  });
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = memoryDb.users.find(
    (entry) =>
      typeof entry.email === "string" &&
      entry.email.toLowerCase() === String(email).toLowerCase(),
  );
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const validPassword = await bcrypt.compare(String(password), user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  updateTimestamp(user);
  const token = buildToken(user.id);
  setAuthCookie(res, token);

  return res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
};

export const logoutUser = (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully.' });
};

export const getCurrentUser = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
    },
  });
};
