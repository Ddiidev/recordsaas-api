export type ExportFormat = "mp4" | "gif";
export type ExportResolution = "480p" | "576p" | "720p" | "1080p" | "2k";
export type ExportFps = 30 | 60;

export interface ExportSelection {
  format: ExportFormat;
  resolution: ExportResolution;
  fps: ExportFps;
}

export interface ExportCost {
  creditCostUnits: number;
  creditCostCredits: number;
}

export const FREE_MONTHLY_CREDITS_UNITS = 6;
export const ON_DEMAND_CREDITS_UNITS = 20;

const FREE_COST_UNITS: Record<ExportResolution, Record<ExportFps, number>> = {
  "480p": { 30: 0, 60: 1 },
  "576p": { 30: 0, 60: 1 },
  "720p": { 30: 2, 60: 2 },
  "1080p": { 30: 6, 60: 6 },
  "2k": { 30: 10, 60: 10 },
};

export function toCredits(units: number): number {
  return units / 2;
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return value === "mp4" || value === "gif";
}

export function isExportResolution(value: unknown): value is ExportResolution {
  return value === "480p" || value === "576p" || value === "720p" || value === "1080p" || value === "2k";
}

export function isExportFps(value: unknown): value is ExportFps {
  return value === 30 || value === 60;
}

export function normalizeExportSelection(input: Partial<ExportSelection> | null | undefined): ExportSelection {
  const source = input && typeof input === "object" ? input : {};

  return {
    format: isExportFormat(source.format) ? source.format : "mp4",
    resolution: isExportResolution(source.resolution) ? source.resolution : "720p",
    fps: isExportFps(source.fps) ? source.fps : 30,
  };
}

export function isFreeByLicense(license: { active: boolean }): boolean {
  return !license.active;
}

export function getCreditCostForSelection(selection: ExportSelection, isFree: boolean): ExportCost {
  if (!isFree) {
    return {
      creditCostUnits: 0,
      creditCostCredits: 0,
    };
  }

  const creditCostUnits = FREE_COST_UNITS[selection.resolution][selection.fps];

  return {
    creditCostUnits,
    creditCostCredits: toCredits(creditCostUnits),
  };
}
