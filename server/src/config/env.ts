import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  jwtSecret: process.env.JWT_SECRET ?? 'agri-cotton-ai-dev-secret',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/agricotton_ai',
};
