import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initScheduler } from './lib/scheduler.js';
import taskRoutes from './routes/tasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const API_KEY = process.env.API_KEY || 'dev-key-change-me';

// Middleware
app.use(express.json());

// Static viewer page (registered before auth so it loads without a key;
// the page authenticates the SSE connection via ?key= query param).
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next(); // health check is public
  const key = req.headers['x-api-key'] || req.query.key;
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
});

// Routes
app.use('/tasks', taskRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Init scheduler (rehydrates tasks from disk on startup)
initScheduler();

app.listen(PORT, HOST, () => {
  console.log(`Task Scheduler running at http://${HOST}:${PORT}`);
  console.log(`API Key: ${API_KEY}`);
});
