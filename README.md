# 메디테치 (MediTech)

> 어디가 아픈지 **바디맵으로 터치**하고, AI가 증상을 분석하고, 진료 중 **녹음**으로 자동 기록하고, 진료 후 설명을 **쉽게 정리**해주는 의료 보조 웹 애플리케이션

팀장: 유승원 | 팀원: 김민우 | 팀원: 김도은 | 팀원: 오지민

---

## 프로젝트 개요

**메디테치**는 환자의 진료 전-중-후 전 과정을 보조하는 웹 서비스입니다.

| 단계 | 기능 | 설명 |
|------|------|------|
| **진료 전** | 바디맵 + 증상 입력 | 인터랙티브 바디맵에서 아픈 부위를 선택하고, 단계별 위저드로 증상을 기록 |
| **진료 전** | AI 증상 분석 | 입력된 증상을 바탕으로 의심 원인, 자가 관리법, 위험 신호를 분석 |
| **진료 전** | 진료과 추천 + 병원 검색 | AI 기반 진료과 추천 + 공공데이터 기반 주변 병원/약국 검색 |
| **진료 전** | 긴급도 분류 | 증상 심각도에 따라 긴급/주의/일반 자동 분류 |
| **진료 전** | 환자 사전 문진표 | 의사에게 전달할 전문적 형태의 문진표 자동 생성 (태블릿 최적화) |
| **진료 중** | 녹음 + 실시간 전사 | Web Speech API로 진료 중 대화를 실시간 텍스트 변환 |
| **진료 후** | 쉬운 설명 + 형광펜 | AI가 의학 용어를 쉽게 풀어주고, 중요 단어에 색상별 형광펜 표시 |
| **진료 후** | 약물 안전 정보 | 식약처 DUR API 연동으로 실제 약물 부작용/상호작용 안내 |

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.1.6 | React 프레임워크 (App Router) |
| React | 19.2.3 | UI 라이브러리 |
| Tailwind CSS | 4.x | 유틸리티 기반 스타일링 |
| TypeScript | 5.x | 타입 안정성 |
| Firebase | 12.x | 인증 (Auth) |
| Supabase | 2.x | 데이터 저장 |

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| Express | 5.x | HTTP 서버 프레임워크 |
| TypeScript | 5.x | 타입 안정성 |
| OpenAI GPT-4 | - | 증상 분석, 진료과 추천, 의학 용어 변환 |
| Firebase Admin | 13.x | 서버 측 인증 검증 |
| Supabase | 2.x | 데이터 저장 |
| xml2js | - | 공공데이터 XML 파싱 |

### 외부 API (공공데이터포털)

| API | 제공기관 | 용도 |
|------|----------|------|
| 병원정보서비스 | 건강보험심사평가원 | 위치 기반 병원 검색 |
| 약국정보서비스 | 건강보험심사평가원 | 위치 기반 약국 검색 |
| DUR 품목정보 | 식품의약품안전처 | 약물 안전사용 정보 조회 |

### 인프라

| 기술 | 용도 |
|------|------|
| Docker + Docker Compose | 컨테이너화 배포 |
| Node.js 20 Alpine | 런타임 (멀티스테이지 빌드) |

---

## 프로젝트 구조

```
project-Meditech/
├── frontend/                    # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/                 # 페이지 (App Router)
│   │   │   ├── page.tsx         # 홈
│   │   │   ├── bodymap/         # 바디맵 + 증상 입력
│   │   │   ├── summary/         # 증상 요약 + AI 분석 + 진료과 추천
│   │   │   └── postvisit/       # 진료 중 녹음 + 진료 후 안내
│   │   ├── components/
│   │   │   ├── bodymap/         # 바디맵 SVG, 증상 패널, 의료 뷰
│   │   │   ├── layout/          # 헤더, 레이아웃
│   │   │   └── symptom/         # 증상 카드, 요약 뷰
│   │   ├── contexts/            # AuthContext
│   │   ├── lib/                 # API 클라이언트
│   │   └── types/               # TypeScript 타입 정의
│   └── Dockerfile
│
├── backend/                     # Express 백엔드
│   ├── src/
│   │   ├── index.ts             # 서버 엔트리포인트
│   │   ├── routes/
│   │   │   ├── auth.ts          # 인증 API
│   │   │   ├── chat.ts          # AI 채팅 + 의학 용어 변환
│   │   │   ├── symptom.ts       # 증상 저장/분석/추천
│   │   │   └── hospital.ts      # 병원/약국/약물 검색
│   │   ├── services/
│   │   │   ├── llm.ts           # OpenAI GPT-4 연동
│   │   │   ├── publicdata.ts    # 공공데이터포털 API 연동
│   │   │   ├── supabase.ts      # Supabase 클라이언트
│   │   │   └── firebase.ts      # Firebase Admin
│   │   └── types/               # 타입 정의
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 시작하기

### 사전 요구사항

- **Docker Desktop** 설치 필요
  - Windows: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
  - macOS: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Git**

### 1단계: 저장소 클론

```bash
git clone https://github.com/Hanshin-OSS-Hub/capstone25-mediteches.git
cd capstone25-mediteches
```

### 2단계: 환경 변수 설정

```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env
```

> **Windows (PowerShell)** 에서는:
> ```powershell
> Copy-Item .env.example .env
> ```

`.env` 파일을 열어 각 키를 실제 값으로 교체합니다:

| 환경 변수 | 설명 | 발급처 |
|-----------|------|--------|
| `FIREBASE_API_KEY` 등 | Firebase 인증 설정 | [Firebase Console](https://console.firebase.google.com/) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` | Supabase 접속 정보 | [Supabase Dashboard](https://supabase.com/) |
| `OPENAI_API_KEY` | GPT-4 API 키 | [OpenAI Platform](https://platform.openai.com/) |
| `NEXT_PUBLIC_KAKAO_MAP_API_KEY` | 카카오 지도 JavaScript 키 | [Kakao Developers](https://developers.kakao.com/) |
| `DATA_GO_KR_API_KEY` | 공공데이터포털 통합 인증키 | [data.go.kr](https://www.data.go.kr/) |

### 3단계: Docker로 빌드 및 실행

#### Windows (PowerShell)

```powershell
# 빌드
docker compose build

# 실행 (백그라운드)
docker compose up -d

# 로그 확인
docker compose logs -f

# 종료
docker compose down
```

#### macOS / Linux (Terminal)

```bash
# 빌드
docker compose build

# 실행 (백그라운드)
docker compose up -d

# 로그 확인
docker compose logs -f

# 종료
docker compose down
```

### 4단계: 접속

| 서비스 | URL |
|--------|-----|
| 프론트엔드 (웹) | http://localhost:3000 |
| 백엔드 API | http://localhost:3001/api |

---

## Docker 없이 로컬 개발

Docker 없이 직접 실행하려면 **Node.js 20 이상**이 필요합니다.

#### 백엔드

```bash
cd backend
npm install
cp ../.env .env        # 루트의 .env 복사 또는 직접 생성
npm run dev            # http://localhost:3001
```

#### 프론트엔드

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

> 프론트엔드와 백엔드를 별도 터미널에서 동시에 실행해야 합니다.

---

## 주요 화면

### 바디맵 (증상 입력)
- 인터랙티브 SVG 바디맵 (전면/후면)
- 복부 세분화: 상복부, 좌상복부, 우상복부, 좌하복부, 우하복부
- 단계별 위저드: 통증 유형 → 발생 시점 → 악화 조건 → 메모

### 증상 요약 + AI 분석
- 사용자용 / 진료 전달용 탭 전환
- AI 분석: 의심 원인, 자가 관리법, 위험 신호
- 진료과 추천 + 긴급도 배지 (긴급/주의/일반)
- 주변 병원 인라인 검색

### 진료 중 · 진료 후 안내
- **진료 중**: 실시간 음성 녹음 → 텍스트 변환 (Web Speech API)
- **진료 후**: AI가 의사 설명을 5개 카테고리로 정리
  - 쉬운 설명 / 자가 관리 / 음식 주의 / 약물 상호작용 / 재방문 기준
- **형광펜 시스템**: 중요 정보에 색상별 하이라이트 + 클릭 시 상세 캡션
  - 초록: 의학 용어 설명
  - 노랑: 주의 사항
  - 주황: 반드시 지켜야 할 사항

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/auth/login` | 게스트 로그인 |
| `POST` | `/api/auth/verify` | Firebase 토큰 검증 |
| `POST` | `/api/chat` | AI 채팅 |
| `POST` | `/api/chat/simplify` | 의학 용어 쉬운 설명 변환 (DUR API 연동) |
| `POST` | `/api/symptoms` | 증상 저장 |
| `GET` | `/api/symptoms` | 증상 목록 조회 |
| `POST` | `/api/symptoms/analyze` | AI 증상 분석 |
| `POST` | `/api/symptoms/recommend` | AI 진료과 추천 |
| `GET` | `/api/hospitals/search` | 주변 병원 검색 |
| `GET` | `/api/hospitals/pharmacies` | 주변 약국 검색 |
| `GET` | `/api/hospitals/medicine` | 약물 정보 조회 (DUR) |

---

## 트러블슈팅

### Windows에서 Docker 빌드 시 줄바꿈 문제

Windows의 CRLF 줄바꿈이 Linux 컨테이너에서 문제를 일으킬 수 있습니다.

```bash
git config core.autocrlf input
```

### Docker Desktop이 시작되지 않을 때

- Windows: WSL 2가 활성화되어 있는지 확인
  ```powershell
  wsl --install
  ```
- macOS: Rosetta (Apple Silicon) 설정 확인

### 포트 충돌

3000 또는 3001 포트를 다른 프로세스가 사용 중인 경우:

```bash
# Windows
netstat -ano | findstr :3000

# macOS / Linux
lsof -i :3000
```

### 음성 인식이 작동하지 않을 때

- **Chrome 또는 Edge** 브라우저를 사용하세요 (Web Speech API 지원)
- HTTPS 또는 localhost 환경에서만 마이크 접근이 허용됩니다
- 브라우저 설정에서 마이크 권한을 허용했는지 확인하세요

---
