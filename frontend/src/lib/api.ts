import type {
  SymptomInput,
  DepartmentRecommendation,
  Hospital,
  Pharmacy,
  ChatMessage,
  GuestLoginPayload,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function guestLogin(
  payload: GuestLoginPayload,
): Promise<{ message: string; user_id: string; role: string; name_masked: string; phone_masked: string }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendChatMessage(
  message: string,
  userId?: string,
): Promise<ChatMessage> {
  const data = await request<{ reply: string; imageUrl?: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, user_id: userId ?? 'guest' }),
  });
  return {
    id: crypto.randomUUID(),
    role: 'bot',
    content: data.reply,
    ...(data.imageUrl && { imageUrl: data.imageUrl }),
    timestamp: new Date(),
  };
}

export async function saveSymptom(
  symptom: SymptomInput,
  userId: string,
): Promise<void> {
  await request('/symptoms', {
    method: 'POST',
    body: JSON.stringify({ ...symptom, user_id: userId }),
  });
}

export async function analyzeSymptoms(
  symptoms: SymptomInput[],
): Promise<{ analysis: string }> {
  return request('/symptoms/analyze', {
    method: 'POST',
    body: JSON.stringify({ symptoms }),
  });
}

export async function recommendDepartments(
  symptoms: SymptomInput[],
): Promise<DepartmentRecommendation[]> {
  return request('/symptoms/recommend', {
    method: 'POST',
    body: JSON.stringify({ symptoms }),
  });
}

export async function simplifyExplanation(
  text: string,
): Promise<{ simplified: string }> {
  return request('/chat/simplify', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function searchHospitals(
  lat: number,
  lng: number,
  department?: string,
): Promise<Hospital[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (department) params.set('department', department);
  return request(`/hospitals/search?${params.toString()}`);
}

export async function searchPharmacies(
  lat: number,
  lng: number,
): Promise<Pharmacy[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  return request(`/hospitals/pharmacies?${params.toString()}`);
}

export interface MedicineInfo {
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

export async function getMedicineInfo(
  name: string,
): Promise<MedicineInfo> {
  const params = new URLSearchParams({ name });
  return request(`/hospitals/medicine?${params.toString()}`);
}

export async function searchMedicines(
  name: string,
): Promise<MedicineInfo[]> {
  const params = new URLSearchParams({ name });
  return request(`/hospitals/medicine/search?${params.toString()}`);
}

/* ─── Hospital Portal ─── */

export async function hospitalLogin(
  email: string,
  password: string,
): Promise<{ token: string; staff: { id: string; email: string; name: string } }> {
  return request('/hospital/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface PatientSummary {
  id: string;
  nameMasked: string;
  phoneMasked: string;
  createdAt: string;
}

export async function getHospitalPatients(
  token: string,
): Promise<{ patients: PatientSummary[] }> {
  return request('/hospital/patients', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function decryptPatientPii(
  token: string,
  patientId: string,
  fields?: string[],
): Promise<{ decrypted: { name: string; phone: string; residentId: string }; accessedAt: string }> {
  return request(`/hospital/patients/${patientId}/decrypt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: fields ?? ['name', 'phone', 'residentId'] }),
  });
}

export async function getDecryptAuditLog(
  token: string,
): Promise<{ logs: Array<{ id: string; staff_id: string; user_id: string; fields_accessed: string[]; accessed_at: string }> }> {
  return request('/hospital/audit-log', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/* ─── Medication ─── */

export interface ParsedMedication {
  name: string;
  startHour: number;
  intervalHours: number;
  doseCount: number;
  instructions?: string;
}

function fallbackParsePrescription(text: string): ParsedMedication[] {
  const lines = text.split(/[,\n;]+/).map(l => l.trim()).filter(Boolean);
  const results: ParsedMedication[] = [];

  for (const line of lines) {
    const nameMatch = line.match(/^([가-힣a-zA-Z0-9\s]+?)(?:\s*\d|$)/);
    const name = nameMatch?.[1]?.trim() || line.split(/\s/)[0];
    if (!name || name.length < 2) continue;

    const countMatch = line.match(/1일\s*(\d+)\s*회|(\d+)\s*회\s*\/?\s*일|하루\s*(\d+)\s*번/);
    const doseCount = parseInt(countMatch?.[1] ?? countMatch?.[2] ?? countMatch?.[3] ?? '3', 10);

    const timeMatch = line.match(/식후|식전|공복|취침/);
    const startHour = timeMatch?.[0] === '공복' ? 7 : timeMatch?.[0] === '취침' ? 22 : 8;

    const intervalHours = doseCount > 1 ? Math.floor(14 / doseCount) : 24;

    const instrMatch = line.match(/(식후|식전|공복|취침전?)\s*(\d+\s*분)?/);
    const instructions = instrMatch ? instrMatch[0] : undefined;

    results.push({ name, startHour, intervalHours, doseCount, instructions });
  }

  return results;
}

export async function parsePrescription(
  prescriptionText: string,
): Promise<{ medications: ParsedMedication[] }> {
  try {
    return await request('/medication/parse-prescription', {
      method: 'POST',
      body: JSON.stringify({ prescriptionText }),
    });
  } catch (err) {
    const medications = fallbackParsePrescription(prescriptionText);
    if (medications.length > 0) return { medications };
    throw err;
  }
}

export async function ocrPrescription(
  imageBase64: string,
): Promise<{ text: string; medications: ParsedMedication[] }> {
  return request('/medication/ocr', {
    method: 'POST',
    body: JSON.stringify({ imageBase64 }),
  });
}

export async function generateMedicationGuide(
  medications: ParsedMedication[],
): Promise<{ guide: string }> {
  try {
    return await request('/medication/guide', {
      method: 'POST',
      body: JSON.stringify({ medications }),
    });
  } catch {
    const lines = medications.map(m =>
      `• ${m.name}: ${formatHourLocal(m.startHour)}부터 ${m.intervalHours}시간 간격, 하루 ${m.doseCount}회${m.instructions ? ` (${m.instructions})` : ''}`
    );
    return { guide: `복약 스케줄이 등록되었습니다.\n\n${lines.join('\n')}` };
  }
}

function formatHourLocal(h: number) {
  const hour = Math.floor(h);
  const min = h % 1 === 0.5 ? '30' : '00';
  return `${hour < 10 ? '0' : ''}${hour}:${min}`;
}
