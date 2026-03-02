import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { analyzeSymptoms, recommendDepartments } from '../services/llm';
import { SymptomInput, SymptomRecord } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, ...symptomInput } = req.body as SymptomInput & { user_id: string };

    if (!user_id) {
      res.status(400).json({ error: 'user_id는 필수 항목입니다.' });
      return;
    }

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
  try {
    const { symptoms } = req.body as { symptoms: SymptomInput[] };

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      res.status(400).json({ error: '분석할 증상 데이터가 필요합니다.' });
      return;
    }

    const analysis = await analyzeSymptoms(symptoms);

    res.json({ analysis });
  } catch (err) {
    console.error('Analyze symptoms error:', err);
    res.status(500).json({ error: '증상 분석 중 오류가 발생했습니다.' });
  }
});

router.post('/recommend', async (req: Request, res: Response): Promise<void> => {
  try {
    const { symptoms } = req.body as { symptoms: SymptomInput[] };

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      res.status(400).json({ error: '추천을 위한 증상 데이터가 필요합니다.' });
      return;
    }

    const departments = await recommendDepartments(symptoms);

    res.json(departments);
  } catch (err) {
    console.error('Recommend departments error:', err);
    res.status(500).json({ error: '진료과 추천 중 오류가 발생했습니다.' });
  }
});

export default router;
