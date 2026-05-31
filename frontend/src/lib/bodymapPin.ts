export interface BodyRegionRef {
  id: string;
  label: string;
  path: string;
}

export interface PinSelection {
  x: number;
  y: number;
  regionId: string;
  side?: 'front' | 'back';
}

export interface PainPinDisplay {
  id: string;
  x: number;
  y: number;
  painLevel?: number;
  side: 'front' | 'back';
  bodyPart?: string;
}

const SVG_WIDTH = 300;
const SVG_HEIGHT = 545;

interface Region2DBox {
  cx: number; cy: number;
  hw: number; hh: number;
}

const REGION_2D: Record<string, Region2DBox> = {
  head:              { cx: 150, cy: 44,  hw: 23, hh: 36 },
  head_back:         { cx: 150, cy: 44,  hw: 23, hh: 36 },
  neck:              { cx: 150, cy: 90,  hw: 12, hh: 10 },
  neck_back:         { cx: 150, cy: 90,  hw: 12, hh: 10 },
  left_shoulder:     { cx: 100, cy: 115, hw: 30, hh: 15 },
  right_shoulder:    { cx: 200, cy: 115, hw: 30, hh: 15 },
  chest:             { cx: 150, cy: 141, hw: 50, hh: 33 },
  upper_back:        { cx: 150, cy: 141, hw: 50, hh: 33 },
  epigastric:        { cx: 150, cy: 195, hw: 17, hh: 20 },
  mid_back:          { cx: 150, cy: 195, hw: 46, hh: 22 },
  abdomen:           { cx: 150, cy: 230, hw: 44, hh: 40 },
  lower_back:        { cx: 150, cy: 249, hw: 42, hh: 29 },
  left_arm_upper:    { cx: 71,  cy: 160, hw: 11, hh: 35 },
  right_arm_upper:   { cx: 229, cy: 160, hw: 11, hh: 35 },
  left_arm_lower:    { cx: 60,  cy: 237, hw: 14, hh: 43 },
  right_arm_lower:   { cx: 240, cy: 237, hw: 14, hh: 43 },
  left_hand:         { cx: 55,  cy: 300, hw: 17, hh: 20 },
  right_hand:        { cx: 245, cy: 300, hw: 17, hh: 20 },
  left_hip:          { cx: 130, cy: 287, hw: 20, hh: 18 },
  right_hip:         { cx: 170, cy: 287, hw: 20, hh: 18 },
  left_buttock:      { cx: 130, cy: 287, hw: 20, hh: 18 },
  right_buttock:     { cx: 170, cy: 287, hw: 20, hh: 18 },
  left_thigh:        { cx: 130, cy: 355, hw: 20, hh: 50 },
  right_thigh:       { cx: 170, cy: 355, hw: 20, hh: 50 },
  left_thigh_back:   { cx: 130, cy: 355, hw: 20, hh: 50 },
  right_thigh_back:  { cx: 170, cy: 355, hw: 20, hh: 50 },
  left_knee:         { cx: 128, cy: 420, hw: 18, hh: 15 },
  right_knee:        { cx: 172, cy: 420, hw: 18, hh: 15 },
  left_knee_back:    { cx: 128, cy: 420, hw: 18, hh: 15 },
  right_knee_back:   { cx: 172, cy: 420, hw: 18, hh: 15 },
  left_shin:         { cx: 126, cy: 466, hw: 18, hh: 32 },
  right_shin:        { cx: 174, cy: 466, hw: 18, hh: 32 },
  left_calf:         { cx: 126, cy: 466, hw: 18, hh: 32 },
  right_calf:        { cx: 174, cy: 466, hw: 18, hh: 32 },
  left_foot:         { cx: 119, cy: 514, hw: 24, hh: 16 },
  right_foot:        { cx: 181, cy: 514, hw: 24, hh: 16 },
};

/** Get the 2D SVG center of a body region by ID */
export function getRegion2DCenter(regionId: string): { x: number; y: number } | null {
  const r = REGION_2D[regionId];
  return r ? { x: r.cx, y: r.cy } : null;
}

/**
 * Map a 3D hit point to accurate 2D SVG coordinates using per-region mapping.
 * Preserves precision: offset within the 3D part maps to offset within the 2D region.
 */
export function world3DToSvgForRegion(
  hitX: number,
  hitY: number,
  regionId: string,
  partCenterX: number,
  partCenterY: number,
  partHalfW: number,
  partHalfH: number,
): { x: number; y: number } {
  const region = REGION_2D[regionId];
  if (!region) return world3DToSvgPoint(hitX, hitY);

  // Normalize offset within 3D part [-1, 1]
  const nx = partHalfW > 0.001 ? Math.max(-1, Math.min(1, (hitX - partCenterX) / partHalfW)) : 0;
  const ny = partHalfH > 0.001 ? Math.max(-1, Math.min(1, (hitY - partCenterY) / partHalfH)) : 0;

  // Map to 2D (Y inverted: 3D Y-up → SVG Y-down)
  const svgX = region.cx + nx * region.hw;
  const svgY = region.cy - ny * region.hh;

  return {
    x: Math.max(12, Math.min(SVG_WIDTH - 12, svgX)),
    y: Math.max(12, Math.min(SVG_HEIGHT - 12, svgY)),
  };
}

/** Find which region path contains the point (viewBox coords). */
export function findRegionAtPoint(
  regions: BodyRegionRef[],
  x: number,
  y: number,
): string | null {
  if (typeof document === 'undefined') return null;

  for (const region of regions) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', region.path);
    if (path.isPointInFill(new DOMPoint(x, y))) {
      return region.id;
    }
  }
  return null;
}

/** Check if point is inside the body silhouette. */
export function isPointInBodyOutline(outline: string, x: number, y: number): boolean {
  if (typeof document === 'undefined') return false;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', outline);
  return path.isPointInFill(new DOMPoint(x, y));
}

/** Convert screen click to SVG viewBox coordinates. */
export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM()?.inverse();
  if (!ctm) return null;
  const loc = pt.matrixTransform(ctm);
  return { x: loc.x, y: loc.y };
}

/** Map 3D world hit to canonical 2D viewBox coords (for storage). */
export function world3DToSvgPoint(worldX: number, worldY: number): { x: number; y: number } {
  const x = 150 + worldX * 88;
  const y = ((2.55 - worldY) / 3.85) * SVG_HEIGHT;
  return {
    x: Math.max(12, Math.min(SVG_WIDTH - 12, x)),
    y: Math.max(12, Math.min(SVG_HEIGHT - 12, y)),
  };
}

/** Map stored SVG coords back to 3D for pin display. */
export function svgPointToWorld3D(svgX: number, svgY: number, side: 'front' | 'back' = 'front'): [number, number, number] {
  const worldX = (svgX - 150) / 88;
  const worldY = 2.55 - (svgY / SVG_HEIGHT) * 3.85;
  const z = side === 'back' ? -0.08 : 0.08;
  return [worldX, worldY, z];
}

/** Check if two pins are close enough to be considered the same spot */
export function arePinsClose(x1: number, y1: number, x2: number, y2: number, threshold = 15): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

export function hasValidPin(x?: number, y?: number): boolean {
  return typeof x === 'number' && typeof y === 'number' && x > 0 && y > 0;
}

export { SVG_WIDTH, SVG_HEIGHT };
