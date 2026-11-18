import type { SkinRegion } from './types/skin';

/**
 * Minecraft 64x64 skin UV layout.
 * Base layer: upper half (y 0-31) + lower strips (y 48-63).
 * Overlay layer: hat (y 0-15), jacket/sleeves (y 32-47), pants (y 48-63).
 *
 * Steve: 4px wide arms. Alex: 3px wide arms — arm faces shift by 1px.
 */

// ── Head (identical for Steve and Alex) ──
const HEAD_BASE: SkinRegion[] = [
  { id: 'head_top',    label: 'Head · Top',    bodyPart: 'head', layer: 'base', x: 8,  y: 0,  width: 8, height: 8 },
  { id: 'head_bottom', label: 'Head · Bottom', bodyPart: 'head', layer: 'base', x: 16, y: 0,  width: 8, height: 8 },
  { id: 'head_right',  label: 'Head · Right',  bodyPart: 'head', layer: 'base', x: 0,  y: 8,  width: 8, height: 8 },
  { id: 'head_front',  label: 'Head · Front',  bodyPart: 'head', layer: 'base', x: 8,  y: 8,  width: 8, height: 8 },
  { id: 'head_left',   label: 'Head · Left',   bodyPart: 'head', layer: 'base', x: 16, y: 8,  width: 8, height: 8 },
  { id: 'head_back',   label: 'Head · Back',   bodyPart: 'head', layer: 'base', x: 24, y: 8,  width: 8, height: 8 },
];

const HEAD_OVERLAY: SkinRegion[] = [
  { id: 'hat_top',    label: 'Hat · Top',    bodyPart: 'head', layer: 'overlay', x: 40, y: 0,  width: 8, height: 8 },
  { id: 'hat_bottom', label: 'Hat · Bottom', bodyPart: 'head', layer: 'overlay', x: 48, y: 0,  width: 8, height: 8 },
  { id: 'hat_right',  label: 'Hat · Right',  bodyPart: 'head', layer: 'overlay', x: 32, y: 8,  width: 8, height: 8 },
  { id: 'hat_front',  label: 'Hat · Front',  bodyPart: 'head', layer: 'overlay', x: 40, y: 8,  width: 8, height: 8 },
  { id: 'hat_left',   label: 'Hat · Left',   bodyPart: 'head', layer: 'overlay', x: 48, y: 8,  width: 8, height: 8 },
  { id: 'hat_back',   label: 'Hat · Back',   bodyPart: 'head', layer: 'overlay', x: 56, y: 8,  width: 8, height: 8 },
];

// ── Body (identical for Steve and Alex) ──
const BODY_BASE: SkinRegion[] = [
  { id: 'body_top',    label: 'Body · Top',    bodyPart: 'body', layer: 'base', x: 20, y: 16, width: 8, height: 4 },
  { id: 'body_bottom', label: 'Body · Bottom', bodyPart: 'body', layer: 'base', x: 28, y: 16, width: 8, height: 4 },
  { id: 'body_right',  label: 'Body · Right',  bodyPart: 'body', layer: 'base', x: 16, y: 20, width: 4, height: 12 },
  { id: 'body_front',  label: 'Body · Front',  bodyPart: 'body', layer: 'base', x: 20, y: 20, width: 8, height: 12 },
  { id: 'body_left',   label: 'Body · Left',   bodyPart: 'body', layer: 'base', x: 28, y: 20, width: 4, height: 12 },
  { id: 'body_back',   label: 'Body · Back',   bodyPart: 'body', layer: 'base', x: 32, y: 20, width: 8, height: 12 },
];

const BODY_OVERLAY: SkinRegion[] = [
  { id: 'jacket_top',    label: 'Jacket · Top',    bodyPart: 'body', layer: 'overlay', x: 20, y: 32, width: 8, height: 4 },
  { id: 'jacket_bottom', label: 'Jacket · Bottom', bodyPart: 'body', layer: 'overlay', x: 28, y: 32, width: 8, height: 4 },
  { id: 'jacket_right',  label: 'Jacket · Right',  bodyPart: 'body', layer: 'overlay', x: 16, y: 36, width: 4, height: 12 },
  { id: 'jacket_front',  label: 'Jacket · Front',  bodyPart: 'body', layer: 'overlay', x: 20, y: 36, width: 8, height: 12 },
  { id: 'jacket_left',   label: 'Jacket · Left',   bodyPart: 'body', layer: 'overlay', x: 28, y: 36, width: 4, height: 12 },
  { id: 'jacket_back',   label: 'Jacket · Back',   bodyPart: 'body', layer: 'overlay', x: 32, y: 36, width: 8, height: 12 },
];

// ── Right Arm — STEVE (4px wide) ──
const RARM_STEVE_BASE: SkinRegion[] = [
  { id: 'rarm_top',    label: 'Right Arm · Top',    bodyPart: 'right_arm', layer: 'base', x: 44, y: 16, width: 4, height: 4 },
  { id: 'rarm_bottom', label: 'Right Arm · Bottom', bodyPart: 'right_arm', layer: 'base', x: 48, y: 16, width: 4, height: 4 },
  { id: 'rarm_right',  label: 'Right Arm · Right',  bodyPart: 'right_arm', layer: 'base', x: 40, y: 20, width: 4, height: 12 },
  { id: 'rarm_front',  label: 'Right Arm · Front',  bodyPart: 'right_arm', layer: 'base', x: 44, y: 20, width: 4, height: 12 },
  { id: 'rarm_left',   label: 'Right Arm · Left',   bodyPart: 'right_arm', layer: 'base', x: 48, y: 20, width: 4, height: 12 },
  { id: 'rarm_back',   label: 'Right Arm · Back',   bodyPart: 'right_arm', layer: 'base', x: 52, y: 20, width: 4, height: 12 },
];

// ── Right Arm — ALEX (3px wide, coordinates shifted) ──
const RARM_ALEX_BASE: SkinRegion[] = [
  { id: 'rarm_top',    label: 'Right Arm · Top',    bodyPart: 'right_arm', layer: 'base', x: 44, y: 16, width: 3, height: 4 },
  { id: 'rarm_bottom', label: 'Right Arm · Bottom', bodyPart: 'right_arm', layer: 'base', x: 47, y: 16, width: 3, height: 4 },
  { id: 'rarm_right',  label: 'Right Arm · Right',  bodyPart: 'right_arm', layer: 'base', x: 40, y: 20, width: 3, height: 12 },
  { id: 'rarm_front',  label: 'Right Arm · Front',  bodyPart: 'right_arm', layer: 'base', x: 43, y: 20, width: 3, height: 12 },
  { id: 'rarm_left',   label: 'Right Arm · Left',   bodyPart: 'right_arm', layer: 'base', x: 46, y: 20, width: 3, height: 12 },
  { id: 'rarm_back',   label: 'Right Arm · Back',   bodyPart: 'right_arm', layer: 'base', x: 49, y: 20, width: 3, height: 12 },
];

// ── Left Arm — STEVE (4px wide) ──
const LARM_STEVE_BASE: SkinRegion[] = [
  { id: 'larm_top',    label: 'Left Arm · Top',    bodyPart: 'left_arm', layer: 'base', x: 36, y: 48, width: 4, height: 4 },
  { id: 'larm_bottom', label: 'Left Arm · Bottom', bodyPart: 'left_arm', layer: 'base', x: 40, y: 48, width: 4, height: 4 },
  { id: 'larm_right',  label: 'Left Arm · Right',  bodyPart: 'left_arm', layer: 'base', x: 32, y: 52, width: 4, height: 12 },
  { id: 'larm_front',  label: 'Left Arm · Front',  bodyPart: 'left_arm', layer: 'base', x: 36, y: 52, width: 4, height: 12 },
  { id: 'larm_left',   label: 'Left Arm · Left',   bodyPart: 'left_arm', layer: 'base', x: 40, y: 52, width: 4, height: 12 },
  { id: 'larm_back',   label: 'Left Arm · Back',   bodyPart: 'left_arm', layer: 'base', x: 44, y: 52, width: 4, height: 12 },
];

// ── Left Arm — ALEX (3px wide) ──
const LARM_ALEX_BASE: SkinRegion[] = [
  { id: 'larm_top',    label: 'Left Arm · Top',    bodyPart: 'left_arm', layer: 'base', x: 36, y: 48, width: 3, height: 4 },
  { id: 'larm_bottom', label: 'Left Arm · Bottom', bodyPart: 'left_arm', layer: 'base', x: 39, y: 48, width: 3, height: 4 },
  { id: 'larm_right',  label: 'Left Arm · Right',  bodyPart: 'left_arm', layer: 'base', x: 32, y: 52, width: 3, height: 12 },
  { id: 'larm_front',  label: 'Left Arm · Front',  bodyPart: 'left_arm', layer: 'base', x: 35, y: 52, width: 3, height: 12 },
  { id: 'larm_left',   label: 'Left Arm · Left',   bodyPart: 'left_arm', layer: 'base', x: 38, y: 52, width: 3, height: 12 },
  { id: 'larm_back',   label: 'Left Arm · Back',   bodyPart: 'left_arm', layer: 'base', x: 41, y: 52, width: 3, height: 12 },
];

// ── Legs (identical for both models) ──
const RLEG_BASE: SkinRegion[] = [
  { id: 'rleg_top',    label: 'Right Leg · Top',    bodyPart: 'right_leg', layer: 'base', x: 4,  y: 16, width: 4, height: 4 },
  { id: 'rleg_bottom', label: 'Right Leg · Bottom', bodyPart: 'right_leg', layer: 'base', x: 8,  y: 16, width: 4, height: 4 },
  { id: 'rleg_right',  label: 'Right Leg · Right',  bodyPart: 'right_leg', layer: 'base', x: 0,  y: 20, width: 4, height: 12 },
  { id: 'rleg_front',  label: 'Right Leg · Front',  bodyPart: 'right_leg', layer: 'base', x: 4,  y: 20, width: 4, height: 12 },
  { id: 'rleg_left',   label: 'Right Leg · Left',   bodyPart: 'right_leg', layer: 'base', x: 8,  y: 20, width: 4, height: 12 },
  { id: 'rleg_back',   label: 'Right Leg · Back',   bodyPart: 'right_leg', layer: 'base', x: 12, y: 20, width: 4, height: 12 },
];

const LLEG_BASE: SkinRegion[] = [
  { id: 'lleg_top',    label: 'Left Leg · Top',    bodyPart: 'left_leg', layer: 'base', x: 20, y: 48, width: 4, height: 4 },
  { id: 'lleg_bottom', label: 'Left Leg · Bottom', bodyPart: 'left_leg', layer: 'base', x: 24, y: 48, width: 4, height: 4 },
  { id: 'lleg_right',  label: 'Left Leg · Right',  bodyPart: 'left_leg', layer: 'base', x: 16, y: 52, width: 4, height: 12 },
  { id: 'lleg_front',  label: 'Left Leg · Front',  bodyPart: 'left_leg', layer: 'base', x: 20, y: 52, width: 4, height: 12 },
  { id: 'lleg_left',   label: 'Left Leg · Left',   bodyPart: 'left_leg', layer: 'base', x: 24, y: 52, width: 4, height: 12 },
  { id: 'lleg_back',   label: 'Left Leg · Back',   bodyPart: 'left_leg', layer: 'base', x: 28, y: 52, width: 4, height: 12 },
];

// Overlay sleeves/pants (Steve geometry — 4px)
const RARM_STEVE_OVERLAY: SkinRegion[] = [
  { id: 'rsleeve_top',    label: 'R Sleeve · Top',    bodyPart: 'right_arm', layer: 'overlay', x: 44, y: 32, width: 4, height: 4 },
  { id: 'rsleeve_bottom', label: 'R Sleeve · Bottom', bodyPart: 'right_arm', layer: 'overlay', x: 48, y: 32, width: 4, height: 4 },
  { id: 'rsleeve_right',  label: 'R Sleeve · Right',  bodyPart: 'right_arm', layer: 'overlay', x: 40, y: 36, width: 4, height: 12 },
  { id: 'rsleeve_front',  label: 'R Sleeve · Front',  bodyPart: 'right_arm', layer: 'overlay', x: 44, y: 36, width: 4, height: 12 },
  { id: 'rsleeve_left',   label: 'R Sleeve · Left',   bodyPart: 'right_arm', layer: 'overlay', x: 48, y: 36, width: 4, height: 12 },
  { id: 'rsleeve_back',   label: 'R Sleeve · Back',   bodyPart: 'right_arm', layer: 'overlay', x: 52, y: 36, width: 4, height: 12 },
];

const LARM_STEVE_OVERLAY: SkinRegion[] = [
  { id: 'lsleeve_top',    label: 'L Sleeve · Top',    bodyPart: 'left_arm', layer: 'overlay', x: 52, y: 48, width: 4, height: 4 },
  { id: 'lsleeve_bottom', label: 'L Sleeve · Bottom', bodyPart: 'left_arm', layer: 'overlay', x: 56, y: 48, width: 4, height: 4 },
  { id: 'lsleeve_right',  label: 'L Sleeve · Right',  bodyPart: 'left_arm', layer: 'overlay', x: 48, y: 52, width: 4, height: 12 },
  { id: 'lsleeve_front',  label: 'L Sleeve · Front',  bodyPart: 'left_arm', layer: 'overlay', x: 52, y: 52, width: 4, height: 12 },
  { id: 'lsleeve_left',   label: 'L Sleeve · Left',   bodyPart: 'left_arm', layer: 'overlay', x: 56, y: 52, width: 4, height: 12 },
  { id: 'lsleeve_back',   label: 'L Sleeve · Back',   bodyPart: 'left_arm', layer: 'overlay', x: 60, y: 52, width: 4, height: 12 },
];

// Alex overlay arms (3px)
const RARM_ALEX_OVERLAY: SkinRegion[] = [
  { id: 'rsleeve_top',    label: 'R Sleeve · Top',    bodyPart: 'right_arm', layer: 'overlay', x: 44, y: 32, width: 3, height: 4 },
  { id: 'rsleeve_bottom', label: 'R Sleeve · Bottom', bodyPart: 'right_arm', layer: 'overlay', x: 47, y: 32, width: 3, height: 4 },
  { id: 'rsleeve_right',  label: 'R Sleeve · Right',  bodyPart: 'right_arm', layer: 'overlay', x: 40, y: 36, width: 3, height: 12 },
  { id: 'rsleeve_front',  label: 'R Sleeve · Front',  bodyPart: 'right_arm', layer: 'overlay', x: 43, y: 36, width: 3, height: 12 },
  { id: 'rsleeve_left',   label: 'R Sleeve · Left',   bodyPart: 'right_arm', layer: 'overlay', x: 46, y: 36, width: 3, height: 12 },
  { id: 'rsleeve_back',   label: 'R Sleeve · Back',   bodyPart: 'right_arm', layer: 'overlay', x: 49, y: 36, width: 3, height: 12 },
];

const LARM_ALEX_OVERLAY: SkinRegion[] = [
  { id: 'lsleeve_top',    label: 'L Sleeve · Top',    bodyPart: 'left_arm', layer: 'overlay', x: 52, y: 48, width: 3, height: 4 },
  { id: 'lsleeve_bottom', label: 'L Sleeve · Bottom', bodyPart: 'left_arm', layer: 'overlay', x: 55, y: 48, width: 3, height: 4 },
  { id: 'lsleeve_right',  label: 'L Sleeve · Right',  bodyPart: 'left_arm', layer: 'overlay', x: 48, y: 52, width: 3, height: 12 },
  { id: 'lsleeve_front',  label: 'L Sleeve · Front',  bodyPart: 'left_arm', layer: 'overlay', x: 51, y: 52, width: 3, height: 12 },
  { id: 'lsleeve_left',   label: 'L Sleeve · Left',   bodyPart: 'left_arm', layer: 'overlay', x: 54, y: 52, width: 3, height: 12 },
  { id: 'lsleeve_back',   label: 'L Sleeve · Back',   bodyPart: 'left_arm', layer: 'overlay', x: 57, y: 52, width: 3, height: 12 },
];

const RLEG_OVERLAY: SkinRegion[] = [
  { id: 'rpants_top',    label: 'R Pants · Top',    bodyPart: 'right_leg', layer: 'overlay', x: 4,  y: 32, width: 4, height: 4 },
  { id: 'rpants_bottom', label: 'R Pants · Bottom', bodyPart: 'right_leg', layer: 'overlay', x: 8,  y: 32, width: 4, height: 4 },
  { id: 'rpants_right',  label: 'R Pants · Right',  bodyPart: 'right_leg', layer: 'overlay', x: 0,  y: 36, width: 4, height: 12 },
  { id: 'rpants_front',  label: 'R Pants · Front',  bodyPart: 'right_leg', layer: 'overlay', x: 4,  y: 36, width: 4, height: 12 },
  { id: 'rpants_left',   label: 'R Pants · Left',   bodyPart: 'right_leg', layer: 'overlay', x: 8,  y: 36, width: 4, height: 12 },
  { id: 'rpants_back',   label: 'R Pants · Back',   bodyPart: 'right_leg', layer: 'overlay', x: 12, y: 36, width: 4, height: 12 },
];

const LLEG_OVERLAY: SkinRegion[] = [
  { id: 'lpants_top',    label: 'L Pants · Top',    bodyPart: 'left_leg', layer: 'overlay', x: 4,  y: 48, width: 4, height: 4 },
  { id: 'lpants_bottom', label: 'L Pants · Bottom', bodyPart: 'left_leg', layer: 'overlay', x: 8,  y: 48, width: 4, height: 4 },
  { id: 'lpants_right',  label: 'L Pants · Right',  bodyPart: 'left_leg', layer: 'overlay', x: 0,  y: 52, width: 4, height: 12 },
  { id: 'lpants_front',  label: 'L Pants · Front',  bodyPart: 'left_leg', layer: 'overlay', x: 4,  y: 52, width: 4, height: 12 },
  { id: 'lpants_left',   label: 'L Pants · Left',   bodyPart: 'left_leg', layer: 'overlay', x: 8,  y: 52, width: 4, height: 12 },
  { id: 'lpants_back',   label: 'L Pants · Back',   bodyPart: 'left_leg', layer: 'overlay', x: 12, y: 52, width: 4, height: 12 },
];

/** Steve (Classic) layout — 4px arms */
export const SKIN_REGIONS_STEVE: SkinRegion[] = [
  ...HEAD_BASE, ...HEAD_OVERLAY,
  ...BODY_BASE, ...BODY_OVERLAY,
  ...RARM_STEVE_BASE, ...RARM_STEVE_OVERLAY,
  ...LARM_STEVE_BASE, ...LARM_STEVE_OVERLAY,
  ...RLEG_BASE, ...RLEG_OVERLAY,
  ...LLEG_BASE, ...LLEG_OVERLAY,
];

/** Alex (Slim) layout — 3px arms */
export const SKIN_REGIONS_ALEX: SkinRegion[] = [
  ...HEAD_BASE, ...HEAD_OVERLAY,
  ...BODY_BASE, ...BODY_OVERLAY,
  ...RARM_ALEX_BASE, ...RARM_ALEX_OVERLAY,
  ...LARM_ALEX_BASE, ...LARM_ALEX_OVERLAY,
  ...RLEG_BASE, ...RLEG_OVERLAY,
  ...LLEG_BASE, ...LLEG_OVERLAY,
];

/** @deprecated use SKIN_REGIONS_STEVE or SKIN_REGIONS_ALEX */
export const SKIN_REGIONS = SKIN_REGIONS_STEVE;