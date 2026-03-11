import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import symptomRoutes from './routes/symptom';
import chatRoutes from './routes/chat';
import hospitalRoutes from './routes/hospital';
import feedbackRoutes from './routes/feedback';
import { supabase } from './services/supabase';

dotenv.config();

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

const ENV_CHECKS: { key: string; label: string; required: boolean }[] = [
  { key: 'OPENAI_API_KEY', label: 'OpenAI API', required: true },
  { key: 'DATA_GO_KR_API_KEY', label: '공공데이터 API', required: true },
  { key: 'SUPABASE_URL', label: 'Supabase URL', required: false },
  { key: 'SUPABASE_SERVICE_KEY', label: 'Supabase Service Key', required: false },
  { key: 'FIREBASE_SERVICE_ACCOUNT_KEY', label: 'Firebase 서비스 계정', required: false },
];

function validateEnv() {
  let hasCritical = false;
  for (const { key, label, required } of ENV_CHECKS) {
    const value = process.env[key];
    if (!value || value.startsWith('your_')) {
      const level = required ? 'ERROR' : 'WARN';
      console.log(`[ENV ${level}] ${label} (${key}) - 미설정`);
      if (required) hasCritical = true;
    } else {
      console.log(`[ENV OK] ${label} (${key})`);
    }
  }
  if (hasCritical) {
    console.log('[ENV] 필수 환경변수가 누락되었습니다. 일부 기능이 정상 동작하지 않을 수 있습니다.');
  }
}

validateEnv();

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

app.use('/api/', globalLimiter);
app.use('/api/symptoms/analyze', aiLimiter);
app.use('/api/symptoms/recommend', aiLimiter);
app.use('/api/chat', aiLimiter);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  checks.server = 'ok';

  checks.openai = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('your_')
    ? 'configured' : 'not_configured';

  checks.publicData = process.env.DATA_GO_KR_API_KEY && !process.env.DATA_GO_KR_API_KEY.startsWith('your_')
    ? 'configured' : 'not_configured';

  if (supabase) {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      checks.supabase = error ? 'error' : 'connected';
    } catch {
      checks.supabase = 'error';
    }
  } else {
    checks.supabase = 'not_configured';
  }

  const allOk = checks.server === 'ok';

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    checks,
  });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/feedback', feedbackRoutes);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Global Error]', err.message, err.stack);
  res.status(500).json({
    error: '서버에서 예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
