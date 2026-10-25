import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { hydratePersistentData, registerDemoData } from './data/store.js';
import authRoutes from './routes/authRoutes.js';
import farmRoutes from './routes/farmRoutes.js';
import fieldRoutes from './routes/fieldRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import soilRoutes from './routes/soilRoutes.js';
import fertilizerRoutes from './routes/fertilizerRoutes.js';
import cottonIssueRoutes from './routes/cottonIssueRoutes.js';
import { seedCottonIssues } from './data/seedCottonIssues.js';
import calendarRoutes from './routes/calendarRoutes.js';
import { ensureDomainIndexes } from './data/mongoStore.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'agri-cotton-ai-server' });
});

app.use('/api/auth', authRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/soil', soilRoutes);
app.use('/api/fertilizer', fertilizerRoutes);
app.use('/api/cotton-issues', cottonIssueRoutes);
app.use('/api/calendars', calendarRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error.' });
});

const startServer = async () => {
  await connectDatabase();
  await ensureDomainIndexes();
  await hydratePersistentData();
  await registerDemoData();
  await seedCottonIssues();
  app.listen(env.port, () => {
    console.log(`AgriCotton AI server listening on http://localhost:${env.port}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  void startServer();
}

export { app, startServer };
