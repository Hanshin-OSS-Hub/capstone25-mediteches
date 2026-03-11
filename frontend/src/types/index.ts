export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

export interface BodyPoint {
  x: number;
  y: number;
  bodyPart: string;
}

export interface SymptomInput {
  bodyPart: string;
  painLevel: number;
  painType: string;
  onset: string;
  aggravation: string;
  memo?: string;
  side?: 'front' | 'back';
  x?: number;
  y?: number;
}

export interface SymptomRecord extends SymptomInput {
  id: string;
  createdAt: Date;
}

export interface DepartmentRecommendation {
  department: string;
  reason: string;
  confidence?: number;
  urgency?: 'emergency' | 'caution' | 'normal';
}

export interface HospitalInfo {
  id: string;
  name: string;
  address: string;
  phone?: string;
  department?: string;
  operatingHours?: string;
  distance?: number;
  lat: number;
  lng: number;
}

export interface Hospital {
  id: string;
  name: string;
  department: string;
  address: string;
  phone: string;
  operatingHours: string;
  lat: number;
  lng: number;
  distance?: number;
  type?: string;
  doctorCount?: number;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  operatingHours: string;
  lat: number;
  lng: number;
  distance?: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
}
