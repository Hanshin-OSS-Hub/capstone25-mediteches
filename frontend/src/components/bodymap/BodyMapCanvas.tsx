'use client';

import { useRef, useState } from 'react';
import {
  findRegionAtPoint,
  isPointInBodyOutline,
  clientToSvgPoint,
  type PainPinDisplay,
  type PinSelection,
} from '@/lib/bodymapPin';
import { PainPinMarkerSvg } from './PainPinMarker';

interface BodyMapCanvasProps {
  side: 'front' | 'back';
  onPinSelect: (pin: PinSelection) => void;
  selectedPin: { x: number; y: number } | null;
  selectedRegionId: string;
  painPins: PainPinDisplay[];
  onSideChange: (side: 'front' | 'back') => void;
}

interface BodyRegion {
  id: string;
  label: string;
  path: string;
  labelPos: { x: number; y: number };
}

const FRONT_REGIONS: BodyRegion[] = [
  { id: 'head', label: '머리', labelPos: { x: 150, y: 35 }, path: 'M133,18 C133,8 167,8 167,18 C172,24 175,38 173,55 C170,68 158,78 150,80 C142,78 130,68 127,55 C125,38 128,24 133,18Z' },
  { id: 'neck', label: '목', labelPos: { x: 150, y: 90 }, path: 'M141,80 L159,80 L162,100 L138,100Z' },
  { id: 'left_shoulder', label: '왼쪽 어깨', labelPos: { x: 88, y: 112 }, path: 'M100,100 L138,100 L138,108 L100,108 C90,108 82,112 78,118 L72,130 L65,126 C70,112 80,102 100,100Z' },
  { id: 'right_shoulder', label: '오른쪽 어깨', labelPos: { x: 212, y: 112 }, path: 'M162,100 L200,100 C220,102 230,112 235,126 L228,130 L222,118 C218,112 210,108 200,108 L162,108Z' },
  { id: 'chest', label: '가슴', labelPos: { x: 150, y: 140 }, path: 'M100,108 L200,108 L200,175 L100,175Z' },
  { id: 'epigastric', label: '명치', labelPos: { x: 150, y: 188 }, path: 'M133,175 L167,175 L166,215 L134,215Z' },
  { id: 'abdomen_left_upper', label: '왼쪽 윗배', labelPos: { x: 116, y: 198 }, path: 'M104,175 L133,175 L134,215 L106,220Z' },
  { id: 'abdomen_right_upper', label: '오른쪽 윗배', labelPos: { x: 184, y: 198 }, path: 'M167,175 L196,175 L194,220 L166,215Z' },
  { id: 'abdomen_left_lower', label: '왼쪽 아랫배', labelPos: { x: 128, y: 248 }, path: 'M106,220 L150,215 L150,278 L112,270Z' },
  { id: 'abdomen_right_lower', label: '오른쪽 아랫배', labelPos: { x: 172, y: 248 }, path: 'M150,215 L194,220 L188,270 L150,278Z' },
  { id: 'left_arm_upper', label: '왼쪽 상완', labelPos: { x: 62, y: 165 }, path: 'M65,126 L78,118 L82,130 L80,195 L60,195Z' },
  { id: 'right_arm_upper', label: '오른쪽 상완', labelPos: { x: 238, y: 165 }, path: 'M222,118 L235,126 L240,195 L220,195Z' },
  { id: 'left_arm_lower', label: '왼쪽 전완', labelPos: { x: 52, y: 240 }, path: 'M60,195 L80,195 L72,280 L48,280Z' },
  { id: 'right_arm_lower', label: '오른쪽 전완', labelPos: { x: 248, y: 240 }, path: 'M220,195 L240,195 L252,280 L228,280Z' },
  { id: 'left_hand', label: '왼쪽 손', labelPos: { x: 42, y: 305 }, path: 'M48,280 L72,280 L68,320 L38,320Z' },
  { id: 'right_hand', label: '오른쪽 손', labelPos: { x: 258, y: 305 }, path: 'M228,280 L252,280 L262,320 L232,320Z' },
  { id: 'left_hip', label: '왼쪽 골반/엉덩이', labelPos: { x: 128, y: 288 }, path: 'M112,270 L150,278 L150,305 L110,305Z' },
  { id: 'right_hip', label: '오른쪽 골반/엉덩이', labelPos: { x: 172, y: 288 }, path: 'M150,278 L188,270 L190,305 L150,305Z' },
  { id: 'left_thigh', label: '왼쪽 허벅지', labelPos: { x: 125, y: 350 }, path: 'M110,305 L150,305 L146,405 L112,405Z' },
  { id: 'right_thigh', label: '오른쪽 허벅지', labelPos: { x: 175, y: 350 }, path: 'M150,305 L190,305 L188,405 L154,405Z' },
  { id: 'left_knee', label: '왼쪽 무릎', labelPos: { x: 123, y: 418 }, path: 'M112,405 L146,405 L144,435 L110,435Z' },
  { id: 'right_knee', label: '오른쪽 무릎', labelPos: { x: 177, y: 418 }, path: 'M154,405 L188,405 L190,435 L156,435Z' },
  { id: 'left_shin', label: '왼쪽 정강이', labelPos: { x: 120, y: 465 }, path: 'M110,435 L144,435 L140,498 L108,498Z' },
  { id: 'right_shin', label: '오른쪽 정강이', labelPos: { x: 180, y: 465 }, path: 'M156,435 L190,435 L192,498 L160,498Z' },
  { id: 'left_foot', label: '왼쪽 발', labelPos: { x: 115, y: 515 }, path: 'M100,498 L143,498 L143,530 L95,530Z' },
  { id: 'right_foot', label: '오른쪽 발', labelPos: { x: 185, y: 515 }, path: 'M157,498 L200,498 L205,530 L157,530Z' },
];

const BACK_REGIONS: BodyRegion[] = [
  { id: 'head_back', label: '뒤통수', labelPos: { x: 150, y: 35 }, path: 'M133,18 C133,8 167,8 167,18 C172,24 175,38 173,55 C170,68 158,78 150,80 C142,78 130,68 127,55 C125,38 128,24 133,18Z' },
  { id: 'neck_back', label: '목 뒤', labelPos: { x: 150, y: 90 }, path: 'M141,80 L159,80 L162,100 L138,100Z' },
  { id: 'left_shoulder', label: '왼쪽 어깨', labelPos: { x: 88, y: 112 }, path: 'M100,100 L138,100 L138,108 L100,108 C90,108 82,112 78,118 L72,130 L65,126 C70,112 80,102 100,100Z' },
  { id: 'right_shoulder', label: '오른쪽 어깨', labelPos: { x: 212, y: 112 }, path: 'M162,100 L200,100 C220,102 230,112 235,126 L228,130 L222,118 C218,112 210,108 200,108 L162,108Z' },
  { id: 'upper_back', label: '등 상부', labelPos: { x: 150, y: 140 }, path: 'M100,108 L200,108 L200,175 L100,175Z' },
  { id: 'mid_back', label: '등 중부', labelPos: { x: 150, y: 198 }, path: 'M104,175 L196,175 L194,220 L106,220Z' },
  { id: 'lower_back', label: '허리', labelPos: { x: 150, y: 248 }, path: 'M108,220 L192,220 L188,270 L150,278 L112,270Z' },
  { id: 'left_arm_upper', label: '왼쪽 상완', labelPos: { x: 62, y: 165 }, path: 'M65,126 L78,118 L82,130 L80,195 L60,195Z' },
  { id: 'right_arm_upper', label: '오른쪽 상완', labelPos: { x: 238, y: 165 }, path: 'M222,118 L235,126 L240,195 L220,195Z' },
  { id: 'left_arm_lower', label: '왼쪽 전완', labelPos: { x: 52, y: 240 }, path: 'M60,195 L80,195 L72,280 L48,280Z' },
  { id: 'right_arm_lower', label: '오른쪽 전완', labelPos: { x: 248, y: 240 }, path: 'M220,195 L240,195 L252,280 L228,280Z' },
  { id: 'left_hand', label: '왼쪽 손', labelPos: { x: 42, y: 305 }, path: 'M48,280 L72,280 L68,320 L38,320Z' },
  { id: 'right_hand', label: '오른쪽 손', labelPos: { x: 258, y: 305 }, path: 'M228,280 L252,280 L262,320 L232,320Z' },
  { id: 'left_buttock', label: '왼쪽 엉덩이', labelPos: { x: 128, y: 288 }, path: 'M112,270 L150,278 L150,305 L110,305Z' },
  { id: 'right_buttock', label: '오른쪽 엉덩이', labelPos: { x: 172, y: 288 }, path: 'M150,278 L188,270 L190,305 L150,305Z' },
  { id: 'left_thigh_back', label: '왼쪽 허벅지 뒤', labelPos: { x: 125, y: 350 }, path: 'M110,305 L150,305 L146,405 L112,405Z' },
  { id: 'right_thigh_back', label: '오른쪽 허벅지 뒤', labelPos: { x: 175, y: 350 }, path: 'M150,305 L190,305 L188,405 L154,405Z' },
  { id: 'left_knee_back', label: '왼쪽 무릎 뒤', labelPos: { x: 123, y: 418 }, path: 'M112,405 L146,405 L144,435 L110,435Z' },
  { id: 'right_knee_back', label: '오른쪽 무릎 뒤', labelPos: { x: 177, y: 418 }, path: 'M154,405 L188,405 L190,435 L156,435Z' },
  { id: 'left_calf', label: '왼쪽 종아리', labelPos: { x: 120, y: 465 }, path: 'M110,435 L144,435 L140,498 L108,498Z' },
  { id: 'right_calf', label: '오른쪽 종아리', labelPos: { x: 180, y: 465 }, path: 'M156,435 L190,435 L192,498 L160,498Z' },
  { id: 'left_foot', label: '왼쪽 발', labelPos: { x: 115, y: 515 }, path: 'M100,498 L143,498 L143,530 L95,530Z' },
  { id: 'right_foot', label: '오른쪽 발', labelPos: { x: 185, y: 515 }, path: 'M157,498 L200,498 L205,530 L157,530Z' },
];

const BODY_OUTLINE_FRONT = 'M150,8 C130,8 125,25 127,55 C130,68 142,80 150,82 C158,80 170,68 173,55 C175,25 170,8 150,8Z M141,82 L138,100 L100,100 C78,102 68,114 63,128 L55,200 L48,280 L36,325 L40,328 L70,322 L74,280 L82,195 L82,130 L100,108 L200,108 L218,130 L218,195 L226,280 L230,322 L260,328 L264,325 L252,280 L245,200 L237,128 C232,114 222,102 200,100 L162,100 L159,82Z M110,305 L112,405 L110,435 L108,498 L95,535 L148,535 L146,498 L144,435 L146,405 L150,305 L154,405 L156,435 L160,498 L157,535 L210,535 L198,498 L192,435 L190,405 L192,305Z';

const BODY_OUTLINE_BACK = 'M150,8 C130,8 125,25 127,55 C130,68 142,80 150,82 C158,80 170,68 173,55 C175,25 170,8 150,8Z M141,82 L138,100 L100,100 C78,102 68,114 63,128 L55,200 L48,280 L36,325 L40,328 L70,322 L74,280 L82,195 L82,130 L100,108 L200,108 L218,130 L218,195 L226,280 L230,322 L260,328 L264,325 L252,280 L245,200 L237,128 C232,114 222,102 200,100 L162,100 L159,82Z M110,305 L112,405 L110,435 L108,498 L95,535 L148,535 L146,498 L144,435 L146,405 L150,305 L154,405 L156,435 L160,498 L157,535 L210,535 L198,498 L192,435 L190,405 L192,305Z';

export default function BodyMapCanvas({
  side,
  onPinSelect,
  selectedPin,
  selectedRegionId,
  painPins,
  onSideChange,
}: BodyMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);

  const regions = side === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  const outline = side === 'front' ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK;

  const handleSvgClick = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const loc = clientToSvgPoint(svg, clientX, clientY);
    if (!loc) return;

    const regionId = findRegionAtPoint(regions, loc.x, loc.y);
    if (regionId) {
      onPinSelect({ x: loc.x, y: loc.y, regionId });
      return;
    }

    // Fallback: accept click if within body bounding area
    const inBodyBounds = loc.x >= 30 && loc.x <= 270 && loc.y >= 5 && loc.y <= 540;
    if (inBodyBounds && isPointInBodyOutline(outline, loc.x, loc.y)) {
      onPinSelect({ x: loc.x, y: loc.y, regionId: 'pinpoint' });
    } else if (inBodyBounds && loc.x >= 60 && loc.x <= 240 && loc.y >= 80 && loc.y <= 310) {
      // Torso area fallback — outline winding rule misses this area
      onPinSelect({ x: loc.x, y: loc.y, regionId: 'pinpoint' });
    }
  };

  const handleSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const loc = clientToSvgPoint(svg, e.clientX, e.clientY);
    if (!loc) { setHoverPoint(null); setHoveredRegion(null); return; }

    const region = findRegionAtPoint(regions, loc.x, loc.y);
    const inBodyBounds = loc.x >= 30 && loc.x <= 270 && loc.y >= 5 && loc.y <= 540;
    if (region || (inBodyBounds && isPointInBodyOutline(outline, loc.x, loc.y)) || (inBodyBounds && loc.x >= 60 && loc.x <= 240 && loc.y >= 80 && loc.y <= 310)) {
      setHoverPoint(loc);
      setHoveredRegion(region);
    } else {
      setHoverPoint(null);
      setHoveredRegion(null);
    }
  };

  const hoveredLabel = hoveredRegion
    ? regions.find((r) => r.id === hoveredRegion)?.label
    : hoverPoint
      ? '클릭하여 핀 찍기'
      : null;

  const sidePins = painPins.filter((p) => p.side === side);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-[340px]">
      {/* Front/Back Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1.5 w-full">
        <button
          onClick={() => onSideChange('front')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            side === 'front'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="5" r="3" />
            <path d="M12 8v8M8 12h8M10 16l-2 6M14 16l2 6" />
          </svg>
          앞면
        </button>
        <button
          onClick={() => onSideChange('back')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            side === 'back'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="5" r="3" />
            <path d="M12 8v8M8 12h8M10 16l-2 6M14 16l2 6" />
            <path d="M9 10h6" strokeDasharray="2 2" />
          </svg>
          뒷면
        </button>
      </div>

      {/* Body SVG — click anywhere on silhouette to pin */}
      <div className="relative w-full" style={{ aspectRatio: '300/545' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 300 545"
          className="w-full h-full select-none cursor-crosshair"
          onClick={(e) => handleSvgClick(e.clientX, e.clientY)}
          onTouchEnd={(e) => {
            const touch = e.changedTouches[0];
            if (touch) {
              e.preventDefault();
              handleSvgClick(touch.clientX, touch.clientY);
            }
          }}
          onMouseMove={handleSvgMove}
          onMouseLeave={() => { setHoverPoint(null); setHoveredRegion(null); }}
        >
          {/* Background body outline */}
          <path
            d={outline}
            fill={side === 'front' ? '#f8faf9' : '#f0f4ff'}
            stroke={side === 'front' ? '#d1d5db' : '#c7d2fe'}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Spine line for back view */}
          {side === 'back' && (
            <path
              d="M150,100 L150,280"
              stroke="#c7d2fe"
              strokeWidth="1"
              strokeDasharray="4 3"
              fill="none"
            />
          )}

          {/* Region highlights (hover / selected area) */}
          {regions.map((region) => {
            const isHovered = hoveredRegion === region.id;
            const isSelectedArea = selectedRegionId === region.id;
            return (
              <path
                key={region.id}
                d={region.path}
                fill={
                  isSelectedArea
                    ? 'rgba(16, 185, 129, 0.2)'
                    : isHovered
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'transparent'
                }
                stroke={
                  isSelectedArea ? '#10B981' : isHovered ? '#6ee7b7' : 'rgba(209,213,219,0.35)'
                }
                strokeWidth={isSelectedArea ? '1.2' : '0.6'}
                strokeDasharray={isHovered && !isSelectedArea ? '3 2' : 'none'}
                className="pointer-events-none transition-all duration-150"
              />
            );
          })}

          {/* Hover preview pin */}
          {hoverPoint && !selectedPin && (
            <g opacity={0.45} pointerEvents="none">
              <PainPinMarkerSvg x={hoverPoint.x} y={hoverPoint.y} selected />
            </g>
          )}

          {/* Saved pain pins */}
          {sidePins.map((pin) => (
            <PainPinMarkerSvg
              key={pin.id}
              x={pin.x}
              y={pin.y}
              painLevel={pin.painLevel}
            />
          ))}

          {/* Current selection pin */}
          {selectedPin && (
            <PainPinMarkerSvg
              x={selectedPin.x}
              y={selectedPin.y}
              selected
            />
          )}

          {/* Side label watermark */}
          <text x="150" y="540" textAnchor="middle" className="text-[10px]" fill={side === 'front' ? '#c8d5cd' : '#c7d0e6'} fontWeight="500">
            {side === 'front' ? 'FRONT' : 'BACK'}
          </text>
        </svg>

        {/* Hover tooltip */}
        {hoveredLabel && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg pointer-events-none shadow-lg whitespace-nowrap z-10">
            {hoveredLabel}
          </div>
        )}
      </div>

      <p className="text-xs text-center text-gray-400 px-2">
        몸 실루엣 위를 <span className="text-emerald-600 font-medium">클릭</span>해 아픈 곳에 핀을 찍으세요
      </p>
    </div>
  );
}

export { FRONT_REGIONS, BACK_REGIONS, BODY_OUTLINE_FRONT, BODY_OUTLINE_BACK };
export type { BodyRegion };
