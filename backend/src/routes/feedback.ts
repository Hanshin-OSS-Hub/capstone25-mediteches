import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';

const router = Router();

const feedbackSchema = z.object({
  departments: z.array(z.string()).min(1),
  helpful: z.boolean(),
  comment: z.string().max(500).optional(),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '잘못된 피드백 형식입니다.', details: parsed.error.flatten() });
    return;
  }

  const { departments, helpful, comment } = parsed.data;

  console.log('[Feedback]', { departments, helpful, comment: comment ?? '' });

  if (supabase) {
    try {
      await supabase.from('feedback').insert({
        departments,
        helpful,
        comment: comment ?? '',
        created_at: new Date().toISOString(),
      });
    } catch {
      // best-effort: log only
    }
  }

  res.json({ message: '피드백이 접수되었습니다. 감사합니다.' });
});

export default router;
