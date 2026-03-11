import OpenAI from 'openai';
import { SymptomInput } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const IMAGE_REQUEST_KEYWORDS = [
  '그려', '그림', '이미지', '만화', '일러스트',
  '그려줘', '그려줄래', '그려주세요', '그려봐',
  '4컷', '네컷', '4칸', '네칸', '만들어줘',
  'draw', 'image', 'comic', 'picture', 'illustration',
];

export function isImageRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return IMAGE_REQUEST_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function extractImageTopic(message: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          '사용자의 메시지에서 이미지/만화의 주제를 추출하세요.\n' +
          '의료/건강 관련 주제로 변환하여, 4컷 만화의 각 장면을 한국어로 구체적으로 설명하세요.\n' +
          '반드시 아래 JSON 형식으로만 응답하세요:\n' +
          '{"topic":"주제 요약","panels":["1컷 장면 설명","2컷 장면 설명","3컷 장면 설명","4컷 장면 설명"]}',
      },
      { role: 'user', content: message },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateComicImage(message: string): Promise<string | null> {
  try {
    const topicJson = await extractImageTopic(message);
    let panels: string[];
    let topic: string;

    try {
      const parsed = JSON.parse(topicJson);
      topic = parsed.topic || '건강 생활';
      panels = parsed.panels || [];
    } catch {
      topic = message;
      panels = [
        '캐릭터가 건강 문제를 발견하는 장면',
        '캐릭터가 정보를 검색하는 장면',
        '캐릭터가 올바른 조치를 취하는 장면',
        '캐릭터가 건강해진 모습',
      ];
    }

    const prompt =
      `[System] 당신은 의료/건강 교육용 4컷 만화를 그리는 화가입니다.\n` +
      `글자는 이미지에 포함하지 마세요.\n\n` +
      `[Style]\n` +
      `- 3D Lowpoly 스타일의 4컷 만화\n` +
      `- 2등신 캐릭터, 둥글고 귀여운 체형\n` +
      `- 밝고 경쾌한 색감, 단색 또는 그라데이션 배경\n` +
      `- 4컷을 2x2 그리드로 배치 (좌상→우상→좌하→우하 순서)\n` +
      `- 각 컷 사이에 얇은 흰색 구분선\n\n` +
      `[Content] 주제: ${topic}\n` +
      `- 1컷: ${panels[0] || '문제 발견'}\n` +
      `- 2컷: ${panels[1] || '정보 탐색'}\n` +
      `- 3컷: ${panels[2] || '행동 실천'}\n` +
      `- 4컷: ${panels[3] || '긍정적 결과'}\n\n` +
      `[Layout] 정사각형 이미지 안에 2x2 그리드로 4개의 장면을 배치하세요.`;

    console.log('[이미지 생성] 프롬프트:', prompt.substring(0, 200), '...');

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
    });

    const imageUrl = response.data?.[0]?.url ?? null;
    console.log('[이미지 생성] 결과:', imageUrl ? '성공' : '실패');
    return imageUrl;
  } catch (err) {
    console.error('[이미지 생성] 오류:', err);
    return null;
  }
}

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
          'AI 추측보다 공공데이터 기반 사실을 우선하세요.\n\n' +
          '## 형광펜 마커 규칙 (가장 중요 - 반드시 적용)\n' +
          '답변 본문 안에서 다음 3가지 마커를 적극적으로 사용하세요:\n' +
          '- {{green|용어|쉬운 설명}} : 환자가 뜻을 모를 수 있는 모든 의학 용어, 질환명, 시술명, 약물명, 검사명에 사용\n' +
          '- {{yellow|텍스트|주의 이유}} : 주의가 필요한 정보에 사용\n' +
          '- {{orange|텍스트|반드시 지켜야 하는 이유}} : 꼭 지켜야 하는 정보에 사용\n\n' +
          '★ green 마커 필수 적용 대상: 질환명(반월상연골 병변, 슬개대퇴 통증 증후군, 연골연화증, 활막염 등), ' +
          '약물명(소염진통제, 아목시실린 등), 시술명(DNA 주사, MRI 등), 의학 약어(PFPS, VMO 등), ' +
          '해부학 용어(대퇴사두근, 고관절 등)에 반드시 적용하세요.\n' +
          '★ 마커 없이 의학 용어를 그냥 노출하지 마세요. 어려운 단어가 보이면 무조건 {{green}} 마커로 감싸세요.\n' +
          '★ yellow/orange 마커도 관리법과 주의사항에서 핵심 행동에 적극 사용하세요.\n\n' +
          '===== 반드시 아래 5개 섹션으로만 구성하세요 =====\n\n' +
          '## 쉽게 풀어본 설명\n' +
          '의사가 말한 내용의 핵심만 2~3문장으로 요약하세요. 관리법이나 주의사항은 여기에 쓰지 마세요.\n' +
          '전문 용어는 반드시 {{green|용어|쉬운 설명}} 마커로 감싸세요.\n' +
          '이 섹션은 "무슨 상태인지"만 설명합니다.\n\n' +
          '## 집에서 이렇게 관리하세요\n' +
          '구체적인 관리법만 2~4개 적으세요. 각각 한 줄로 짧게.\n' +
          '핵심 행동에 {{yellow}} 또는 {{orange}} 마커를 사용하세요.\n' +
          '의학 용어가 나오면 {{green}} 마커를 사용하세요.\n\n' +
          '## 이런 음식/음료는 피하세요\n' +
          '[공공데이터 DUR 조회 결과]에 금기 음식/음료 정보가 있으면 해당 내용을 기반으로 안내하세요.\n' +
          'DUR 데이터에 금기 음식 정보가 없거나 DUR 조회 결과 자체가 없으면 정확히 다음과 같이 작성하세요:\n' +
          '"공공데이터(식약처 DUR) 검색 결과 특별히 피해야 할 음식/음료는 검색되지 않았습니다.\n' +
          '(단, 의사가 직접 언급한 식이 제한이 있다면 의사의 지시가 우선됩니다.)"\n\n' +
          '## 같이 먹으면 안 되는 약\n' +
          '[공공데이터 DUR 조회 결과]에 병용금기 정보가 있으면 해당 내용을 기반으로 안내하세요.\n' +
          'DUR 데이터에 병용금기 정보가 없거나 DUR 조회 결과 자체가 없으면 정확히 다음과 같이 작성하세요:\n' +
          '"공공데이터(식약처 DUR) 검색 결과 함께 복용하면 안 되는 약은 검색되지 않았습니다.\n' +
          '(단, 의사나 약사가 직접 언급한 병용금기가 있다면 해당 지시가 우선됩니다.)"\n\n' +
          '## 다시 병원에 가야 할 때\n' +
          '"이런 증상이 나타나면 바로 병원에 가세요" 형태로 위험 신호 1~3개를 짧게 나열하세요.\n\n' +
          '===== 규칙 =====\n' +
          '1. 각 섹션의 역할을 절대 섞지 마세요.\n' +
          '2. "쉽게 풀어본 설명"에 관리법/주의사항/재방문 기준을 넣지 마세요.\n' +
          '3. 모든 내용을 짧고 핵심적으로. 장황한 설명 금지.\n' +
          '4. 의학 용어가 마커 없이 노출되면 안 됩니다.\n' +
          '5. 마지막에 "이 정보는 의료 전문가의 진단을 대체할 수 없습니다."를 포함하세요.',
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
