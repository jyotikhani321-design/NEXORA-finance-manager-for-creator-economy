import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import SQLite services and route modules
import { initDb, seedIfEmpty, getCreatorProfile, saveCreatorProfile } from './services/db.js';
import incomeRoutes from './routes/income.js';
import recommendationsRoutes from './routes/recommendations.js';
import authRoutes from './routes/auth.js';

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Mount CORS policy
app.use(cors());

// Parse incoming request JSON payloads
app.use(express.json());

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the local uploads directory is present for CSV/screenshot uploads
import { existsSync, mkdirSync } from 'fs';
const uploadsDir = path.join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
  console.log('Creating uploads directory...');
  mkdirSync(uploadsDir);
}

// -------------------------------------------------------------
// SQLITE INITIALIZATION
// -------------------------------------------------------------
try {
  console.log('Initializing SQLite database tables...');
  await initDb();
  await seedIfEmpty();
} catch (dbInitError) {
  console.error('SQLite database startup error:', dbInitError.message);
}

// -------------------------------------------------------------
// MOUNTING ROUTERS
// -------------------------------------------------------------
app.use('/api/income', incomeRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/auth', authRoutes);

// Backwards-compatibility legacy endpoints (so the current frontend React UI is unaffected)
app.get('/api/creator', async (req, res) => {
  try {
    const creatorId = req.query.creatorId || 'creator_1';
    const profile = await getCreatorProfile(creatorId);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/creator', async (req, res) => {
  try {
    const { creatorName, niche, incomeStreams } = req.body;
    const creatorId = req.query.creatorId || 'creator_1';
    const profile = await saveCreatorProfile(creatorId, { creatorName, niche, incomeStreams });
    res.json({ message: 'Creator profile saved successfully!', data: profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Centralized error boundary
app.use((err, req, res, next) => {
  console.error('Centralized Express boundary caught error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Offline-First NEXORA Hackathon Server running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
