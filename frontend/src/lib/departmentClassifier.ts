import type { SymptomInput, DepartmentRecommendation } from '@/types';

type Dept =
  | '내과' | '소화기내과' | '심장내과' | '호흡기내과'
  | '신경과' | '정형외과' | '신경외과' | '외과'
  | '비뇨기과' | '산부인과' | '이비인후과' | '안과'
  | '피부과' | '정신건강의학과' | '재활의학과' | '응급의학과';

type Scores = Partial<Record<Dept, number>>;
type Urgency = 'emergency' | 'caution' | 'normal';

interface MatchedPattern {
  name: string;
  disease: string;
}

interface ClassifyResult {
  scores: Scores;
  urgency: Urgency;
  patterns: MatchedPattern[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function add(s: Scores, dept: Dept, v: number) {
  s[dept] = (s[dept] ?? 0) + v;
}

function merge(target: Scores, source: Scores) {
  for (const [k, v] of Object.entries(source)) {
    add(target, k as Dept, v!);
  }
}

function isAbdomen(bp: string) {
  return bp.startsWith('abdomen_') || bp === 'epigastric';
}

function isLowerAbdomen(bp: string) {
  return bp === 'abdomen_left_lower' || bp === 'abdomen_right_lower';
}

function isJoint(bp: string) {
  return /knee|shoulder|hip|hand|foot/.test(bp);
}

function isArm(bp: string) {
  return /arm_upper|arm_lower|hand/.test(bp);
}

function isLeg(bp: string) {
  return /thigh|knee|shin|calf|foot/.test(bp);
}

function isBack(bp: string) {
  return bp === 'upper_back' || bp === 'mid_back' || bp === 'lower_back';
}

function isLeft(bp: string) { return bp.startsWith('left_'); }
function isRight(bp: string) { return bp.startsWith('right_'); }

const BODY_PART_LABELS: Record<string, string> = {
  head: '머리', neck: '목', chest: '가슴', epigastric: '명치',
  abdomen_left_upper: '왼쪽 윗배', abdomen_right_upper: '오른쪽 윗배',
  abdomen_left_lower: '왼쪽 아랫배', abdomen_right_lower: '오른쪽 아랫배',
  left_shoulder: '왼쪽 어깨', right_shoulder: '오른쪽 어깨',
  left_arm_upper: '왼쪽 상완', right_arm_upper: '오른쪽 상완',
  left_arm_lower: '왼쪽 전완', right_arm_lower: '오른쪽 전완',
  left_hand: '왼쪽 손', right_hand: '오른쪽 손',
  left_hip: '왼쪽 골반', right_hip: '오른쪽 골반',
  left_thigh: '왼쪽 허벅지', right_thigh: '오른쪽 허벅지',
  left_knee: '왼쪽 무릎', right_knee: '오른쪽 무릎',
  left_shin: '왼쪽 정강이', right_shin: '오른쪽 정강이',
  left_foot: '왼쪽 발', right_foot: '오른쪽 발',
  head_back: '뒤통수', neck_back: '목 뒤',
  upper_back: '등 상부', mid_back: '등 중부', lower_back: '허리',
  left_buttock: '왼쪽 엉덩이', right_buttock: '오른쪽 엉덩이',
  left_thigh_back: '왼쪽 허벅지 뒤', right_thigh_back: '오른쪽 허벅지 뒤',
  left_knee_back: '왼쪽 무릎 뒤', right_knee_back: '오른쪽 무릎 뒤',
  left_calf: '왼쪽 종아리', right_calf: '오른쪽 종아리',
};

function label(bp: string) { return BODY_PART_LABELS[bp] ?? bp; }

// ---------------------------------------------------------------------------
// Stage 1: Anatomical mapping
// ---------------------------------------------------------------------------

function stage1(bp: string): Scores {
  const s: Scores = {};
  const bpNorm = bp.replace(/^(left_|right_)/, '');

  switch (bpNorm) {
    case 'head':
      add(s, '신경과', 8); add(s, '신경외과', 3); add(s, '이비인후과', 4);
      add(s, '안과', 2); add(s, '내과', 3); break;
    case 'head_back':
      add(s, '신경과', 8); add(s, '정형외과', 5); add(s, '신경외과', 3);
      add(s, '재활의학과', 4); break;
    case 'neck': case 'neck_back':
      add(s, '정형외과', 7); add(s, '신경외과', 5); add(s, '이비인후과', 4);
      add(s, '내과', 3); add(s, '신경과', 2); break;
    case 'chest':
      add(s, '심장내과', 7); add(s, '응급의학과', 4); add(s, '호흡기내과', 5);
      add(s, '정형외과', 6); add(s, '소화기내과', 5); break;
    case 'epigastric':
      add(s, '소화기내과', 9); add(s, '심장내과', 3); add(s, '외과', 3); break;
    case 'abdomen_upper': {
      const isRt = bp.includes('right');
      if (isRt) {
        add(s, '소화기내과', 7); add(s, '외과', 6); add(s, '비뇨기과', 2);
      } else {
        add(s, '소화기내과', 7); add(s, '내과', 3); add(s, '비뇨기과', 2);
      }
      break;
    }
    case 'abdomen_left_upper':
      add(s, '소화기내과', 7); add(s, '내과', 3); add(s, '비뇨기과', 2); break;
    case 'abdomen_right_upper':
      add(s, '소화기내과', 7); add(s, '외과', 6); add(s, '비뇨기과', 2); break;
    case 'abdomen_left_lower':
      add(s, '소화기내과', 7); add(s, '산부인과', 5); add(s, '비뇨기과', 4);
      add(s, '외과', 1); break;
    case 'abdomen_right_lower':
      add(s, '외과', 8); add(s, '소화기내과', 5); add(s, '산부인과', 5);
      add(s, '비뇨기과', 4); break;
    case 'shoulder':
      add(s, '정형외과', 9); add(s, '신경외과', 3); add(s, '재활의학과', 5);
      if (bp === 'left_shoulder') add(s, '심장내과', 2);
      break;
    case 'arm_upper': case 'arm_lower':
      add(s, '정형외과', 7); add(s, '신경과', 4); add(s, '재활의학과', 4); break;
    case 'hand':
      add(s, '정형외과', 7); add(s, '신경과', 6); add(s, '내과', 3);
      add(s, '피부과', 2); break;
    case 'hip':
      add(s, '정형외과', 8); add(s, '신경외과', 4); add(s, '신경과', 3);
      add(s, '재활의학과', 4); add(s, '산부인과', 3); break;
    case 'buttock':
      add(s, '정형외과', 6); add(s, '재활의학과', 5); add(s, '신경외과', 5);
      add(s, '신경과', 3); break;
    case 'thigh':
      add(s, '정형외과', 7); add(s, '신경과', 3); add(s, '내과', 2);
      add(s, '재활의학과', 4); break;
    case 'thigh_back':
      add(s, '신경외과', 7); add(s, '신경과', 5); add(s, '정형외과', 6);
      add(s, '재활의학과', 3); break;
    case 'knee':
      add(s, '정형외과', 9); add(s, '내과', 3); add(s, '재활의학과', 4); break;
    case 'knee_back':
      add(s, '정형외과', 7); add(s, '내과', 3); add(s, '신경과', 2); break;
    case 'shin':
      add(s, '정형외과', 8); add(s, '재활의학과', 4); add(s, '내과', 2); break;
    case 'calf':
      add(s, '정형외과', 7); add(s, '내과', 5); add(s, '신경과', 3); break;
    case 'upper_back': case 'mid_back':
      add(s, '정형외과', 7); add(s, '신경외과', 3); add(s, '재활의학과', 6);
      add(s, '내과', 2); break;
    case 'lower_back':
      add(s, '정형외과', 9); add(s, '신경외과', 7); add(s, '재활의학과', 6);
      add(s, '비뇨기과', 3); add(s, '산부인과', 2); break;
    case 'foot':
      add(s, '정형외과', 7); add(s, '신경과', 3); add(s, '피부과', 5);
      add(s, '내과', 3); break;
    default:
      add(s, '내과', 3); break;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Stage 2: Pain-type + aggravation pattern matching
// ---------------------------------------------------------------------------

function stage2painType(bp: string, painType: string): Scores {
  const s: Scores = {};
  switch (painType) {
    case '찌르는 느낌':
      if (bp === 'chest') { add(s, '심장내과', 6); add(s, '응급의학과', 3); }
      if (isAbdomen(bp)) { add(s, '외과', 5); }
      if (bp === 'head' || bp === 'head_back') { add(s, '신경과', 4); }
      if (bp.includes('knee') || bp.includes('shoulder')) { add(s, '정형외과', 3); }
      if (bp === 'lower_back') { add(s, '신경외과', 4); add(s, '정형외과', 3); }
      if (bp.includes('abdomen') && bp.includes('upper')) { add(s, '비뇨기과', 4); }
      break;
    case '욱신거림':
      if (bp === 'head' || bp === 'head_back') { add(s, '신경과', 6); }
      if (bp.includes('hand') || bp.includes('foot')) { add(s, '내과', 3); }
      if (bp.includes('neck')) { add(s, '이비인후과', 3); }
      if (bp.includes('knee') || bp.includes('hand')) { add(s, '내과', 3); }
      if (bp.includes('calf')) { add(s, '내과', 4); }
      break;
    case '둔한 통증':
      if (isAbdomen(bp)) { add(s, '소화기내과', 5); }
      if (bp.includes('shoulder') || bp.includes('knee')) { add(s, '정형외과', 3); }
      if (bp === 'lower_back') { add(s, '재활의학과', 4); add(s, '정형외과', 3); }
      if (bp.includes('hip') || bp.includes('buttock')) { add(s, '정형외과', 4); add(s, '산부인과', 3); }
      if (isBack(bp)) { add(s, '재활의학과', 4); }
      break;
    case '타는 느낌':
      if (bp === 'chest' || bp === 'epigastric') { add(s, '소화기내과', 7); }
      if (isArm(bp) || isLeg(bp)) { add(s, '신경과', 5); }
      if (bp.includes('foot')) { add(s, '신경과', 5); add(s, '내과', 3); }
      add(s, '피부과', 3);
      if (bp.includes('neck') || isBack(bp)) { add(s, '피부과', 4); add(s, '신경과', 3); }
      break;
    case '저림/쥐남':
      add(s, '신경과', 6);
      if (bp.includes('hand')) { add(s, '정형외과', 3); add(s, '신경외과', 4); }
      if (bp.includes('foot')) { add(s, '내과', 4); add(s, '신경과', 5); }
      if (bp.includes('thigh_back') || bp.includes('calf')) { add(s, '신경외과', 5); }
      if (isArm(bp)) { add(s, '신경외과', 5); }
      if (bp === 'head_back' || bp.includes('neck')) { add(s, '신경과', 5); }
      break;
    case '쥐어짜는 느낌':
      if (bp === 'chest') { add(s, '심장내과', 7); add(s, '응급의학과', 4); }
      if (bp === 'head' || bp === 'head_back') { add(s, '신경과', 4); }
      if (isAbdomen(bp)) { add(s, '소화기내과', 4); }
      if (bp.includes('calf')) { add(s, '내과', 4); }
      break;
    case '뻐근함':
      if (bp.includes('neck') || bp.includes('shoulder')) { add(s, '재활의학과', 6); add(s, '정형외과', 5); }
      if (isBack(bp)) { add(s, '재활의학과', 6); add(s, '정형외과', 5); }
      if (bp === 'lower_back') { add(s, '정형외과', 5); add(s, '재활의학과', 6); }
      if (bp.includes('hip') || bp.includes('buttock')) { add(s, '정형외과', 4); add(s, '재활의학과', 4); }
      break;
    case '당기는 느낌':
      if (bp === 'lower_back' || bp.includes('buttock') || bp.includes('thigh_back') || bp.includes('calf')) {
        add(s, '신경외과', 6); add(s, '정형외과', 4);
      }
      if (bp.includes('neck') || bp.includes('shoulder') || isArm(bp)) {
        add(s, '신경외과', 5); add(s, '정형외과', 4);
      }
      if (bp.includes('calf')) { add(s, '정형외과', 4); add(s, '내과', 3); }
      if (bp.includes('knee_back')) { add(s, '정형외과', 4); }
      break;
    case '가려움':
      add(s, '피부과', 7);
      if (bp.includes('hand') || bp.includes('foot')) { add(s, '피부과', 3); }
      add(s, '내과', 2);
      break;
    default:
      add(s, '내과', 2);
      break;
  }
  return s;
}

function stage2aggravation(aggravation: string): Scores {
  const s: Scores = {};
  switch (aggravation) {
    case '움직일 때': add(s, '정형외과', 4); add(s, '신경외과', 3); break;
    case '가만히 있을 때': add(s, '내과', 3); add(s, '소화기내과', 2); break;
    case '식후': add(s, '소화기내과', 6); add(s, '외과', 2); break;
    case '아침에': add(s, '내과', 3); add(s, '정형외과', 3); break;
    case '밤에': add(s, '내과', 3); add(s, '정형외과', 2); break;
    case '운동 시': add(s, '심장내과', 3); add(s, '정형외과', 4); break;
    case '스트레스': add(s, '정신건강의학과', 4); add(s, '소화기내과', 3); break;
    case '날씨 변화': add(s, '정형외과', 3); add(s, '재활의학과', 3); break;
    case '눌렀을 때': add(s, '정형외과', 3); add(s, '피부과', 2); break;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Stage 2b: Composite patterns (body + painType + aggravation combos)
// ---------------------------------------------------------------------------

interface CompositeRule {
  bodyParts: string[];
  painTypes: string[];
  aggravations: string[];
  scores: Scores;
  name: string;
  disease: string;
}

const COMPOSITE_RULES: CompositeRule[] = [
  // Cardiovascular
  { bodyParts: ['chest'], painTypes: ['쥐어짜는 느낌', '찌르는 느낌'], aggravations: ['운동 시'],
    scores: { '심장내과': 10, '응급의학과': 6 }, name: '심혈관', disease: '허혈성 심질환(협심증)' },
  { bodyParts: ['chest'], painTypes: ['쥐어짜는 느낌'], aggravations: ['스트레스'],
    scores: { '심장내과': 6, '정신건강의학과': 4 }, name: '심혈관', disease: '스트레스성 흉통' },
  // DVT
  { bodyParts: ['left_calf', 'right_calf'], painTypes: ['당기는 느낌', '욱신거림'], aggravations: ['가만히 있을 때'],
    scores: { '내과': 6 }, name: '혈관', disease: '심부정맥혈전증(DVT)' },
  // GI
  { bodyParts: ['epigastric'], painTypes: ['타는 느낌'], aggravations: ['식후'],
    scores: { '소화기내과': 10 }, name: '소화기', disease: '위식도역류(GERD)' },
  { bodyParts: ['chest'], painTypes: ['타는 느낌'], aggravations: ['식후'],
    scores: { '소화기내과': 8 }, name: '소화기', disease: '흉통형 위식도역류' },
  { bodyParts: ['abdomen_right_upper'], painTypes: ['쥐어짜는 느낌', '찌르는 느낌'], aggravations: ['식후'],
    scores: { '외과': 8, '소화기내과': 5 }, name: '소화기', disease: '담석증/담낭염' },
  { bodyParts: ['epigastric', 'abdomen_left_upper', 'abdomen_right_upper'], painTypes: ['둔한 통증'], aggravations: ['식후'],
    scores: { '소화기내과': 8 }, name: '소화기', disease: '기능성 소화불량/위염' },
  { bodyParts: ['epigastric'], painTypes: ['둔한 통증'], aggravations: ['스트레스'],
    scores: { '소화기내과': 7, '정신건강의학과': 3 }, name: '소화기', disease: '기능성 소화불량' },
  // Acute abdomen
  { bodyParts: ['abdomen_right_lower'], painTypes: ['찌르는 느낌'], aggravations: ['움직일 때', '눌렀을 때'],
    scores: { '외과': 10, '응급의학과': 4 }, name: '급성복증', disease: '급성 충수염' },
  // MSK / Neuro
  { bodyParts: ['lower_back'], painTypes: ['당기는 느낌'], aggravations: ['움직일 때'],
    scores: { '신경외과': 9, '정형외과': 7 }, name: '근골격', disease: '추간판 탈출(디스크)' },
  { bodyParts: ['lower_back'], painTypes: ['저림/쥐남'], aggravations: ['움직일 때'],
    scores: { '신경외과': 9, '정형외과': 6 }, name: '근골격', disease: '디스크 + 신경근 압박' },
  { bodyParts: ['neck', 'neck_back'], painTypes: ['저림/쥐남'], aggravations: ['움직일 때'],
    scores: { '신경외과': 8, '정형외과': 6 }, name: '근골격', disease: '경추 디스크' },
  { bodyParts: ['neck', 'neck_back'], painTypes: ['뻐근함'], aggravations: ['아침에'],
    scores: { '재활의학과': 8, '정형외과': 7 }, name: '근골격', disease: '거북목증후군' },
  { bodyParts: ['left_shoulder', 'right_shoulder'], painTypes: ['뻐근함'], aggravations: ['움직일 때'],
    scores: { '정형외과': 8, '재활의학과': 5 }, name: '근골격', disease: '회전근개/오십견' },
  { bodyParts: ['left_shoulder', 'right_shoulder'], painTypes: ['뻐근함'], aggravations: ['밤에'],
    scores: { '정형외과': 9 }, name: '근골격', disease: '오십견(야간 통증)' },
  { bodyParts: ['left_knee', 'right_knee'], painTypes: ['뻐근함'], aggravations: ['아침에'],
    scores: { '정형외과': 9, '내과': 3 }, name: '근골격', disease: '퇴행성 관절염' },
  { bodyParts: ['left_knee', 'right_knee'], painTypes: ['찌르는 느낌'], aggravations: ['움직일 때'],
    scores: { '정형외과': 8 }, name: '근골격', disease: '반월판/십자인대 손상' },
  { bodyParts: ['left_shin', 'right_shin'], painTypes: ['둔한 통증'], aggravations: ['운동 시'],
    scores: { '정형외과': 8 }, name: '근골격', disease: '경골 피로골절/골막염' },
  { bodyParts: ['left_buttock', 'right_buttock'], painTypes: ['당기는 느낌'], aggravations: ['가만히 있을 때'],
    scores: { '신경외과': 7 }, name: '신경', disease: '좌골신경통' },
  { bodyParts: ['left_thigh_back', 'right_thigh_back'], painTypes: ['당기는 느낌'], aggravations: ['움직일 때'],
    scores: { '신경외과': 7, '정형외과': 5 }, name: '신경', disease: '좌골신경통/햄스트링' },
  { bodyParts: ['left_thigh_back', 'right_thigh_back'], painTypes: ['저림/쥐남'], aggravations: ['가만히 있을 때'],
    scores: { '신경외과': 8 }, name: '신경', disease: '요추 디스크 방사통' },
  // Headache
  { bodyParts: ['head'], painTypes: ['욱신거림'], aggravations: ['스트레스'],
    scores: { '신경과': 9 }, name: '두통', disease: '편두통' },
  { bodyParts: ['head'], painTypes: ['쥐어짜는 느낌'], aggravations: ['스트레스'],
    scores: { '신경과': 9 }, name: '두통', disease: '긴장성 두통' },
  { bodyParts: ['head_back'], painTypes: ['뻐근함'], aggravations: ['아침에'],
    scores: { '정형외과': 6, '신경과': 5 }, name: '두통', disease: '경추성 두통' },
  { bodyParts: ['head_back'], painTypes: ['찌르는 느낌'], aggravations: ['눌렀을 때'],
    scores: { '신경과': 7 }, name: '두통', disease: '후두신경통' },
  { bodyParts: ['head'], painTypes: ['욱신거림'], aggravations: ['아침에'],
    scores: { '내과': 5, '신경과': 5 }, name: '두통', disease: '고혈압성 두통' },
  // Nerve entrapment
  { bodyParts: ['left_hand', 'right_hand'], painTypes: ['저림/쥐남'], aggravations: ['아침에', '밤에'],
    scores: { '정형외과': 8, '신경과': 6 }, name: '신경포착', disease: '수근관증후군' },
  { bodyParts: ['left_foot', 'right_foot'], painTypes: ['저림/쥐남'], aggravations: ['밤에'],
    scores: { '신경과': 7, '내과': 5 }, name: '신경', disease: '당뇨성 말초신경병증' },
  { bodyParts: ['left_foot', 'right_foot'], painTypes: ['타는 느낌'], aggravations: ['밤에'],
    scores: { '신경과': 7, '내과': 4 }, name: '신경', disease: '말초신경병증(burning feet)' },
  // Urology
  { bodyParts: ['abdomen_left_upper', 'abdomen_right_upper'], painTypes: ['찌르는 느낌'], aggravations: ['움직일 때'],
    scores: { '비뇨기과': 8 }, name: '비뇨기', disease: '요로결석' },
  // OB/GYN
  { bodyParts: ['abdomen_left_lower', 'abdomen_right_lower'], painTypes: ['찌르는 느낌'], aggravations: ['움직일 때', '눌렀을 때'],
    scores: { '산부인과': 7, '응급의학과': 3 }, name: '산부인과', disease: '난소낭종 파열/자궁외임신' },
  { bodyParts: ['abdomen_left_lower', 'abdomen_right_lower'], painTypes: ['쥐어짜는 느낌'], aggravations: ['특별한 조건 없음'],
    scores: { '산부인과': 8 }, name: '산부인과', disease: '생리통/배란통' },
  { bodyParts: ['abdomen_left_lower', 'abdomen_right_lower'], painTypes: ['둔한 통증'], aggravations: ['특별한 조건 없음', '스트레스'],
    scores: { '산부인과': 6, '비뇨기과': 4 }, name: '산부인과', disease: '만성 골반통' },
  // Skin
  { bodyParts: ['*'], painTypes: ['가려움'], aggravations: ['날씨 변화'],
    scores: { '피부과': 9 }, name: '피부', disease: '아토피/습진' },
  { bodyParts: ['*'], painTypes: ['타는 느낌'], aggravations: ['눌렀을 때'],
    scores: { '피부과': 5, '신경과': 3 }, name: '피부', disease: '대상포진' },
  // Functional
  { bodyParts: ['chest'], painTypes: ['찌르는 느낌'], aggravations: ['스트레스'],
    scores: { '정신건강의학과': 5, '심장내과': 5 }, name: '기능성', disease: '공황장애/스트레스성 흉통' },
  { bodyParts: ['head'], painTypes: ['쥐어짜는 느낌'], aggravations: ['스트레스'],
    scores: { '신경과': 8, '정신건강의학과': 3 }, name: '기능성', disease: '긴장성 두통' },
];

function matchComposites(bp: string, painType: string, aggravation: string): { scores: Scores; patterns: MatchedPattern[] } {
  const result: Scores = {};
  const patterns: MatchedPattern[] = [];
  for (const rule of COMPOSITE_RULES) {
    const bpMatch = rule.bodyParts.includes('*') || rule.bodyParts.includes(bp);
    const ptMatch = rule.painTypes.includes(painType);
    const agMatch = rule.aggravations.length === 0 || rule.aggravations.includes(aggravation);
    if (bpMatch && ptMatch && agMatch) {
      merge(result, rule.scores);
      patterns.push({ name: rule.name, disease: rule.disease });
    }
  }
  return { scores: result, patterns };
}

// ---------------------------------------------------------------------------
// Stage 3: Temporal / severity adjustments + urgency
// ---------------------------------------------------------------------------

function determineUrgency(symptoms: SymptomInput[]): Urgency {
  for (const s of symptoms) {
    const bp = s.bodyPart;
    const pt = s.painType;
    const pl = s.painLevel;
    const on = s.onset;
    const ag = s.aggravation;
    const memo = (s.memo ?? '').toLowerCase();

    if (bp === 'chest' && (pt === '찌르는 느낌' || pt === '쥐어짜는 느낌') && pl >= 7) return 'emergency';
    if ((bp === 'head' || bp === 'head_back') && on === '오늘' && pl >= 8) return 'emergency';
    if (bp === 'abdomen_right_lower' && pt === '찌르는 느낌' && pl >= 7) return 'emergency';
    if (bp === 'mid_back' && pt === '찌르는 느낌' && pl >= 8 && on === '오늘') return 'emergency';
    if (isLowerAbdomen(bp) && pt === '찌르는 느낌' && pl >= 8 && on === '오늘') return 'emergency';
    if (bp.includes('calf') && (pt === '욱신거림' || pt === '당기는 느낌') && ag === '가만히 있을 때' && pl >= 6) return 'emergency';
    if (bp.includes('calf') && pt === '타는 느낌' && pl >= 8 && on === '오늘') return 'emergency';
    if (bp.includes('shin') && pt === '쥐어짜는 느낌' && pl >= 8 && on === '오늘') return 'emergency';
    if (pl >= 9 && (on === '오늘' || on === '어제')) return 'emergency';
    if (bp === 'lower_back' && pt === '저림/쥐남' && pl >= 8 && /소변|대변|배뇨/.test(memo)) return 'emergency';
  }

  // Multi-symptom stroke check
  const leftArm = symptoms.some(s => isLeft(s.bodyPart) && isArm(s.bodyPart) && s.painType === '저림/쥐남');
  const leftLeg = symptoms.some(s => isLeft(s.bodyPart) && isLeg(s.bodyPart) && s.painType === '저림/쥐남');
  const rightArm = symptoms.some(s => isRight(s.bodyPart) && isArm(s.bodyPart) && s.painType === '저림/쥐남');
  const rightLeg = symptoms.some(s => isRight(s.bodyPart) && isLeg(s.bodyPart) && s.painType === '저림/쥐남');
  if ((leftArm && leftLeg) || (rightArm && rightLeg)) return 'emergency';

  // Chest + left shoulder/arm radiation
  const hasChest = symptoms.some(s => s.bodyPart === 'chest' && s.painType === '쥐어짜는 느낌');
  const hasLeftArm = symptoms.some(s => (s.bodyPart === 'left_shoulder' || s.bodyPart === 'left_arm_upper'));
  if (hasChest && hasLeftArm) return 'emergency';

  for (const s of symptoms) {
    const pl = s.painLevel;
    const on = s.onset;
    const ag = s.aggravation;
    const memo = (s.memo ?? '').toLowerCase();
    const chronic = on === '2주 이상' || on === '1개월 이상';

    if (pl >= 7) return 'caution';
    if (chronic && pl >= 5) return 'caution';
    if (ag === '밤에' && pl >= 6) return 'caution';
    if (ag === '밤에' && /체중|살빠|마른|피|혈|딱딱|멍울|덩어리/.test(memo)) return 'caution';
    if (ag === '아침에' && s.painType === '뻐근함' && on === '1개월 이상') return 'caution';
    if (isAbdomen(s.bodyPart) && (on === '오늘' || on === '어제') && pl >= 6) return 'caution';
    if ((s.bodyPart === 'head' || s.bodyPart === 'head_back') && on === '1개월 이상' && pl >= 6) return 'caution';
    if (/딱딱|멍울|덩어리/.test(memo) && chronic) return 'caution';
  }

  return 'normal';
}

function stage3temporal(scores: Scores, onset: string) {
  const acute = onset === '오늘' || onset === '어제';
  const chronic = onset === '2주 이상' || onset === '1개월 이상';
  if (acute) {
    add(scores, '외과', 2); add(scores, '응급의학과', 2);
    add(scores, '재활의학과', -2);
  }
  if (chronic) {
    add(scores, '재활의학과', 3); add(scores, '내과', 2); add(scores, '정신건강의학과', 2);
    add(scores, '외과', -2); add(scores, '응급의학과', -2);
  }
}

function stage3severity(scores: Scores, painLevel: number) {
  if (painLevel <= 3) {
    add(scores, '재활의학과', 2); add(scores, '응급의학과', -3);
  } else if (painLevel >= 9) {
    add(scores, '응급의학과', 5); add(scores, '외과', 3);
  } else if (painLevel >= 7) {
    add(scores, '응급의학과', 2);
    const top = Object.entries(scores).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    if (top) add(scores, top[0] as Dept, 3);
  }
}

// ---------------------------------------------------------------------------
// Stage 2c: Chronic / cancer / rare low-weight patterns
// ---------------------------------------------------------------------------

function stage2chronic(bp: string, painType: string, aggravation: string, onset: string, memo: string, scores: Scores, patterns: MatchedPattern[]) {
  const chronic = onset === '2주 이상' || onset === '1개월 이상';
  const memoLow = memo.toLowerCase();
  const cancerMemo = /체중|살빠|마른|피|혈|딱딱|멍울|덩어리|혹/.test(memoLow);

  if (cancerMemo) {
    add(scores, '내과', 3); add(scores, '외과', 2);
    patterns.push({ name: '암감별', disease: '악성 질환 감별 필요 (키워드 감지)' });
  }

  if (painType === '둔한 통증' && aggravation === '밤에' && chronic) {
    add(scores, '내과', 2);
    patterns.push({ name: '암감별', disease: '야간 통증 + 만성 - 악성 질환 감별' });
  }

  if (bp.includes('foot') && painType === '욱신거림' && aggravation === '밤에') {
    add(scores, '내과', 3);
    patterns.push({ name: '통풍', disease: '통풍 발작 의심' });
  }

  if (painType === '뻐근함' && aggravation === '아침에' && onset === '1개월 이상') {
    const multiJoint = isJoint(bp);
    if (multiJoint || bp === 'lower_back') {
      add(scores, '내과', 3);
      patterns.push({ name: '자가면역', disease: '류마티스 관절염/강직성 척추염' });
    }
  }

  if (isLowerAbdomen(bp) && painType === '둔한 통증' && chronic) {
    add(scores, '산부인과', 3);
    patterns.push({ name: '산부인과', disease: '자궁내막증/자궁근종' });
  }

  if (bp === 'mid_back' && painType === '찌르는 느낌' && onset === '오늘') {
    add(scores, '심장내과', 1); add(scores, '응급의학과', 2);
    patterns.push({ name: '희귀', disease: '대동맥 박리 의심' });
  }

  if (bp === 'lower_back' && painType === '저림/쥐남') {
    add(scores, '신경외과', 2); add(scores, '응급의학과', 1);
    patterns.push({ name: '희귀', disease: '마미증후군 감별 필요' });
  }

  // Memo keyword analysis
  if (/생리|월경|임신/.test(memoLow)) { add(scores, '산부인과', 5); }
  if (/숨|호흡|답답/.test(memoLow)) { add(scores, '호흡기내과', 4); add(scores, '심장내과', 3); add(scores, '응급의학과', 2); }
  if (/소변|오줌|배뇨/.test(memoLow)) { add(scores, '비뇨기과', 4); }
  if (/어지러|현기/.test(memoLow)) { add(scores, '신경과', 3); add(scores, '이비인후과', 3); }
  if (/열|발열|오한/.test(memoLow)) { add(scores, '내과', 3); add(scores, '응급의학과', 2); }
  if (/구토/.test(memoLow)) { add(scores, '소화기내과', 3); add(scores, '응급의학과', 2); }
  if (/눈|시력|시야/.test(memoLow)) { add(scores, '안과', 4); }
  if (/귀|청력|이명/.test(memoLow)) { add(scores, '이비인후과', 4); }
  if (/두드러기|발진|뾰루지/.test(memoLow)) { add(scores, '피부과', 4); }
  if (/불안|우울|수면|잠/.test(memoLow)) { add(scores, '정신건강의학과', 4); }
}

// ---------------------------------------------------------------------------
// Multi-symptom radiation pattern detection
// ---------------------------------------------------------------------------

function detectRadiation(symptoms: SymptomInput[]): { scores: Scores; patterns: MatchedPattern[] } {
  const s: Scores = {};
  const patterns: MatchedPattern[] = [];
  const bps = new Set(symptoms.map(x => x.bodyPart));

  const hasLowerBack = bps.has('lower_back');
  const hasSciaticPath = [...bps].some(b => b.includes('buttock') || b.includes('thigh_back') || b.includes('calf'));
  if (hasLowerBack && hasSciaticPath) {
    add(s, '신경외과', 6);
    patterns.push({ name: '방사통', disease: '좌골신경통 (허리->하지 방사)' });
  }

  const hasNeck = bps.has('neck') || bps.has('neck_back');
  const hasArmPath = [...bps].some(b => b.includes('shoulder') || isArm(b) || b.includes('hand'));
  if (hasNeck && hasArmPath) {
    add(s, '신경외과', 6);
    patterns.push({ name: '방사통', disease: '경추 방사통 (목->팔 방사)' });
  }

  const hasChest = bps.has('chest');
  const hasLeftShoulder = bps.has('left_shoulder') || bps.has('left_arm_upper');
  if (hasChest && hasLeftShoulder) {
    add(s, '심장내과', 6); add(s, '응급의학과', 5);
    patterns.push({ name: '방사통', disease: '심근경색 방사통 (가슴->좌측 어깨/팔)' });
  }

  const hasMidBack = bps.has('mid_back');
  const hasEpigastric = bps.has('epigastric');
  if (hasMidBack && hasEpigastric) {
    add(s, '소화기내과', 4); add(s, '외과', 3);
    patterns.push({ name: '방사통', disease: '췌장/담도 방사통 (명치->등)' });
  }

  const hasRtUpper = bps.has('abdomen_right_upper');
  const hasRtShoulder = bps.has('right_shoulder');
  if (hasRtUpper && hasRtShoulder) {
    add(s, '외과', 5);
    patterns.push({ name: '방사통', disease: '담낭 방사통 (우상복부->우측 어깨)' });
  }

  const jointCount = [...bps].filter(b => isJoint(b)).length;
  if (jointCount >= 3) {
    add(s, '내과', 5);
    patterns.push({ name: '자가면역', disease: '다발 관절 통증 - 류마티스 감별' });
  }

  const bothLowerAbd = bps.has('abdomen_left_lower') && bps.has('abdomen_right_lower');
  if (bothLowerAbd && hasLowerBack) {
    add(s, '산부인과', 4); add(s, '비뇨기과', 3);
    patterns.push({ name: '산부인과', disease: '골반 내 질환 (양측 아랫배+허리)' });
  }

  const bothFeetNumb = symptoms.filter(s => s.bodyPart.includes('foot') && s.painType === '저림/쥐남').length >= 2;
  if (bothFeetNumb) {
    add(s, '신경과', 5); add(s, '내과', 4);
    patterns.push({ name: '신경', disease: '양측 발 저림 - 말초신경병증/당뇨 감별' });
  }

  return { scores: s, patterns };
}

// ---------------------------------------------------------------------------
// Reason text generation
// ---------------------------------------------------------------------------

function buildReason(dept: Dept, bp: string, painType: string, aggravation: string, onset: string, patterns: MatchedPattern[]): string {
  const bpLabel = label(bp);
  const matched = patterns.filter(p => p.disease);

  const parts: string[] = [];
  parts.push(`${bpLabel} 부위의 ${painType}`);
  if (aggravation && aggravation !== '특별한 조건 없음') parts.push(`${aggravation} 악화`);

  const chronic = onset === '2주 이상' || onset === '1개월 이상';
  const acute = onset === '오늘' || onset === '어제';
  if (acute) parts.push('급성 발생');
  if (chronic) parts.push(`${onset} 지속`);

  let reason = parts.join(', ');

  if (matched.length > 0) {
    const diseases = [...new Set(matched.map(m => m.disease))].slice(0, 2);
    reason += ` 양상은 ${diseases.join(', ')}의 패턴과 일치합니다.`;
  } else {
    reason += ` 양상으로 ${dept} 진료를 권장합니다.`;
  }

  return reason;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function classifyDepartments(symptoms: SymptomInput[]): DepartmentRecommendation[] {
  if (symptoms.length === 0) return [];

  const totalScores: Scores = {};
  const allPatterns: MatchedPattern[] = [];

  for (const symptom of symptoms) {
    const bp = symptom.bodyPart;
    const pt = symptom.painType;
    const ag = symptom.aggravation;
    const on = symptom.onset;
    const memo = symptom.memo ?? '';

    const s1 = stage1(bp);
    merge(totalScores, s1);

    const s2pt = stage2painType(bp, pt);
    merge(totalScores, s2pt);

    const s2ag = stage2aggravation(ag);
    merge(totalScores, s2ag);

    const { scores: compScores, patterns: compPatterns } = matchComposites(bp, pt, ag);
    merge(totalScores, compScores);
    allPatterns.push(...compPatterns);

    stage2chronic(bp, pt, ag, on, memo, totalScores, allPatterns);

    stage3temporal(totalScores, on);
    stage3severity(totalScores, symptom.painLevel);
  }

  if (symptoms.length > 1) {
    const { scores: radScores, patterns: radPatterns } = detectRadiation(symptoms);
    merge(totalScores, radScores);
    allPatterns.push(...radPatterns);
  }

  // Multi-symptom functional pattern
  if (symptoms.length >= 3 && symptoms.every(s => s.painType === '뻐근함') && symptoms.some(s => s.aggravation === '스트레스')) {
    add(totalScores, '정신건강의학과', 5); add(totalScores, '내과', 3);
    allPatterns.push({ name: '기능성', disease: '섬유근통/신체화장애' });
  }

  // Clamp negatives to 0
  for (const k of Object.keys(totalScores)) {
    if ((totalScores[k as Dept] ?? 0) < 0) totalScores[k as Dept] = 0;
  }

  const sorted = Object.entries(totalScores)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  if (sorted.length === 0) return [];

  const topScore = sorted[0][1] ?? 1;
  const secondScore = sorted[1]?.[1] ?? 0;
  const urgency = determineUrgency(symptoms);

  const primaryBp = symptoms[0].bodyPart;
  const primaryPt = symptoms[0].painType;
  const primaryAg = symptoms[0].aggravation;
  const primaryOn = symptoms[0].onset;

  const results: DepartmentRecommendation[] = [];
  const count = Math.min(sorted.length, 3);

  for (let i = 0; i < count; i++) {
    const [dept, score] = sorted[i];
    const rawConf = (score ?? 0) / ((topScore ?? 1) + (secondScore ?? 0)) * 100;
    let confidence = Math.round(Math.min(rawConf, 95));

    const hasPattern = allPatterns.length > 0;
    if (hasPattern && i === 0) confidence = Math.min(confidence + 10, 95);

    const reason = buildReason(dept as Dept, primaryBp, primaryPt, primaryAg, primaryOn, allPatterns);

    results.push({
      department: dept,
      reason,
      confidence,
      urgency: i === 0 ? urgency : (urgency === 'emergency' ? 'caution' : 'normal'),
    });
  }

  return results;
}
