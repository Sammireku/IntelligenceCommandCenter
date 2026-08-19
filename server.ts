import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getHistoricalSweep,
  getHistoryList,
  getLatestSweep,
  getSweepConfig,
  initSweepScheduler,
  performSweep,
  setSweepIntervalMinutes,
  subscribeSSE,
} from './apis/sweepEngine.js';
import { generateCrossDomainSynthesis } from './apis/synthesis.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. SSE LIVE PUSH ENDPOINT
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const unsubscribe = subscribeSSE(res);

    req.on('close', () => {
      unsubscribe();
    });
  });

  // 2. REST API ENDPOINTS
  app.get('/api/health', (req, res) => {
    const config = getSweepConfig();
    res.json({
      status: 'ok',
      engine: 'Crucix Intelligence Sweep Node',
      timestamp: new Date().toISOString(),
      config,
    });
  });

  app.get('/api/sweep/latest', async (req, res) => {
    let sweep = getLatestSweep();
    if (!sweep) {
      try {
        sweep = await performSweep(false);
      } catch (err: any) {
        return res.status(500).json({ error: 'Failed to perform initial sweep', details: err.message });
      }
    }
    res.json(sweep);
  });

  app.get('/api/sweep/history', (req, res) => {
    const history = getHistoryList();
    res.json(history);
  });

  app.get('/api/sweep/history/:id', (req, res) => {
    const sweep = getHistoricalSweep(req.params.id);
    if (!sweep) {
      return res.status(404).json({ error: 'Sweep archive not found' });
    }
    res.json(sweep);
  });

  app.post('/api/sweep/trigger', async (req, res) => {
    try {
      console.log('[API] Instant parallel sweep triggered via UI');
      const sweep = await performSweep(true);
      res.json({ success: true, sweep });
    } catch (err: any) {
      res.status(500).json({ error: 'Manual sweep failed', details: err.message });
    }
  });

  app.post('/api/synthesize', async (req, res) => {
    try {
      const sweep = getLatestSweep();
      if (!sweep) {
        return res.status(400).json({ error: 'No sweep available to synthesize' });
      }
      const synthesis = await generateCrossDomainSynthesis(
        sweep.geospatial.data,
        sweep.markets.data,
        sweep.health.data,
        sweep.infrastructure.data
      );
      res.json({ success: true, synthesis });
    } catch (err: any) {
      res.status(500).json({ error: 'Synthesis failed', details: err.message });
    }
  });

  app.get('/api/config', (req, res) => {
    res.json(getSweepConfig());
  });

  app.post('/api/config', (req, res) => {
    const { intervalMinutes } = req.body;
    if (typeof intervalMinutes === 'number') {
      setSweepIntervalMinutes(intervalMinutes);
    }
    res.json({ success: true, config: getSweepConfig() });
  });

  // 3. VITE MIDDLEWARE (Development) vs STATIC SERVE (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initialize 15-minute background cron sweep engine
  initSweepScheduler();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Crucix] Intelligence Command Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Crucix] Fatal server startup error:', err);
});
