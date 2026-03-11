import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { analyzeSymptoms, recommendDepartments } from '../services/llm';
import { SymptomInput, SymptomRecord } from '../types';

const router = Router();

const symptomInputSchema = z.object({
  bodyPart: z.string().min(1).optional(),
  body_part: z.string().min(1).optional(),
  painLevel: z.number().int().min(1).max(10).optional(),
  pain_level: z.number().int().min(1).max(10).optional(),
  painType: z.string().min(1).optional(),
  pain_type: z.string().min(1).optional(),
  onset: z.string().min(1),
  aggravation: z.string().min(1),
  memo: z.string().max(500).optional(),
  side: z.enum(['front', 'back']).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

function toBackendSymptom(data: z.infer<typeof symptomInputSchema>): SymptomInput {
  return {
    body_part: data.body_part ?? data.bodyPart ?? '',
    pain_level: data.pain_level ?? data.painLevel ?? 1,
    pain_type: data.pain_type ?? data.painType ?? '',
    onset: data.onset,
    aggravation: data.aggravation,
    memo: data.memo,
    side: data.side ?? 'front',
    x: data.x ?? 0,
    y: data.y ?? 0,
  };
}

const saveSchema = symptomInputSchema.extend({
  user_id: z.string().min(1, 'user_id는 필수 항목입니다.'),
});

const analyzeSchema = z.object({
  symptoms: z.array(symptomInputSchema).min(1, '분석할 증상 데이터가 필요합니다.'),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const { user_id, ...rest } = parsed.data;
    const symptomInput = toBackendSymptom(rest);

    if (!supabase) {
      res.status(201).json({ ...symptomInput, user_id, id: user_id, created_at: new Date().toISOString() });
      return;
    }

    const { data, error } = await supabase
      .from('symptoms')
      .insert({ ...symptomInput, user_id })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: '증상 저장에 실패했습니다.', details: error.message });
      return;
    }

    res.status(201).json(data as SymptomRecord);
  } catch (err) {
    console.error('Save symptom error:', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.query;

    if (!user_id || typeof user_id !== 'string') {
      res.status(400).json({ error: 'user_id 쿼리 파라미터는 필수입니다.' });
      return;
    }

    if (!supabase) {
      res.json([]);
      return;
    }

    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: '증상 조회에 실패했습니다.', details: error.message });
      return;
    }

    res.json(data as SymptomRecord[]);
  } catch (err) {
    console.error('Get symptoms error:', err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const converted = parsed.data.symptoms.map(toBackendSymptom);
    const analysis = await analyzeSymptoms(converted);
    res.json({ analysis });
  } catch (err) {
    console.error('Analyze symptoms error:', err);
    res.status(500).json({ error: '증상 분석 중 오류가 발생했습니다.' });
  }
});

router.post('/recommend', async (req: Request, res: Response): Promise<void> => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const converted = parsed.data.symptoms.map(toBackendSymptom);
    const departments = await recommendDepartments(converted);
    res.json(departments);
  } catch (err) {
    console.error('Recommend departments error:', err);
    res.status(500).json({ error: '진료과 추천 중 오류가 발생했습니다.' });
  }
});

export default router;
