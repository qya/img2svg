export interface TraceOptions {
  binary: boolean;
  mode: 'spline' | 'polygon' | 'pixel';
  hierarchical: 'stacked' | 'cutout';
  cornerThreshold: number;
  lengthThreshold: number;
  maxIterations: number;
  spliceThreshold: number;
  filterSpeckle: number;
  colorPrecision: number;
  layerDifference: number;
  pathPrecision: number;
}

export const defaultOptions: TraceOptions = {
  binary: false,
  mode: 'spline',
  hierarchical: 'stacked',
  cornerThreshold: 60,
  lengthThreshold: 4.0,
  maxIterations: 10,
  spliceThreshold: 45,
  filterSpeckle: 4,
  colorPrecision: 6,
  layerDifference: 16,
  pathPrecision: 8,
};

export interface ConversionResult {
  svg: string;
  filename: string;
  width: number;
  height: number;
}

export type ConversionMode = 'direct' | 'webapp';

export type AppTheme = 'light' | 'dark' | 'system';

export interface ExtensionSettings {
  mode: ConversionMode;
  theme: AppTheme;
  options: TraceOptions;
  autoDownload: boolean;
}

export const defaultSettings: ExtensionSettings = {
  mode: 'direct',
  theme: 'system',
  options: defaultOptions,
  autoDownload: true,
};
