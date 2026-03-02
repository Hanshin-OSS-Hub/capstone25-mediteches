# 메디테치 바디맵 - 공공데이터 API 연동 계획서

## 1. API 인벤토리

### Core API (MVP 필수)

| # | API명 | data.go.kr ID | Service URL | 포맷 | 용도 | 검증 |
|---|-------|--------------|-------------|------|------|------|
| 1 | 건강보험심사평가원\_병원정보서비스 | 15001698 | `B551182/hospInfoServicev2/getHospBasisList` | XML | 병원 검색 기본 베이스 | ✅ |
| 2 | 건강보험심사평가원\_의료기관별상세정보서비스 | 15001699 | `B551182/MadmDtlInfoService2.7/{operation}2.7` | XML | 병원 상세 (진료과목, 교통, 장비, 전문의) | ✅ |
| 3 | 건강보험심사평가원\_약국정보서비스 | 15001673 | `B551182/pharmacyInfoService/getParmacyBasisList` | XML | 약국 검색 | ✅ |
| 4 | 식품의약품안전처\_DUR 품목정보 | 15059486 | `1471000/DURPrdlstInfoService03/{operation}03` | JSON | 의약품 안전사용 정보 (9개 오퍼레이션) | ✅ |

### Support API (품질 향상)

| # | API명 | data.go.kr ID | Service URL | 포맷 | 용도 | 검증 |
|---|-------|--------------|-------------|------|------|------|
| 5 | 건강보험심사평가원\_병원코드정보서비스 | 15001697 | `B551182/codeInfoService` | XML | 코드→텍스트 매핑 (장비, 주소) | ✅ 일부 |
| 6 | 식품의약품안전처\_DUR 성분정보 | 15056780 | `1471000/DURPrdlstInfoService03/{operation}03` | JSON | 성분 기반 안전정보 | - |

### Extension API (확장 기능)

| # | API명 | Service URL | 포맷 | 용도 |
|---|-------|-------------|------|------|
| 7 | 국립중앙의료원\_응급의료기관 정보 | `B552657/ErmctInfoInqireService` | XML | 실시간 응급실/수술실 가용 병상 |
| 8 | 의료기관평가인증원\_인증현황(급성기) | data.go.kr 15134308 | XML | 병원 인증 배지 |

공통 Base URL: `http://apis.data.go.kr/`
트래픽 제한: 개발계정 10,000건/일 (전체 API 동일)

---

## 2. 서비스 흐름별 데이터 플로우

### Flow A: 증상 입력 → 병원 검색

```
[사용자 증상 입력 (바디맵)]
         │
         ▼
[LLM 증상 분석] ─── severity_score 반환
         │
         ├── severity >= 7 또는 규칙 매칭 → Flow E (응급 모드)
         │
         ▼
[진료과 추천 반환] (예: "정형외과", "신경과")
         │
         ▼
[코드 매핑] ─── API5: 진료과명 → dgsbjtCd 변환
         │
         ▼
[병원 검색] ─── API1: getHospBasisList
         │     요청: xPos, yPos, radius, dgsbjtCd
         │     응답: ykiho, yadmNm, addr, telno, XPos, YPos, drTotCnt, clCdNm ...
         │
         ▼
[정규화 + 거리 계산 + 정렬]
         │
         ▼
[프론트엔드: 병원 리스트 카드]
```

### Flow B: 병원 상세 정보

```
[병원 카드 클릭] ─── ykiho 전달
         │
         ▼
[상세 조회] ─── API2: MadmDtlInfoService2.7 병렬 호출
         │     getDgsbjtInfo2.7      → 진료과목 목록
         │     getTrnsprtInfo2.7     → 교통정보 (버스, 지하철)
         │     getMedOftInfo2.7      → 의료장비 (CT, MRI 등)
         │     getSpclDiagInfo2.7    → 특수진료 가능 분야
         │     getSpcSbjtSdrInfo2.7  → 전문과목별 전문의 수
         │
         ├── (옵션) API8: 인증현황 조회 → 인증 배지
         │
         ▼
[통합 정규화]
         │
         ▼
[프론트엔드: 병원 상세 페이지/모달]
```

### Flow C: 약국 탐색

```
[병원 추천 완료 or "주변 약국 보기" 클릭]
         │
         ▼
[약국 검색] ─── API3: getParmacyBasisList
         │     요청: xPos, yPos, radius (병원 위치 또는 사용자 위치)
         │
         ▼
[정규화 + 거리 계산 + 정렬]
         │
         ▼
[프론트엔드: 약국 리스트 + 길찾기]
```

### Flow D: 진료 후 처방 설명 재구성

```
[사용자 약 이름 입력] (예: "타이레놀", "아목시실린")
         │
         ▼
[DUR 품목 조회] ─── API4: 8개 오퍼레이션
         │     병용금기, 특정연령대금기, 임부금기,
         │     용량주의, 투여기간주의, 노인주의,
         │     효능군중복주의, 서방정분할주의
         │
         ├── (옵션) API6: 성분정보로 "같은 계열 약" 추가 조회
         │
         ▼
[DUR 결과 통합] ─── 금기/주의 유형별 그룹핑
         │
         ▼
[LLM 재구성] ─── "이 약에서 조심할 점" 쉬운 말 변환
         │            보호자용 요약 생성
         │
         ▼
[프론트엔드: 안전정보 카드 + 보호자 요약]
```

### Flow E: 응급 추천 모드

```
[응급 모드 진입]
  ├── 규칙 기반: 위험 증상 조합 감지 (최우선)
  ├── LLM 점수: severity_score >= 7
  └── 사용자: "응급 상황입니다" 버튼
         │
         ▼
[사용자 위치 → 시도/시군구 변환]
         │
         ▼
[응급의료기관 조회] ─── API7: getEmrrmRltmUsefulSckbdInfoInqire
         │     요청: STAGE1(시도), STAGE2(시군구)
         │     응답: 응급실 병상, 수술실, 중환자실, 장비 가용 여부
         │
         ▼
[가용 자원 기반 정렬]
         │     1순위: 수술실 가용 (증상이 수술 필요 판단 시)
         │     2순위: 응급실 가용 병상 수
         │     3순위: 중증질환 수용 가능 여부
         │     4순위: 거리
         │
         ▼
[프론트엔드: 응급 전용 UI]
         "지금 갈 수 있는 곳" 상단 강조
         실시간 병상 현황 (여유🟢 / 보통🟡 / 포화🔴)
         길찾기 버튼 최우선 배치
         면책 안내 강조
```

---

## 3. API별 상세 연동 명세

### 3.1 병원정보서비스 (API 1)

**엔드포인트**: `GET http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList`

**요청 파라미터**:

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| ServiceKey | O | 공공데이터포털 인증키 (URL Encode) |
| pageNo | X | 페이지 번호 (기본 1) |
| numOfRows | X | 한 페이지 결과 수 (기본 10) |
| sidoCd | X | 시도코드 |
| sgguCd | X | 시군구코드 |
| emdongNm | X | 읍면동명 |
| yadmNm | X | 병원명 (UTF-8 인코딩) |
| xPos | X | 경도 (소수점 15자리) |
| yPos | X | 위도 (소수점 15자리) |
| radius | X | 반경 (미터) |
| dgsbjtCd | X | 진료과목코드 |
| clCd | X | 종별코드 |

**응답 필드**:

| 필드 | 설명 | 내부 매핑 |
|------|------|----------|
| ykiho | 암호화된 요양기호 | → `id` |
| yadmNm | 병원명 | → `name` |
| clCd / clCdNm | 종별코드/명 | → `type` / `typeName` |
| sidoCdNm / sgguCdNm | 시도/시군구명 | → `region` |
| addr | 주소 | → `address` |
| telno | 전화번호 | → `phone` |
| hospUrl | 홈페이지 | → `url` |
| XPos / YPos | 경도/위도 | → `lng` / `lat` |
| estbDd | 설립일(YYYYMMDD) | → `establishedDate` |
| drTotCnt | 의사 총 수 | → `doctorCount` |
| mdeptSdrCnt | 의과 전문의 수 | → `specialistCount` |
| pnursCnt | 간호사 수 | → `nurseCount` |

**응답 샘플 (실제)**:

```json
{
  "response": {
    "header": { "resultCode": "00", "resultMsg": "NORMAL SERVICE." },
    "body": {
      "pageNo": 1,
      "totalCount": 76489,
      "numOfRows": 2,
      "items": {
        "item": [
          {
            "ykiho": "JDQ4MTYyMiM1MSMkMSMk...",
            "yadmNm": "가톨릭대학교인천성모병원",
            "clCd": 1,
            "clCdNm": "상급종합",
            "addr": "인천광역시 부평구 동수로 56 (부평동)",
            "telno": "032-1544-9004",
            "hospUrl": "http://www.cmcism.or.kr/",
            "XPos": 126.7248987,
            "YPos": 37.4848309,
            "estbDd": 19810806,
            "drTotCnt": 333,
            "mdeptSdrCnt": 235,
            "pnursCnt": 0,
            "sidoCd": 220000,
            "sidoCdNm": "인천",
            "sgguCd": 220003,
            "sgguCdNm": "인천부평구"
          }
        ]
      }
    }
  }
}
```

### 3.2 의료기관별상세정보서비스 (API 2)

**Base URL**: `http://apis.data.go.kr/B551182/MadmDtlInfoService2.7/`

> ⚠️ 실제 검증 결과: 서비스명이 `hospInfoServicev2`가 아닌 `MadmDtlInfoService2.7`이며, 모든 오퍼레이션에 `2.7` suffix가 붙음

**오퍼레이션 목록** (검증 완료 ✅):

| 오퍼레이션 | 설명 | 주요 응답 |
|-----------|------|----------|
| getDgsbjtInfo2.7 | 진료과목정보 | dgsbjtCd(진료과목코드), dgsbjtCdNm(진료과목명), dgsbjtPrSdrCnt(전문의수) |
| getTrnsprtInfo2.7 | 교통정보 | 버스, 지하철 노선 등 |
| getMedOftInfo2.7 | 의료장비정보 | oftCd(장비코드), oftCdNm(장비명), oftCnt(수량) |
| getSpclDiagInfo2.7 | 특수진료정보(진료가능분야) | 진료가능분야 |
| getSpcSbjtSdrInfo2.7 | 전문과목별 전문의수 | 과목코드, 전문의수 |
| getDtlInfo2.7 | 세부정보 | 병원 세부정보 |
| getEqpInfo2.7 | 시설정보 | 시설 관련 정보 |
| getFoepAddcInfo2.7 | 식대가산정보 | 식대 관련 정보 |
| getNursigGrdInfo2.7 | 간호등급정보 | 간호등급 |
| getSpclHospAsgFldList2.7 | 전문병원지정분야 | 전문병원 분야 |
| getEtcHstInfo2.7 | 기타인력수 | 기타 인력 정보 |

**공통 요청**: `ServiceKey` + `ykiho` (병원정보서비스에서 받은 암호화 요양기호)

### 3.3 약국정보서비스 (API 3)

**엔드포인트**: `GET http://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList`

**요청 파라미터**: 병원정보서비스(API 1)와 동일 구조 (ServiceKey, pageNo, numOfRows, sidoCd, sgguCd, emdongNm, yadmNm, xPos, yPos, radius)

**응답**: 약국명, 주소, 전화번호, URL, 좌표 등

### 3.4 DUR 품목정보 (API 4)

**Base URL**: `http://apis.data.go.kr/1471000/DURPrdlstInfoService03/`

> ⚠️ 실제 검증 결과: 서비스명이 `DurPrdlstInfoService2`가 아닌 `DURPrdlstInfoService03` (대문자 DUR, suffix 03)

**9개 오퍼레이션** (검증 완료 ✅):

| 오퍼레이션 | DUR 유형 |
|-----------|---------|
| getUsjntTabooInfoList03 | 병용금기 |
| getSpcifyAgrdeTabooInfoList03 | 특정연령대금기 |
| getPwnmTabooInfoList03 | 임부금기 |
| getCpctyAtentInfoList03 | 용량주의 |
| getMdctnPdAtentInfoList03 | 투여기간주의 |
| getOdsnAtentInfoList03 | 노인주의 |
| getEfcyDplctInfoList03 | 효능군중복주의 |
| getSeobangjeongPartitnAtentInfoList03 | 서방정분할주의 |
| getDurPrdlstInfoList03 | DUR 품목정보 조회 |

**공통 요청**: `serviceKey`, `itemName`(제품명), `pageNo`, `numOfRows`, `type`(xml/json)

**주요 응답 필드 (JSON, type=json 기준)**:
- `DUR_SEQ`, `TYPE_CODE`, `TYPE_NAME`(DUR유형명)
- `ITEM_SEQ`, `ITEM_NAME`(품목명), `ENTP_NAME`(업체명)
- `INGR_CODE`, `INGR_KOR_NAME`(성분한글명), `INGR_ENG_NAME`(성분영문명)
- `PROHBT_CONTENT`(금기내용), `FORM_NAME`(제형명)
- `CLASS_CODE`, `CLASS_NAME`(약효분류명)
- `MIXTURE_*` 필드 (병용금기 시 상대 약물 정보)

### 3.5 병원코드정보서비스 (API 5)

**Base URL**: `http://apis.data.go.kr/B551182/codeInfoService`

**검증된 오퍼레이션**:

| 오퍼레이션 | 용도 | 검증 | 응답 필드 |
|-----------|------|------|----------|
| getAddrCodeList | sidoCd → 시도명 매핑 | ✅ | addrCd, addrCdNm |
| getMedicEquipmentCodeList | 장비코드 → 장비명 매핑 | ✅ | oftCd, oftCdNm |

> **참고**: 진료과목코드, 의료기관종별코드 등은 API2(`getDgsbjtInfo2.7`)와 API1 응답에 이미 코드명(`dgsbjtCdNm`, `clCdNm`)이 포함되어 있으므로, 별도 코드 조회 없이 사용 가능.
> 필요 시 HIRA 보건의료빅데이터개방시스템에서 코드 테이블 CSV 다운로드 가능: https://opendata.hira.or.kr/op/opc/selectColumnCodeList.do

**실질적 코드 매핑 전략**:

| 코드 | 매핑 방법 |
|------|----------|
| 주소코드 (sidoCd/sgguCd) | API5 `getAddrCodeList` 호출 + 캐싱 |
| 진료과목코드 (dgsbjtCd) | API2 `getDgsbjtInfo2.7` 응답에서 추출하여 내부 매핑 테이블 구축 |
| 의료기관종별코드 (clCd) | API1 응답의 `clCdNm` 직접 사용 |
| 장비코드 (oftCd) | API5 `getMedicEquipmentCodeList` 호출 + 캐싱 |

### 3.6 DUR 성분정보 (API 6)

> DUR 성분정보도 `DURPrdlstInfoService03` 내 오퍼레이션으로 통합 제공

**요청**: `serviceKey`, `itemName`(제품명) 또는 성분명 파라미터, `pageNo`, `numOfRows`, `type`(json/xml)

**응답 필드**: DUR_SEQ, TYPE_NAME(DUR유형), INGR_CODE(성분코드), INGR_KOR_NAME(성분명한글), INGR_ENG_NAME(성분명영문), PROHBT_CONTENT(금기내용)

### 3.7 응급의료기관 정보 (API 7)

**엔드포인트**: `GET http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire`

**요청**: `ServiceKey`, `STAGE1`(시도, 필수), `STAGE2`(시군구, 필수), `pageNo`, `numOfRows`

**응답**: 응급실/수술실/중환자실 병상 수, CT/MRI/인공호흡기 가용 여부, 당직의 연락처

### 3.8 의료기관 인증현황 (API 8)

**응답 필드**: 의료기관명, 종별, 주소, 인증등급, 인증주기, 인증서번호, 인증시작일자, 인증종료일자

---

## 4. 데이터 가공 전략

### 4-Layer Pipeline

```
[API 원시 응답]
     │
     ▼
┌─────────────────────────────────────────┐
│ Layer 1: Raw                            │
│  - XML → JSON 파싱 (xml2js 라이브러리)  │
│  - JSON 응답 직접 사용                   │
│  - resultCode 확인 ("00" = 정상)        │
│  - 에러 코드별 처리                      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Layer 2: Normalize                      │
│  - 필드명 정규화 (camelCase 변환)       │
│  - yadmNm → name, addr → address       │
│  - XPos → lng, YPos → lat              │
│  - 타입 변환 (string→number 등)         │
│  - null / 빈 문자열 기본값 처리         │
│  - ykiho → id (병원 고유 식별자)        │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Layer 3: Enrich                         │
│  - 코드 → 텍스트 변환 (API5 캐시)      │
│    dgsbjtCd → "정형외과"               │
│    clCd → "상급종합"                    │
│  - 사용자 위치 기준 거리 계산           │
│    Haversine 공식                       │
│  - 여러 API 결과 병합 (상세 정보)       │
│  - DUR 9개 금기 결과 유형별 그룹핑      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Layer 4: Present                        │
│  - LLM 보강                             │
│    DUR 금기내용 → 쉬운 말 변환          │
│    보호자용 요약 생성                    │
│  - 정렬 (거리순, 의사수순, 가용병상순)   │
│  - 페이지네이션                          │
│  - 프론트엔드 타입으로 최종 변환         │
└─────────────────────────────────────────┘
```

### XML 파싱 전략

병원정보서비스, 약국정보서비스, 병원코드정보서비스, 응급의료기관은 XML 응답이므로:

```typescript
// xml2js 라이브러리 사용
import { parseStringPromise } from 'xml2js';

async function parseApiResponse<T>(xmlData: string): Promise<T[]> {
  const parsed = await parseStringPromise(xmlData, { explicitArray: false });
  const body = parsed.response.body;
  const items = body.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}
```

### 거리 계산

```typescript
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

## 5. 코드 매핑 전략

### 서버 시작 시 코드 테이블 로드

```typescript
class CodeTableCache {
  private departmentCodes: Map<string, string>;  // dgsbjtCd → 진료과목명
  private typeCodes: Map<string, string>;         // clCd → 종별명
  private regionCodes: Map<string, string>;       // sidoCd → 시도명
  private reverseDepartment: Map<string, string>; // 진료과목명 → dgsbjtCd

  async initialize(): Promise<void> {
    // API5 호출하여 모든 코드 테이블 로드
    // 24시간마다 자동 갱신
  }

  getDepartmentCode(name: string): string | undefined {
    return this.reverseDepartment.get(name);
  }

  getDepartmentName(code: string): string | undefined {
    return this.departmentCodes.get(code);
  }
}
```

### LLM 추천 → 코드 변환 흐름

```
LLM 반환: "정형외과"
    → reverseDepartment.get("정형외과")
    → dgsbjtCd: "11"
    → API1 호출 시 dgsbjtCd=11 파라미터 전달
```

---

## 6. 캐싱 전략

| 대상 | 저장소 | TTL | 캐시 키 패턴 |
|------|--------|-----|-------------|
| 코드 테이블 (API5) | 서버 메모리 (Map) | 24시간 + 서버 시작 시 | N/A (전체 로드) |
| 병원 검색 결과 | Supabase api_cache | 1시간 | `hospital:{lat}:{lng}:{dgsbjtCd}:{radius}` |
| 약국 검색 결과 | Supabase api_cache | 1시간 | `pharmacy:{lat}:{lng}:{radius}` |
| DUR 품목 정보 | Supabase api_cache | 24시간 | `dur:item:{itemName}` |
| DUR 성분 정보 | Supabase api_cache | 24시간 | `dur:ingredient:{ingredientName}` |
| 병원 상세 정보 | Supabase api_cache | 6시간 | `hospital:detail:{ykiho}` |
| 응급실 실시간 | 캐싱 안 함 | - | - |
| 응급실 fallback | 서버 메모리 | 5분 | `emergency:{stage1}:{stage2}` |

---

## 7. 에러 처리

| resultCode | 의미 | 처리 |
|-----------|------|------|
| 00 | 정상 | 정상 응답 처리 |
| 01 | 어플리케이션 에러 | 서버 로그 + 사용자에게 일시적 오류 안내 |
| 02 | DB 에러 | 서버 로그 + 재시도 1회 |
| 03 | 데이터 없음 | 빈 배열 반환 |
| 04 | HTTP 에러 | 서버 로그 + 사용자에게 일시적 오류 안내 |
| 10 | 잘못된 요청 파라미터 | 파라미터 검증 로그 |
| 20 | 서비스 접근 거부 | API 키 확인 필요 알림 |
| 22 | 서비스 요청 제한 초과 | 트래픽 제한 안내 + 캐시 데이터 사용 |
| 30 | 등록되지 않은 키 | 관리자 알림 |
| 31 | 활용 기간 만료 | 관리자 알림 |

---

## 8. 백엔드 코드 구조

### 서비스 모듈 구성

```
backend/src/services/
├── publicdata.ts              ← 기존 파일, facade로 유지
├── hiraHospitalService.ts     ← API1: 병원정보 검색
├── hiraHospitalDetailService.ts ← API2: 병원 상세정보
├── hiraPharmacyService.ts     ← API3: 약국정보
├── durItemService.ts          ← API4: DUR 품목 (8개 금기)
├── hiraCodeService.ts         ← API5: 코드 테이블 캐시
├── durIngredientService.ts    ← API6: DUR 성분정보
├── emergencyService.ts        ← API7: 응급의료기관 (Phase 3)
└── certificationService.ts    ← API8: 인증현황 (Phase 3)
```

### 타입 정의

```typescript
// 병원정보서비스 원시 응답
interface HiraHospitalRaw {
  ykiho: string;
  yadmNm: string;
  clCd: number;
  clCdNm: string;
  sidoCd: number;
  sidoCdNm: string;
  sgguCd: number;
  sgguCdNm: string;
  emdongNm: string;
  addr: string;
  telno: string;
  hospUrl: string;
  estbDd: number;
  postNo: number;
  XPos: number;
  YPos: number;
  drTotCnt: number;
  mdeptSdrCnt: number;
  mdeptGdrCnt: number;
  pnursCnt: number;
}

// 정규화된 병원 정보 (프론트엔드 전달용)
interface HospitalInfo {
  id: string;           // ykiho
  name: string;         // yadmNm
  type: string;         // clCdNm
  address: string;      // addr
  phone: string;        // telno
  url: string;          // hospUrl
  lat: number;          // YPos
  lng: number;          // XPos
  doctorCount: number;  // drTotCnt
  specialistCount: number; // mdeptSdrCnt
  nurseCount: number;   // pnursCnt
  distance?: number;    // 계산값 (km)
  department?: string;  // 필터링된 진료과
}

// 병원 상세 (API2 통합 결과)
interface HospitalDetail {
  hospitalId: string;
  departments: { code: string; name: string }[];
  transport: { type: string; info: string }[];
  equipment: { code: string; name: string; count: number }[];
  specialties: { code: string; name: string }[];
  specialists: { departmentCode: string; departmentName: string; count: number }[];
  certification?: { grade: string; startDate: string; endDate: string };
}

// 약국 정보
interface PharmacyInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  distance?: number;
}

// DUR 안전정보
interface DURSafetyInfo {
  itemName: string;
  warnings: {
    type: string;       // "병용금기" | "임부금기" | "노인주의" 등
    content: string;    // 금기내용
    simplifiedContent?: string; // LLM으로 쉬운 말 변환
  }[];
  guardianSummary?: string; // LLM 보호자용 요약
}

// DUR 성분 정보
interface DURIngredientInfo {
  durNo: string;
  durType: string;
  ingredientCode: string;
  ingredientName: string;
  ingredientNameEng: string;
  formulation: string;
  prohibitionContent: string;
}

// 응급의료기관 정보 (Phase 3)
interface EmergencyHospitalInfo {
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  distance?: number;
  emergencyBeds: number;     // 응급실 가용 병상
  surgeryAvailable: boolean; // 수술실 가용 여부
  icuBeds: number;           // 중환자실 가용 병상
  ctAvailable: boolean;
  mriAvailable: boolean;
  ventilatorAvailable: boolean;
  lastUpdated: string;       // 데이터 갱신 시각
}
```

### API 라우트 구조

```
GET  /api/hospitals/search?lat=&lng=&department=&radius=
GET  /api/hospitals/:ykiho/detail
GET  /api/pharmacies/search?lat=&lng=&radius=
GET  /api/medicine/dur?name=
GET  /api/medicine/dur-ingredient?name=
GET  /api/emergency/search?lat=&lng=        (Phase 3)
```

---

## 9. 응급 추천 모드 상세 설계 (Phase 3)

### 심각도 판단: 3중 레이어

**Layer 1 - 규칙 기반 (즉시 판단, 최우선)**

특정 증상 조합이 감지되면 LLM 점수와 무관하게 응급 모드 강제 진입:

- 흉통 + 호흡곤란/숨참
- 의식 저하/소실
- 심한 두통 + 구토 + 시야 이상 (뇌출혈 의심)
- 대량 출혈/지혈 불가
- 심한 복통 + 발열 + 구토 (복막염 의심)
- 고열(39도 이상) + 경련 (소아)
- 외상 + 골절 의심 + 움직임 불가

**Layer 2 - LLM 심각도 점수**

증상 분석 시 함께 반환:

```json
{
  "severity_score": 8,
  "emergency_reason": "흉통과 호흡곤란이 동반되어 심혈관계 응급 가능성",
  "recommended_action": "즉시 응급실"
}
```

기준점(7 이상) 초과 시 응급 추천 트리거

**Layer 3 - 사용자 직접 진입**

"응급 상황입니다" 버튼 → 즉시 응급 모드 → LLM 보조 판단 병행

### 응급 모드 정렬 기준

1. 수술실 가용 여부 (증상이 수술 필요로 판단될 경우)
2. 응급실 가용 병상 수
3. 중증질환 수용 가능 여부
4. 사용자 위치에서의 거리

### 응급 모드 캐싱

- 실시간 데이터: 캐싱하지 않음 (매 요청 직접 호출)
- API 장애 시: 5분 이내 fallback 캐시 + "정보가 최신이 아닐 수 있음" 안내

---

## 10. 구현 단계

### Phase 1 (MVP 연동)

1. `xml2js` 의존성 추가 (XML 파싱용)
2. API5 병원코드서비스 → 주소코드/장비코드 로드 + 메모리 캐싱
3. API1 병원정보서비스 → `searchHospitals` 목업 → 실제 연동 교체
4. API3 약국정보서비스 → `searchPharmacies` 목업 → 실제 연동 교체
5. API4 DUR 품목정보(`DURPrdlstInfoService03`) → `getMedicineInfo` 목업 → 실제 연동 교체 (병용금기 + 임부금기 우선)

### Phase 2 (상세 + 품질)

6. API2 병원상세(`MadmDtlInfoService2.7`) → 상세 페이지/모달 구현
7. API6 DUR 성분 → 성분 기반 설명 강화
8. LLM 연동으로 DUR 결과 쉬운말 변환 + 보호자 요약
9. Supabase api_cache 캐싱 레이어 구현

### Phase 3 (확장)

10. 응급 모드 (3중 레이어 심각도 판단 + API7 실시간 병상 + 수술실 기반 추천)
11. API8 의료기관 인증현황 → 인증 배지 표시

---

## 11. 환경변수

```bash
# .env 추가 항목
DATA_GO_KR_API_KEY=       # 공공데이터포털(data.go.kr) 인증키 (모든 공공 API 공용)
```

> 건강보험심사평가원, 식품의약품안전처, 국립중앙의료원, 의료기관평가인증원 등
> 모든 공공데이터 API는 data.go.kr에서 신청하며, 하나의 인증키(ServiceKey)로 전부 사용 가능.
