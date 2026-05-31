'use client';

import { Suspense, useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Outlines } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  world3DToSvgPoint,
  svgPointToWorld3D,
  world3DToSvgForRegion,
  type PainPinDisplay,
  type PinSelection,
} from '@/lib/bodymapPin';

export interface BodyRegion3D {
  id: string;
  label: string;
  side: 'front' | 'back' | 'left' | 'right';
}

export const BODY_REGIONS_3D: BodyRegion3D[] = [
  { id: 'head', label: '머리', side: 'front' },
  { id: 'head_back', label: '뒤통수', side: 'back' },
  { id: 'neck', label: '목', side: 'front' },
  { id: 'chest', label: '가슴', side: 'front' },
  { id: 'upper_back', label: '등 상부', side: 'back' },
  { id: 'abdomen', label: '배', side: 'front' },
  { id: 'lower_back', label: '허리', side: 'back' },
  { id: 'left_shoulder', label: '왼쪽 어깨', side: 'left' },
  { id: 'right_shoulder', label: '오른쪽 어깨', side: 'right' },
  { id: 'left_arm_upper', label: '왼쪽 상완', side: 'left' },
  { id: 'right_arm_upper', label: '오른쪽 상완', side: 'right' },
  { id: 'left_arm_lower', label: '왼쪽 전완', side: 'left' },
  { id: 'right_arm_lower', label: '오른쪽 전완', side: 'right' },
  { id: 'left_hand', label: '왼쪽 손', side: 'left' },
  { id: 'right_hand', label: '오른쪽 손', side: 'right' },
  { id: 'left_hip', label: '왼쪽 골반', side: 'left' },
  { id: 'right_hip', label: '오른쪽 골반', side: 'right' },
  { id: 'left_thigh', label: '왼쪽 허벅지', side: 'left' },
  { id: 'right_thigh', label: '오른쪽 허벅지', side: 'right' },
  { id: 'left_knee', label: '왼쪽 무릎', side: 'left' },
  { id: 'right_knee', label: '오른쪽 무릎', side: 'right' },
  { id: 'left_shin', label: '왼쪽 정강이', side: 'left' },
  { id: 'right_shin', label: '오른쪽 정강이', side: 'right' },
  { id: 'left_foot', label: '왼쪽 발', side: 'left' },
  { id: 'right_foot', label: '오른쪽 발', side: 'right' },
];

const THEME = {
  bodyFront: '#e2e8f0',
  bodyBack: '#cbd5e1',
  outline: '#64748b',
  bg: '#f8fafc',
} as const;

interface BodyPartDef {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  args: [number, number, number];
  facing?: 'front' | 'back';
}

const BODY_PARTS: BodyPartDef[] = [
  { id: 'head', position: [0, 2.42, 0], args: [0.98, 0.98, 0.98], facing: 'front' },
  { id: 'head_back', position: [0, 2.42, -0.06], args: [0.88, 0.88, 0.28], facing: 'back' },
  { id: 'neck', position: [0, 1.86, 0], args: [0.42, 0.22, 0.38] },
  { id: 'chest', position: [0, 1.42, 0.14], args: [1.08, 0.68, 0.26], facing: 'front' },
  { id: 'upper_back', position: [0, 1.42, -0.14], args: [1.02, 0.62, 0.24], facing: 'back' },
  { id: 'abdomen', position: [0, 0.76, 0.12], args: [0.92, 0.52, 0.24], facing: 'front' },
  { id: 'lower_back', position: [0, 0.76, -0.12], args: [0.86, 0.48, 0.2], facing: 'back' },
  { id: 'left_shoulder', position: [-0.7, 1.6, 0], args: [0.36, 0.36, 0.36] },
  { id: 'right_shoulder', position: [0.7, 1.6, 0], args: [0.36, 0.36, 0.36] },
  { id: 'left_arm_upper', position: [-0.78, 1.12, 0], args: [0.4, 0.88, 0.4] },
  { id: 'right_arm_upper', position: [0.78, 1.12, 0], args: [0.4, 0.88, 0.4] },
  { id: 'left_arm_lower', position: [-0.78, 0.52, 0.02], args: [0.36, 0.8, 0.36] },
  { id: 'right_arm_lower', position: [0.78, 0.52, 0.02], args: [0.36, 0.8, 0.36] },
  { id: 'left_hand', position: [-0.78, 0.02, 0.02], args: [0.34, 0.34, 0.34] },
  { id: 'right_hand', position: [0.78, 0.02, 0.02], args: [0.34, 0.34, 0.34] },
  { id: 'left_hip', position: [-0.3, 0.32, 0], args: [0.4, 0.26, 0.4] },
  { id: 'right_hip', position: [0.3, 0.32, 0], args: [0.4, 0.26, 0.4] },
  { id: 'left_thigh', position: [-0.3, -0.18, 0], args: [0.4, 0.9, 0.4] },
  { id: 'right_thigh', position: [0.3, -0.18, 0], args: [0.4, 0.9, 0.4] },
  { id: 'left_knee', position: [-0.3, -0.66, 0.02], args: [0.36, 0.2, 0.36] },
  { id: 'right_knee', position: [0.3, -0.66, 0.02], args: [0.36, 0.2, 0.36] },
  { id: 'left_shin', position: [-0.3, -1.08, 0], args: [0.38, 0.78, 0.38] },
  { id: 'right_shin', position: [0.3, -1.08, 0], args: [0.38, 0.78, 0.38] },
  { id: 'left_foot', position: [-0.3, -1.46, 0.14], args: [0.4, 0.24, 0.58] },
  { id: 'right_foot', position: [0.3, -1.46, 0.14], args: [0.4, 0.24, 0.58] },
];

type ViewPreset = 'front' | 'back' | 'left' | 'right';

const VIEW_CAMERA: Record<ViewPreset, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0.85, 4.6),
  back: new THREE.Vector3(0, 0.85, -4.6),
  left: new THREE.Vector3(-4.6, 0.85, 0),
  right: new THREE.Vector3(4.6, 0.85, 0),
};

/** Determine front/back based on camera z relative to click point */
function determineSide(cameraZ: number): 'front' | 'back' {
  return cameraZ >= 0 ? 'front' : 'back';
}

interface BodyPartMeshProps {
  def: BodyPartDef;
  selected: boolean;
  hasRecordedPin: boolean;
  onPinSelect: (pin: PinSelection) => void;
  onHover: (id: string | null) => void;
  cameraRef: React.RefObject<THREE.Camera | null>;
}

function BodyPartMesh({ def, selected, hasRecordedPin, onPinSelect, onHover, cameraRef }: BodyPartMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const baseColor = def.facing === 'back' ? THEME.bodyBack : THEME.bodyFront;
  const displayColor = selected
    ? '#10b981'
    : hasRecordedPin
      ? '#fca5a5'
      : hovered
        ? '#94a3b8'
        : baseColor;

  const emissive = selected
    ? '#065f46'
    : hasRecordedPin
      ? '#7f1d1d'
      : '#000000';

  const emissiveIntensity = selected ? 0.2 : hasRecordedPin ? 0.15 : 0;

  useFrame(() => {
    if (!meshRef.current) return;
    const pulse = selected ? 1.04 : hovered ? 1.02 : 1;
    meshRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <mesh
      ref={meshRef}
      name={def.id}
      position={def.position}
      rotation={def.rotation ?? [0, 0, 0]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        const side = cameraRef.current ? determineSide(cameraRef.current.position.z) : 'front';
        const { x, y } = world3DToSvgForRegion(
          e.point.x, e.point.y,
          def.id,
          def.position[0], def.position[1],
          def.args[0] / 2, def.args[1] / 2,
        );
        onPinSelect({ x, y, regionId: def.id, side });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(def.id);
        document.body.style.cursor = 'crosshair';
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={def.args} />
      <meshStandardMaterial
        color={displayColor}
        roughness={0.45}
        metalness={0.02}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
      <Outlines thickness={0.018} color={THEME.outline} opacity={0.4} />
    </mesh>
  );
}

function CameraAnimator({
  targetView,
  controlsRef,
}: {
  targetView: ViewPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const goal = useMemo(() => VIEW_CAMERA[targetView].clone(), [targetView]);
  const animating = useRef(true);

  useEffect(() => {
    animating.current = true;
  }, [targetView]);

  useFrame(() => {
    if (!animating.current) return;
    const dist = camera.position.distanceTo(goal);
    if (dist < 0.08) {
      camera.position.copy(goal);
      animating.current = false;
    } else {
      camera.position.lerp(goal, 0.07);
    }
    camera.lookAt(0, 0.85, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.85, 0);
      controlsRef.current.update();
    }
  });

  return null;
}

function PinMarker3D({
  svgX,
  svgY,
  selected,
  painLevel,
  side = 'front',
}: {
  svgX: number;
  svgY: number;
  selected?: boolean;
  painLevel?: number;
  side?: 'front' | 'back';
}) {
  const [wx, wy, wz] = svgPointToWorld3D(svgX, svgY, side);
  const zOffset = side === 'back' ? -0.15 : 0.15;
  return (
    <Html position={[wx, wy, wz + zOffset]} center distanceFactor={5} zIndexRange={[100, 0]}>
      <div className={`flex flex-col items-center pointer-events-none ${selected ? 'animate-pulse' : ''}`}>
        <div
          className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${
            selected ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
        <div
          className={`w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent ${
            selected ? 'border-t-emerald-500' : 'border-t-red-500'
          }`}
        />
        {painLevel !== undefined && painLevel > 0 && (
          <span className="absolute -top-1 text-[8px] font-bold text-white drop-shadow">{painLevel}</span>
        )}
      </div>
    </Html>
  );
}

function CameraRefCapture({ cameraRef }: { cameraRef: React.MutableRefObject<THREE.Camera | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera, cameraRef]);
  return null;
}

function HumanBody({
  selectedRegionId,
  recordedRegionIds,
  onPinSelect,
  onHover,
  painPins,
  selectedPin,
  cameraRef,
}: {
  selectedRegionId: string;
  recordedRegionIds: string[];
  onPinSelect: (pin: PinSelection) => void;
  onHover: (id: string | null) => void;
  painPins: PainPinDisplay[];
  selectedPin: { x: number; y: number; side?: 'front' | 'back' } | null;
  cameraRef: React.RefObject<THREE.Camera | null>;
}) {
  return (
    <group>
      {BODY_PARTS.map((def) => (
        <BodyPartMesh
          key={def.id}
          def={def}
          selected={selectedRegionId === def.id}
          hasRecordedPin={recordedRegionIds.includes(def.id)}
          onPinSelect={onPinSelect}
          onHover={onHover}
          cameraRef={cameraRef}
        />
      ))}
      <FrontCrossMark />
      {painPins.map((pin) => (
        <PinMarker3D key={pin.id} svgX={pin.x} svgY={pin.y} painLevel={pin.painLevel} side={pin.side} />
      ))}
      {selectedPin && <PinMarker3D svgX={selectedPin.x} svgY={selectedPin.y} selected side={selectedPin.side} />}
    </group>
  );
}

function Scene({
  selectedRegionId,
  recordedRegionIds,
  onPinSelect,
  onHover,
  viewPreset,
  controlsRef,
  painPins,
  selectedPin,
  cameraRef,
}: {
  selectedRegionId: string;
  recordedRegionIds: string[];
  onPinSelect: (pin: PinSelection) => void;
  onHover: (id: string | null) => void;
  viewPreset: ViewPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  painPins: PainPinDisplay[];
  selectedPin: { x: number; y: number; side?: 'front' | 'back' } | null;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
}) {
  return (
    <>
      <color attach="background" args={[THEME.bg]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 7, 5]} intensity={0.9} />
      <directionalLight position={[-3, 4, -3]} intensity={0.35} />
      <hemisphereLight args={['#e0f2fe', '#f8fafc', 0.4]} />
      <CameraRefCapture cameraRef={cameraRef} />
      <CameraAnimator targetView={viewPreset} controlsRef={controlsRef} />
      <HumanBody
        selectedRegionId={selectedRegionId}
        recordedRegionIds={recordedRegionIds}
        onPinSelect={onPinSelect}
        onHover={onHover}
        painPins={painPins}
        selectedPin={selectedPin}
        cameraRef={cameraRef}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={(5 * Math.PI) / 6}
        minDistance={3}
        maxDistance={7.5}
        target={[0, 0.85, 0]}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

interface BodyMapCanvas3DProps {
  onPinSelect: (pin: PinSelection) => void;
  selectedPin: { x: number; y: number; side?: 'front' | 'back' } | null;
  selectedRegionId: string;
  painPins: PainPinDisplay[];
}

/** Medical cross on front chest to indicate orientation */
function FrontCrossMark() {
  return (
    <group position={[0, 1.42, 0.28]}>
      <mesh>
        <boxGeometry args={[0.04, 0.2, 0.02]} />
        <meshBasicMaterial color="#10b981" opacity={0.7} transparent />
      </mesh>
      <mesh>
        <boxGeometry args={[0.2, 0.04, 0.02]} />
        <meshBasicMaterial color="#10b981" opacity={0.7} transparent />
      </mesh>
    </group>
  );
}

export default function BodyMapCanvas3D({
  onPinSelect,
  selectedPin,
  selectedRegionId,
  painPins,
}: BodyMapCanvas3DProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const [viewPreset, setViewPreset] = useState<ViewPreset>('front');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [webglOk] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    } catch {
      return false;
    }
  });


  useEffect(() => {
    if (selectedRegionId) {
      setViewPreset(getRegion3DViewSide(selectedRegionId));
    }
  }, [selectedRegionId]);

  const activeLabel = selectedRegionId
    ? getRegion3DLabel(selectedRegionId)
    : hoveredId
      ? getRegion3DLabel(hoveredId)
      : null;

  const recordedRegionIds = [...new Set(painPins.map((p) => p.bodyPart).filter(Boolean))] as string[];

  if (!webglOk) {
    return (
      <div className="w-[340px] h-[500px] flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-200 text-sm text-gray-500">
        3D를 지원하지 않는 기기입니다. 2D 모드를 사용하세요.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="w-[340px] h-[500px] rounded-2xl border border-gray-200 bg-[#f8fafc] overflow-hidden shadow-md">
        {/* Bottom region label */}
        {activeLabel && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-gray-900/85 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
            {activeLabel}
          </div>
        )}

        <Canvas camera={{ position: [0, 0.85, 4.6], fov: 40 }} gl={{ antialias: true, alpha: false }}>
          <Suspense fallback={null}>
            <Scene
              selectedRegionId={selectedRegionId}
              recordedRegionIds={recordedRegionIds}
              onPinSelect={onPinSelect}
              onHover={setHoveredId}
              viewPreset={viewPreset}
              controlsRef={controlsRef}
              painPins={painPins}
              selectedPin={selectedPin}
              cameraRef={cameraRef}
            />
          </Suspense>
        </Canvas>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 border border-gray-300" /> 기본
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> 선택
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-300" /> 기록됨
        </span>
      </div>
      <p className="mt-1 text-center text-xs text-gray-400">
        드래그로 회전 · 부위 클릭으로 핀 찍기
      </p>
    </div>
  );
}

export function getRegion3DLabel(id: string): string {
  return BODY_REGIONS_3D.find((r) => r.id === id)?.label ?? id;
}

export function getRegion3DSide(id: string): 'front' | 'back' {
  const region = BODY_REGIONS_3D.find((r) => r.id === id);
  if (!region) return 'front';
  if (region.side === 'back') return 'back';
  return 'front';
}

export function getRegion3DViewSide(id: string): ViewPreset {
  const region = BODY_REGIONS_3D.find((r) => r.id === id);
  if (!region) return 'front';
  if (region.side === 'back') return 'back';
  if (region.side === 'left') return 'left';
  if (region.side === 'right') return 'right';
  return 'front';
}
