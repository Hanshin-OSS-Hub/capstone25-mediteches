export interface GuestLoginRequest {
  agreed: boolean;
  name: string;
  phone: string;
}

export interface ChatRequest {
  message: string;
  image_url?: string;
  user_id: string;
}

export interface SymptomInput {
  body_part: string;
  pain_level: number;
  pain_type: string;
  onset: string;
  aggravation: string;
  memo?: string;
  side: 'front' | 'back';
  x: number;
  y: number;
}

export interface SymptomRecord extends SymptomInput {
  id: string;
  user_id: string;
  created_at: string;
}

export interface User {
  id: string;
  firebase_uid: string;
  name: string;
  phone: string;
  role: string;
  created_at: string;
}

export interface HospitalInfo {
  name: string;
  department: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  operating_hours?: string;
}
