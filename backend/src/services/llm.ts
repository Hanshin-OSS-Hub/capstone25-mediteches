import OpenAI from 'openai';
import { SymptomInput } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeSymptom(s: Record<string, unknown>) {
  return {
    bodyPart: (s.bodyPart ?? s.body_part ?? '') as string,
    painLevel: (s.painLevel ?? s.pain_level ?? 0) as number,
    painType: (s.painType ?? s.pain_type ?? '') as string,
    onset: (s.onset ?? '') as string,
    aggravation: (s.aggravation ?? '') as string,
    memo: (s.memo ?? '') as string,
  };
}

export async function analyzeSymptoms(symptoms: SymptomInput[]): Promise<string> {
  const symptomDescription = symptoms
    .map((raw, i) => {
      const s = normalizeSymptom(raw as unknown as Record<string, unknown>);
      return (
        `${i + 1}. 부위: ${s.bodyPart}, 통증 강도: ${s.painLevel}/10, ` +
        `통증 유형: ${s.painType}, 발생 시기: ${s.onset}, ` +
        `악화 요인: ${s.aggravation}${s.memo ? `, 메모: ${s.memo}` : ''}`
      );
    })
    .join('\n');

  const userMessage = `다음 증상들을 분석해주세요:\n${symptomDescription}`;
  console.log('[AI 요청] analyzeSymptoms ──────────────────');
  console.log('[AI 요청] 증상 수:', symptoms.length);
  console.log('[AI 요청] 내용:', userMessage);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          '당신은 의료 상담 보조 AI입니다. 한국어로 답변하세요.\n\n' +
          '아래 형식에 맞춰 답변하세요. 사용자가 이미 입력한 증상을 그대로 반복하지 마세요.\n\n' +
          '## 의심되는 원인\n' +
          '증상 조합을 바탕으로 가능성 있는 질환이나 원인 2~3가지를 간결하게 설명하세요. ' +
          '각 항목에 왜 의심되는지 한 문장으로 근거를 덧붙이세요.\n\n' +
          '## 병원 방문 전 자가 관리\n' +
          '통증 완화나 증상 악화 방지를 위해 집에서 할 수 있는 구체적인 조치 2~3가지를 알려주세요. ' +
          '(예: 냉/온찜질, 자세 교정, 스트레칭 방법, 피해야 할 동작 등)\n\n' +
          '## 이런 경우 빨리 병원에 가세요\n' +
          '위험 신호(red flag)가 있다면 1~2가지 언급하세요.\n\n' +
          '마지막에 "이 정보는 의료 전문가의 진단을 대체할 수 없습니다."를 포함하세요.',
      },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });

  const result = response.choices[0]?.message?.content || '분석 결과를 생성할 수 없습니다.';
  console.log('[AI 응답] analyzeSymptoms ──────────────────');
  console.log('[AI 응답] 토큰:', response.usage?.total_tokens ?? 'N/A');
  console.log('[AI 응답] 내용:', result.substring(0, 200), result.length > 200 ? '...' : '');
  return result;
}

export async function simplifyExplanation(medicalText: string): Promise<string> {
  console.log('[AI 요청] simplifyExplanation ───────────────');
  console.log('[AI 요청] 입력 길이:', medicalText.length, '자');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          '당신은 환자가 진료 후 받은 정보를 쉽게 이해할 수 있도록 돕는 AI입니다. 한국어로 답변하세요.\n\n' +
          '입력에 "[공공데이터 DUR 조회 결과]"가 포함되어 있다면, 이는 식품의약품안전처 공공데이터에서 조회한 실제 약물 안전 정보입니다. ' +
          '이 데이터를 우선적으로 활용하여 정확한 약물 상호작용, 부작용, 주의사항을 안내하세요. AI 추측보다 공공데이터 기반 사실을 우선하세요.\n\n' +
          '아래 형식에 맞춰 답변하세요. 각 섹션을 반드시 포함하세요.\n\n' +
          '## 중요 표시 규칙 (반드시 적용)\n' +
          '답변 본문 안에서 다음 3가지 마커를 사용하세요:\n' +
          '- 주의가 필요한 정보: {{yellow|표시할 텍스트|왜 주의해야 하는지 설명}}\n' +
          '- 반드시 지켜야 하는 정보: {{orange|표시할 텍스트|왜 반드시 지켜야 하는지 설명}}\n' +
          '- 환자가 모를 수 있는 의학 용어/시술/약물명: {{green|용어|이 용어를 쉽게 풀어서 설명}}\n' +
          '예시: {{orange|자몽 주스|혈압약의 효과를 위험하게 높일 수 있습니다}}를 피하세요.\n' +
          '예시: {{green|DNA 주사|관절 윤활액의 주요 성분인 히알루론산을 관절에 직접 주입하는 주사입니다}}를 맞으셨습니다.\n' +
          '예시: {{yellow|충분한 수분 섭취|탈수를 방지하고 약물 대사를 돕습니다}}를 권장합니다.\n' +
          'green 마커는 의사가 사용한 전문 용어, 시술명, 약물명, 검사명 등 환자가 뜻을 모를 수 있는 단어에 적극적으로 사용하세요.\n' +
          '각 섹션에 마커를 자연스럽게 포함하되, 같은 종류를 3개 이상 연속 사용하지 마세요.\n\n' +
          '## 쉽게 풀어본 설명\n' +
          '의사가 한 말을 전문 용어 없이, 일상적인 비유를 써서 쉽게 설명하세요. 전문 용어가 나오면 {{green}} 마커로 감싸세요.\n\n' +
          '## 집에서 이렇게 관리하세요\n' +
          '일상에서 지킬 수 있는 구체적인 관리법 2~4가지를 알려주세요.\n\n' +
          '## 이런 음식/음료는 피하세요\n' +
          'DUR 데이터가 있다면 해당 약물의 실제 금기 음식/음료를 안내하세요. 없으면 일반적인 주의사항을 알려주세요.\n\n' +
          '## 같이 먹으면 안 되는 약\n' +
          'DUR 데이터가 있다면 실제 병용금기 정보를 기반으로 안내하세요. 정보가 부족하면 "약사에게 확인하세요"라고 안내하세요.\n\n' +
          '## 다시 병원에 가야 할 때\n' +
          '이런 증상이 나타나면 다시 병원에 가야 한다는 신호 1~2가지를 알려주세요.\n\n' +
          '마지막에 "이 정보는 의료 전문가의 진단을 대체할 수 없습니다."를 포함하세요.',
      },
      {
        role: 'user',
        content: `다음 진료 정보를 환자가 이해하기 쉽게 정리해주세요:\n${medicalText}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 1500,
  });

  const result = response.choices[0]?.message?.content || '설명을 생성할 수 없습니다.';
  console.log('[AI 응답] simplifyExplanation ───────────────');
  console.log('[AI 응답] 토큰:', response.usage?.total_tokens ?? 'N/A');
  console.log('[AI 응답] 내용:', result.substring(0, 200), result.length > 200 ? '...' : '');
  return result;
}

export async function chatWithAI(message: string, context?: string): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        '당신은 친절한 의료 상담 보조 AI입니다. 한국어로 답변하세요. ' +
        '의학적 진단은 하지 않되, 일반적인 건강 정보와 안내를 제공합니다. ' +
        '긴급한 증상이 의심되면 즉시 병원 방문을 권유하세요.',
    },
  ];

  if (context) {
    messages.push({
      role: 'system',
      content: `참고 컨텍스트: ${context}`,
    });
  }

  messages.push({ role: 'user', content: message });

  console.log('[AI 요청] chatWithAI ────────────────────────');
  console.log('[AI 요청] 메시지:', message.substring(0, 100), message.length > 100 ? '...' : '');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  const result = response.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';
  console.log('[AI 응답] chatWithAI ────────────────────────');
  console.log('[AI 응답] 토큰:', response.usage?.total_tokens ?? 'N/A');
  console.log('[AI 응답] 내용:', result.substring(0, 150), result.length > 150 ? '...' : '');
  return result;
}

export async function recommendDepartments(
  symptoms: SymptomInput[]
): Promise<{ department: string; reason: string; urgency: 'emergency' | 'caution' | 'normal' }[]> {
  const symptomDescription = symptoms
    .map((raw, i) => {
      const s = normalizeSymptom(raw as unknown as Record<string, unknown>);
      let desc = `${i + 1}. 부위: ${s.bodyPart}, 통증: ${s.painType} (강도 ${s.painLevel}/10), 시작: ${s.onset}`;
      if (s.aggravation) desc += `, 악화 조건: ${s.aggravation}`;
      if (s.memo) desc += `, 추가 정보: ${s.memo}`;
      return desc;
    })
    .join('\n');

  const userMessage = `다음 증상에 맞는 진료과를 추천해주세요:\n${symptomDescription}`;
  console.log('[AI 요청] recommendDepartments ──────────────');
  console.log('[AI 요청] 증상 수:', symptoms.length);
  console.log('[AI 요청] 내용:', userMessage);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          '당신은 환자의 증상을 바탕으로 적절한 진료과를 추천하는 AI입니다.\n' +
          '반드시 JSON 배열 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요.\n\n' +
          '각 항목 형식:\n' +
          '{"department": "진료과명", "reason": "추천 이유", "urgency": "emergency|caution|normal"}\n\n' +
          'urgency 판단 기준 (엄격하게 적용):\n' +
          '- emergency: 가슴 통증+호흡곤란, 의식 변화/소실, 대량 출혈, 갑작스런 편측 마비/언어장애/시력 상실, 고열+경부 강직, 심한 복통+경직 등 즉시 응급실이 필요한 경우에만 부여\n' +
          '- caution: 다음 조건 중 2개 이상 동시 충족 시에만 부여: (1) 통증 강도 8/10 이상이면서 갑자기 발생, (2) 고열(38.5도 이상) 동반, (3) 2주 이상 지속적 악화, (4) 야간에 깨어날 정도의 통증, (5) 설명 없는 체중 감소 동반. 단순히 특정 동작에서 아픈 것(걷기, 서있기, 운동 시 통증 등)만으로는 caution이 아님\n' +
          '- normal: 위 기준에 해당하지 않는 모든 경우. 대부분의 일상적 근골격계 통증, 운동 후 통증, 특정 자세에서의 통증은 normal\n\n' +
          '최대 3개의 진료과를 추천하세요. 모든 항목에 동일한 urgency를 부여하세요.',
      },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content || '[]';
  console.log('[AI 응답] recommendDepartments ──────────────');
  console.log('[AI 응답] 토큰:', response.usage?.total_tokens ?? 'N/A');
  console.log('[AI 응답] 원본:', content);

  try {
    const parsed = JSON.parse(content);
    const results = parsed.map((d: Record<string, string>) => ({
      department: d.department ?? '',
      reason: d.reason ?? '',
      urgency: (['emergency', 'caution', 'normal'].includes(d.urgency) ? d.urgency : 'normal') as 'emergency' | 'caution' | 'normal',
    }));
    console.log('[AI 응답] 추천 진료과:', results.map((d: { department: string }) => d.department).join(', '));
    console.log('[AI 응답] 긴급도:', results[0]?.urgency ?? 'N/A');
    return results;
  } catch {
    console.warn('[AI 응답] JSON 파싱 실패, 기본값 반환');
    return [{ department: '내과', reason: '일반적인 증상 확인을 위해 내과 방문을 권장합니다.', urgency: 'normal' as const }];
  }
}
