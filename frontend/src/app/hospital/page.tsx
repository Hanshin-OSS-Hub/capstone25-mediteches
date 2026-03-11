'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import type { Hospital, Pharmacy } from '@/types';
import * as api from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMap;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { map: KakaoMap; position: unknown; title?: string; image?: unknown }) => KakaoMarker;
        InfoWindow: new (options: { content: string; removable?: boolean }) => KakaoInfoWindow;
        LatLngBounds: new () => KakaoLatLngBounds;
        MarkerImage: new (src: string, size: unknown) => unknown;
        Size: new (w: number, h: number) => unknown;
      };
    };
  }
}

interface KakaoMap {
  setCenter: (latlng: unknown) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
  setLevel: (level: number) => void;
}

interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
}

interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

interface KakaoLatLngBounds {
  extend: (latlng: unknown) => void;
}

const DEPARTMENTS = [
  '내과', '외과', '정형외과', '신경과', '피부과', '이비인후과', '안과',
  '비뇨의학과', '산부인과', '소아청소년과', '정신건강의학과', '재활의학과',
  '가정의학과', '응급의학과',
];

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ?? '';

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
    </svg>
  );
}

function HospitalSearchContent() {
  const searchParams = useSearchParams();
  const departmentParam = searchParams.get('department');

  const [department, setDepartment] = useState(departmentParam ?? '');
  const [addressInput, setAddressInput] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [hospitalError, setHospitalError] = useState<string | null>(null);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPharmacies, setShowPharmacies] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);

  useEffect(() => {
    if (departmentParam) setDepartment(departmentParam);
  }, [departmentParam]);

  async function handleGeocode() {
    if (!addressInput.trim()) return;
    setGeocoding(true);
    setHospitalError(null);
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(addressInput.trim())}`,
        { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } },
      );
      if (!res.ok) throw new Error('주소 검색에 실패했습니다.');
      const data = await res.json();
      if (data.documents?.length > 0) {
        const doc = data.documents[0];
        const newLat = parseFloat(doc.y);
        const newLng = parseFloat(doc.x);
        setLat(newLat);
        setLng(newLng);
        setLocationLabel(doc.address_name ?? doc.place_name ?? addressInput);
      } else {
        setHospitalError('해당 주소를 찾을 수 없습니다. 다시 입력해주세요.');
      }
    } catch {
      setHospitalError('주소 검색 중 오류가 발생했습니다.');
    } finally {
      setGeocoding(false);
    }
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setHospitalError('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setAddressInput('');
        setLocating(false);
      },
      () => {
        setHospitalError('위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const handleSearch = useCallback(async () => {
    if (lat === null || lng === null) {
      setHospitalError('위치 정보를 먼저 설정해주세요.');
      return;
    }
    setLoadingHospitals(true);
    setHospitalError(null);
    setShowPharmacies(false);
    setPharmacies([]);
    try {
      const results = await api.searchHospitals(lat, lng, department || undefined);
      setHospitals(results);
      setHasSearched(true);
    } catch (err) {
      setHospitalError(err instanceof Error ? err.message : '병원 검색 중 오류가 발생했습니다.');
    } finally {
      setLoadingHospitals(false);
    }
  }, [lat, lng, department]);

  async function handleSearchPharmacies() {
    if (lat === null || lng === null) return;
    setLoadingPharmacies(true);
    setPharmacyError(null);
    try {
      const results = await api.searchPharmacies(lat, lng);
      setPharmacies(results);
      setShowPharmacies(true);
    } catch (err) {
      setPharmacyError(err instanceof Error ? err.message : '약국 검색 중 오류가 발생했습니다.');
    } finally {
      setLoadingPharmacies(false);
    }
  }

  function openMap(targetLat: number, targetLng: number, name: string) {
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${targetLat},${targetLng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleMapReady() {
    setMapReady(true);
  }

  useEffect(() => {
    if (!showMap || !mapReady || !mapRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const kakao = window.kakao.maps;
      const centerLat = lat ?? 37.5665;
      const centerLng = lng ?? 126.978;
      const center = new kakao.LatLng(centerLat, centerLng);
      const map = new kakao.Map(mapRef.current!, { center, level: 5 });
      mapInstanceRef.current = map;

      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      if (lat !== null && lng !== null) {
        const myMarker = new kakao.Marker({ map, position: new kakao.LatLng(lat, lng), title: '내 위치' });
        markersRef.current.push(myMarker);
      }

      const bounds = new kakao.LatLngBounds();
      if (lat !== null && lng !== null) bounds.extend(new kakao.LatLng(lat, lng));

      const hospitalIcon = new kakao.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
        new kakao.Size(24, 35),
      );

      hospitals.forEach((h) => {
        if (!h.lat || !h.lng) return;
        const pos = new kakao.LatLng(h.lat, h.lng);
        const marker = new kakao.Marker({ map, position: pos, title: h.name, image: hospitalIcon });
        markersRef.current.push(marker);
        bounds.extend(pos);

        const infoWindow = new kakao.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap;">${h.name}<br/><span style="font-size:11px;font-weight:400;color:#666;">${h.department}</span></div>`,
        });

        (marker as unknown as { addListener: (event: string, cb: () => void) => void }).addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });

      pharmacies.forEach((p) => {
        if (!p.lat || !p.lng) return;
        const pos = new kakao.LatLng(p.lat, p.lng);
        const marker = new kakao.Marker({ map, position: pos, title: p.name });
        markersRef.current.push(marker);
        bounds.extend(pos);
      });

      if (hospitals.length > 0 || pharmacies.length > 0) {
        map.setBounds(bounds);
      }
    });
  }, [showMap, mapReady, hospitals, pharmacies, lat, lng]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {KAKAO_KEY && (
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`}
          strategy="afterInteractive"
          onLoad={handleMapReady}
        />
      )}

      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">병원 / 약국 탐색</h1>
        <p className="text-gray-500">추천 진료과에 맞는 주변 병원과 약국을 검색합니다</p>
      </div>

      <Card className="mb-8">
        <div className="space-y-5">
          <div>
            <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-gray-700">진료과 선택</label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">전체 진료과</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">위치 설정</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={handleGeolocate} disabled={locating} className="shrink-0">
                {locating ? (
                  <span className="flex items-center gap-2"><Spinner className="h-4 w-4" />위치 확인 중...</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    현재 위치 사용
                  </span>
                )}
              </Button>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="또는 주소/장소를 직접 입력하세요"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGeocode(); }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-20 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  onClick={handleGeocode}
                  disabled={geocoding || !addressInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  {geocoding ? '검색 중...' : '주소 검색'}
                </button>
              </div>
            </div>
            {locationLabel && (
              <p className="mt-2 text-xs text-emerald-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="mr-1 inline text-emerald-500">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                위치 설정: {locationLabel}
              </p>
            )}
          </div>

          <Button onClick={handleSearch} disabled={loadingHospitals} className="w-full">
            {loadingHospitals ? (
              <span className="flex items-center justify-center gap-2"><Spinner className="h-5 w-5" />검색 중...</span>
            ) : '병원 검색'}
          </Button>
        </div>
      </Card>

      {hospitalError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{hospitalError}</div>
      )}

      {loadingHospitals && (
        <div className="flex flex-col items-center py-16">
          <Spinner className="mb-4 h-10 w-10 text-emerald-500" />
          <p className="text-gray-500">병원을 검색하고 있습니다...</p>
        </div>
      )}

      {!loadingHospitals && hasSearched && hospitals.length === 0 && !hospitalError && (
        <div className="mb-8 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <path d="m21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="font-medium text-gray-700">검색 결과가 없습니다</p>
          <p className="mt-1 text-sm text-gray-500">다른 진료과 또는 위치로 다시 검색해보세요.</p>
        </div>
      )}

      {/* Map + List toggle */}
      {hospitals.length > 0 && (
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              병원 검색 결과 <span className="ml-1 text-sm font-normal text-gray-400">{hospitals.length}건</span>
            </h2>
            {KAKAO_KEY && (
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  showMap ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-emerald-300'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={showMap ? 'text-emerald-500' : 'text-gray-400'}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                {showMap ? '지도 닫기' : '지도 보기'}
              </button>
            )}
          </div>

          {showMap && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <div ref={mapRef} className="h-80 w-full bg-gray-100" />
            </div>
          )}

          <div className="space-y-4">
            {hospitals.map((h) => (
              <Card key={h.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-gray-900">{h.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {h.type && (
                        <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{h.type}</span>
                      )}
                      <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{h.department}</span>
                      {h.doctorCount != null && h.doctorCount > 0 && (
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">의사 {h.doctorCount}명</span>
                      )}
                    </div>
                  </div>
                  {h.distance != null && (
                    <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      {h.distance < 1 ? `${Math.round(h.distance * 1000)}m` : `${h.distance.toFixed(1)}km`}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>
                    {h.address}
                  </p>
                  <p className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.5" /></svg>
                    {h.phone}
                  </p>
                  {h.operatingHours && (
                    <p className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      {h.operatingHours}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openMap(h.lat, h.lng, h.name)}>길찾기</Button>
                  <a href={`tel:${h.phone}`}><Button variant="secondary" size="sm">전화하기</Button></a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pharmacy Section */}
      {hasSearched && lat !== null && lng !== null && (
        <div className="border-t border-gray-100 pt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">주변 약국</h2>
            {!showPharmacies && (
              <Button variant="outline" size="sm" onClick={handleSearchPharmacies} disabled={loadingPharmacies}>
                {loadingPharmacies ? (
                  <span className="flex items-center gap-2"><Spinner className="h-4 w-4" />검색 중...</span>
                ) : '주변 약국 보기'}
              </Button>
            )}
          </div>
          {pharmacyError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{pharmacyError}</div>
          )}
          {loadingPharmacies && (
            <div className="flex flex-col items-center py-12">
              <Spinner className="mb-4 h-8 w-8 text-emerald-500" />
              <p className="text-sm text-gray-500">약국을 검색하고 있습니다...</p>
            </div>
          )}
          {showPharmacies && !loadingPharmacies && pharmacies.length === 0 && !pharmacyError && (
            <p className="py-8 text-center text-sm text-gray-500">주변에 약국 검색 결과가 없습니다.</p>
          )}
          {pharmacies.length > 0 && (
            <div className="space-y-4">
              {pharmacies.map((p) => (
                <Card key={p.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-gray-900">{p.name}</h3>
                    {p.distance != null && (
                      <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>
                      {p.address}
                    </p>
                    <p className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.5" /></svg>
                      {p.phone}
                    </p>
                    {p.operatingHours && (
                      <p className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        {p.operatingHours}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openMap(p.lat, p.lng, p.name)}>길찾기</Button>
                    <a href={`tel:${p.phone}`}><Button variant="secondary" size="sm">전화하기</Button></a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HospitalPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Spinner className="h-10 w-10 text-emerald-500" /></div>}>
      <HospitalSearchContent />
    </Suspense>
  );
}
