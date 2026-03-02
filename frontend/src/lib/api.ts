import type {
  SymptomInput,
  DepartmentRecommendation,
  Hospital,
  Pharmacy,
  ChatMessage,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function guestLogin(
  name: string,
  phone: string,
  agreed: boolean,
): Promise<{ message: string; user_id: string; role: string }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, phone, agreed }),
  });
}

export async function sendChatMessage(
  message: string,
  userId?: string,
): Promise<ChatMessage> {
  const data = await request<{ reply: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, user_id: userId ?? 'guest' }),
  });
  return {
    id: crypto.randomUUID(),
    role: 'bot',
    content: data.reply,
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

export async function getMedicineInfo(
  name: string,
): Promise<{ name: string; description: string }> {
  const params = new URLSearchParams({ name });
  return request(`/hospitals/medicine?${params.toString()}`);
}
