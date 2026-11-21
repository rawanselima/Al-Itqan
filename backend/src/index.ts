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

// Robust Connection Caching for Serverless & Long-running Node server
let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // If currently connecting, wait for the existing in-flight promise
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  cachedPromise = mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    })
    .then((m) => {
      console.log(`✅ Connected to MongoDB. Database: ${m.connection.name}`);
      return m;
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      cachedPromise = null;
      throw err;
    });

  return cachedPromise;
}

// Connect immediately on startup so local server is ready instantly
connectDB().catch(() => {});

// Middleware to ensure DB connection is ready before any API route executes
app.use(async (_req: Request, res: Response, next) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    res.status(500).json({
      error: 'فشل الاتصال بقاعدة البيانات. يرجى التأكد من اتصال الإنترنت.',
      details: err.message,
    });
  }
});

// Health Check Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Al-Itqan API is running smoothly',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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
    console.log(`🚀 Server is listening on http://localhost:${PORT}`);
  });
}

// Export default app for Vercel Serverless Functions
export default app;
