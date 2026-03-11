import { parseStringPromise } from 'xml2js';

const API_BASE = 'http://apis.data.go.kr';
const SERVICE_KEY = process.env.DATA_GO_KR_API_KEY ?? '';

const DEPARTMENT_CODES: Record<string, string> = {
  '내과': '01', '신경과': '02', '정신건강의학과': '03', '외과': '04',
  '정형외과': '05', '신경외과': '06', '흉부외과': '07', '성형외과': '08',
  '마취통증의학과': '09', '산부인과': '10', '소아청소년과': '11', '안과': '12',
  '이비인후과': '13', '피부과': '14', '비뇨의학과': '15', '재활의학과': '21',
  '가정의학과': '23', '응급의학과': '24', '치과': '49', '한방내과': '80',
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchXmlItems<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  const xml = await res.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });

  const header = parsed?.response?.header;
  if (header?.resultCode !== '00') {
    console.error('Public API error:', header?.resultCode, header?.resultMsg);
    return [];
  }

  const items = parsed?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

export interface HospitalResult {
  id: string;
  name: string;
  type: string;
  department: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  distance: number;
  doctorCount: number;
  specialistCount: number;
  url: string;
}

export async function searchHospitals(
  lat: number,
  lng: number,
  department?: string,
): Promise<HospitalResult[]> {
  if (!SERVICE_KEY) {
    console.warn('DATA_GO_KR_API_KEY not set, returning empty');
    return [];
  }

  const params = new URLSearchParams({
    ServiceKey: SERVICE_KEY,
    numOfRows: '50',
    pageNo: '1',
    xPos: String(lng),
    yPos: String(lat),
    radius: '5000',
  });

  if (department) {
    const code = DEPARTMENT_CODES[department];
    if (code) params.set('dgsbjtCd', code);
  }

  const url = `${API_BASE}/B551182/hospInfoServicev2/getHospBasisList?${params.toString()}`;

  try {
    const items = await fetchXmlItems<Record<string, string>>(url);

    return items
      .map((item) => {
        const hospLat = parseFloat(item.YPos) || 0;
        const hospLng = parseFloat(item.XPos) || 0;
        return {
          id: item.ykiho ?? '',
          name: item.yadmNm ?? '',
          type: item.clCdNm ?? '',
          department: department || item.clCdNm || '',
          address: item.addr ?? '',
          phone: item.telno ?? '',
          lat: hospLat,
          lng: hospLng,
          distance: haversineKm(lat, lng, hospLat, hospLng),
          doctorCount: parseInt(item.drTotCnt, 10) || 0,
          specialistCount: parseInt(item.mdeptSdrCnt, 10) || 0,
          url: item.hospUrl ?? '',
        };
      })
      .sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.error('Hospital search API error:', err);
    return [];
  }
}

export interface PharmacyResult {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  distance: number;
}

export async function searchPharmacies(
  lat: number,
  lng: number,
): Promise<PharmacyResult[]> {
  if (!SERVICE_KEY) {
    console.warn('DATA_GO_KR_API_KEY not set, returning empty');
    return [];
  }

  const params = new URLSearchParams({
    ServiceKey: SERVICE_KEY,
    numOfRows: '30',
    pageNo: '1',
    xPos: String(lng),
    yPos: String(lat),
    radius: '3000',
  });

  const url = `${API_BASE}/B551182/pharmacyInfoService/getParmacyBasisList?${params.toString()}`;

  try {
    const items = await fetchXmlItems<Record<string, string>>(url);

    return items
      .map((item) => {
        const pLat = parseFloat(item.YPos) || 0;
        const pLng = parseFloat(item.XPos) || 0;
        return {
          id: item.ykiho ?? '',
          name: item.yadmNm ?? '',
          address: item.addr ?? '',
          phone: item.telno ?? '',
          lat: pLat,
          lng: pLng,
          distance: haversineKm(lat, lng, pLat, pLng),
        };
      })
      .sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.error('Pharmacy search API error:', err);
    return [];
  }
}

export interface MedicineResult {
  name: string;
  company: string;
  category: string;
  ingredients: string;
  storage: string;
  type: string;
  eeDocUrl: string;
  udDocUrl: string;
  nbDocUrl: string;
}

function parseIngredients(raw: string): string {
  if (!raw) return '';
  return raw
    .split('/')
    .map((part) => {
      const segments = part.split(',').map((s) => s.trim()).filter(Boolean);
      if (segments.length === 0) return '';
      const name = segments[0];
      const amount = segments.slice(1).filter((s) => /\d/.test(s) || /밀리그램|마이크로그램|그램|mg|mcg|g/i.test(s)).join(' ');
      return amount ? `${name} ${amount}` : name;
    })
    .filter(Boolean)
    .join(', ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDurItem(item: any, fallbackName: string): MedicineResult {
  return {
    name: item.ITEM_NAME ?? fallbackName,
    company: item.ENTP_NAME ?? '',
    category: item.CLASS_NO ?? '',
    ingredients: parseIngredients(item.MATERIAL_NAME ?? ''),
    storage: item.STORAGE_METHOD ?? '',
    type: item.ETC_OTC_CODE ?? '',
    eeDocUrl: item.EE_DOC_ID ?? '',
    udDocUrl: item.UD_DOC_ID ?? '',
    nbDocUrl: item.NB_DOC_ID ?? '',
  };
}

async function fetchDurDrugInfo(medicineName: string, maxRows = 5): Promise<MedicineResult[]> {
  if (!SERVICE_KEY) return [];

  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    numOfRows: String(maxRows),
    pageNo: '1',
    type: 'json',
    itemName: medicineName,
  });

  const url = `${API_BASE}/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList03?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const items = data?.body?.items;
    if (!items || (Array.isArray(items) && items.length === 0)) return [];

    const arr = Array.isArray(items) ? items : [items];

    const seen = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return arr.reduce((acc: MedicineResult[], item: any) => {
      const name: string = item.ITEM_NAME ?? medicineName;
      if (seen.has(name)) return acc;
      seen.add(name);
      acc.push(mapDurItem(item, medicineName));
      return acc;
    }, []);
  } catch (err) {
    console.error('[DUR API 오류]', err);
    return [];
  }
}

export async function getMedicineInfo(
  medicineName: string,
): Promise<MedicineResult | null> {
  const results = await fetchDurDrugInfo(medicineName, 1);
  return results[0] ?? null;
}

export async function searchMedicines(
  keyword: string,
): Promise<MedicineResult[]> {
  return fetchDurDrugInfo(keyword, 10);
}
