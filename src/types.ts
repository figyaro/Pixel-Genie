export type Tool = 'pencil' | 'eraser' | 'bucket' | 'picker' | 'hand' | 'select' | 'magic-cut';

export interface Layer {
  id: string;
  name: string;
  grid: (string | null)[][];
  visible: boolean;
}

export interface PixelArtState {
  layers: Layer[];
  resolution: number;
  activeLayerId: string;
}

export const RESOLUTIONS = [16, 32, 64, 128];

export const DEFAULT_PALETTE = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#808080', '#c0c0c0',
  '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
];
