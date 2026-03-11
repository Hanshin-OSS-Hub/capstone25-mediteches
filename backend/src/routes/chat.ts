import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { chatWithAI, simplifyExplanation, isImageRequest, generateComicImage } from '../services/llm';
import { getMedicineInfo } from '../services/publicdata';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, 'message는 필수 항목입니다.').max(2000),
  image_url: z.string().url().optional().nullable(),
  user_id: z.string().min(1, 'user_id는 필수 항목입니다.'),
});

const simplifySchema = z.object({
  text: z.string().min(1, '변환할 의학 텍스트가 필요합니다.').max(5000),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const { message, image_url, user_id } = parsed.data;
    const wantsImage = isImageRequest(message);

    const [reply, imageUrl] = await Promise.all([
      chatWithAI(message),
      wantsImage ? generateComicImage(message) : Promise.resolve(null),
    ]);

    if (supabase) {
      await supabase.from('chat_logs').insert({
        user_id,
        message,
        reply,
        image_url: imageUrl ?? image_url ?? null,
      });
    }

    res.json({ reply, ...(imageUrl && { imageUrl }) });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'AI 채팅 중 오류가 발생했습니다.' });
  }
});

router.post('/simplify', async (req: Request, res: Response): Promise<void> => {
  const parsed = simplifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: parsed.error.flatten() });
    return;
  }

  try {
    const { text } = parsed.data;

    const prescriptionMatch = text.match(/\[처방\s*약\]\s*\n(.+)/);
    let durContext = '';

    if (prescriptionMatch) {
      const rawNames = prescriptionMatch[1]
        .split(/[,،、\s]+/)
        .map((n: string) => n.trim())
        .filter(Boolean);

      console.log('[DUR 조회] 처방약 이름:', rawNames);

      const durResults = await Promise.allSettled(
        rawNames.map((name: string) => getMedicineInfo(name))
      );

      const hasAnyData = durResults.some(
        (r) => r.status === 'fulfilled' && r.value
      );

      if (hasAnyData) {
        const durData = durResults
          .map((r, i) => {
            if (r.status === 'fulfilled' && r.value) {
              const info = r.value;
              const parts = [`- ${info.name}`];
              if (info.category) parts.push(`  분류: ${info.category}`);
              if (info.ingredients) parts.push(`  성분: ${info.ingredients}`);
              if (info.type) parts.push(`  구분: ${info.type}`);
              if (info.storage) parts.push(`  보관: ${info.storage}`);
              return parts.join('\n');
            }
            return `- ${rawNames[i]}: 약 정보 없음`;
          })
          .join('\n');

        durContext = `\n\n[공공데이터 DUR 조회 결과 - 식품의약품안전처]\n${durData}`;
      } else {
        durContext = `\n\n[공공데이터 DUR 조회 결과 - 식품의약품안전처]\n처방약(${rawNames.join(', ')})에 대한 병용금기/금기음식 정보가 검색되지 않았습니다.`;
      }
      console.log('[DUR 조회] 결과:', durContext);
    } else {
      durContext = '\n\n[공공데이터 DUR 조회 결과 - 식품의약품안전처]\n처방약 정보가 입력되지 않아 DUR 조회를 수행하지 않았습니다.';
    }

    const enrichedText = text + durContext;
    const simplified = await simplifyExplanation(enrichedText);

    res.json({ simplified });
  } catch (err) {
    console.error('Simplify error:', err);
    res.status(500).json({ error: '의학 용어 변환 중 오류가 발생했습니다.' });
  }
});

export default router;
