export type SkinModel = 'steve' | 'alex';
export type SkinLayer = 'base' | 'overlay';

export type BodyPart =
  | 'head'
  | 'body'
  | 'right_arm'
  | 'left_arm'
  | 'right_leg'
  | 'left_leg';

export interface SkinRegion {
  id: string;
  label: string;
  bodyPart: BodyPart;
  layer: SkinLayer;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SkinInfo {
  model: SkinModel;
  hasOverlay: boolean;
}