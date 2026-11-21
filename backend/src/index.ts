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

// Health Check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Al-Itqan API is running smoothly',
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

// Database Connection
console.log(
  `📡 Connecting to MongoDB: ${
    MONGO_URI.includes('mongodb+srv') ? 'MongoDB Atlas (Cloud)' : 'Localhost'
  }`
);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅ Connected to MongoDB successfully. Database: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});
