import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import {
  parsePrescriptionText,
  ocrPrescriptionImage,
  generateMedicationGuideText,
} from '../services/llm';

const router = Router();

router.post('/parse-prescription', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prescriptionText } = req.body as { prescriptionText?: string };
    if (!prescriptionText?.trim()) {
      res.status(400).json({ error: '처방 텍스트가 필요합니다.' });
      return;
    }

    const medications = await parsePrescriptionText(prescriptionText.trim());
    res.json({ medications });
  } catch (err) {
    console.error('Parse prescription error:', err);
    res.status(500).json({ error: '처방 파싱에 실패했습니다.' });
  }
});

router.post('/ocr', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64 } = req.body as { imageBase64?: string };
    if (!imageBase64) {
      res.status(400).json({ error: '이미지가 필요합니다.' });
      return;
    }

    const text = await ocrPrescriptionImage(imageBase64);
    const medications = text ? await parsePrescriptionText(text) : [];
    res.json({ text, medications });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: '처방전 OCR에 실패했습니다.' });
  }
});

router.post('/guide', async (req: Request, res: Response): Promise<void> => {
  try {
    const { medications } = req.body as { medications?: unknown[] };
    if (!medications?.length) {
      res.status(400).json({ error: '약 정보가 필요합니다.' });
      return;
    }

    const guide = await generateMedicationGuideText(
      medications as Parameters<typeof generateMedicationGuideText>[0],
    );
    res.json({ guide });
  } catch (err) {
    console.error('Medication guide error:', err);
    res.status(500).json({ error: '복약 안내 생성에 실패했습니다.' });
  }
});

router.get('/schedules', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.user_id as string;
    if (!supabase || !userId) {
      res.json({ schedules: [] });
      return;
    }

    const { data, error } = await supabase
      .from('medication_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: '스케줄 조회 실패' });
      return;
    }

    res.json({ schedules: data || [] });
  } catch (err) {
    console.error('Schedules error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/schedules', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name, startHour, intervalHours, doseCount, instructions, color } = req.body;

    if (!name) {
      res.status(400).json({ error: '약 이름이 필요합니다.' });
      return;
    }

    if (!supabase) {
      res.status(201).json({ message: 'local only' });
      return;
    }

    const { data, error } = await supabase
      .from('medication_schedules')
      .insert({
        user_id: userId || null,
        name,
        start_hour: startHour,
        interval_hours: intervalHours,
        dose_count: doseCount,
        instructions,
        color,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: '스케줄 저장 실패' });
      return;
    }

    res.status(201).json({ schedule: data });
  } catch (err) {
    console.error('Save schedule error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;
