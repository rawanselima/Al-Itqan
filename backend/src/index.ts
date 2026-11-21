import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

import circleRoutes from './routes/circleRoutes';
import studentRoutes from './routes/studentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import homeworkRoutes from './routes/homeworkRoutes';
import reportRoutes from './routes/reportRoutes';

// Load .env explicitly from backend folder and fallback to cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://rawanselima2_db_user:ufAPKbCJSS9vpU4@cluster0.kp1cmi2.mongodb.net/al_itqan?retryWrites=true&w=majority';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection Handling for Serverless (Vercel) & Local
let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log(`✅ Connected to MongoDB. Database: ${mongoose.connection.name}`);
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

// Middleware to ensure DB is connected for every incoming request (Essential for Vercel)
app.use(async (_req: Request, _res: Response, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Health Check Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Al-Itqan API is running smoothly on Vercel Serverless',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    databaseName: mongoose.connection.name || 'none',
  });
});

// API Routes
app.use('/api/circles', circleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/reports', reportRoutes);

// Run app.listen locally only when NOT running inside Vercel Serverless
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Local server listening on http://localhost:${PORT}`);
  });
}

// Export default app for Vercel Serverless Functions
export default app;
