import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { chatWithAI, simplifyExplanation } from '../services/llm';
import { getMedicineInfo } from '../services/publicdata';
import { ChatRequest } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, image_url, user_id } = req.body as ChatRequest;

    if (!message || !user_id) {
      res.status(400).json({ error: 'message와 user_id는 필수 항목입니다.' });
      return;
    }

    const reply = await chatWithAI(message);

    if (supabase) {
      await supabase.from('chat_logs').insert({
        user_id,
        message,
        reply,
        image_url: image_url ?? null,
      });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'AI 채팅 중 오류가 발생했습니다.' });
  }
});

router.post('/simplify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body as { text: string };

    if (!text) {
      res.status(400).json({ error: '변환할 의학 텍스트가 필요합니다.' });
      return;
    }

    // Extract medicine names from "[처방 약]" section
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

      const durData = durResults
        .map((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            const info = r.value;
            return `- ${info.name}: 분류=${info.usage || '정보없음'}, 주의사항=${info.sideEffects || '정보없음'}`;
          }
          return `- ${rawNames[i]}: DUR 정보 없음`;
        })
        .join('\n');

      durContext = `\n\n[공공데이터 DUR 조회 결과 - 식품의약품안전처]\n${durData}`;
      console.log('[DUR 조회] 결과:', durContext);
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
