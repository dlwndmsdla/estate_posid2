/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ActualContractData {
  buildingId: string;
  quarterLabel: string; // e.g. "2026-Q1"
  actualContractRent: number; // 원/㎡/월 (실계약단가)
  updatedAt?: string;
  updatedBy?: string;
}

const STORAGE_KEY = "opm_actual_contract_rents_v2";

// Standard default baselines for previous quarter (2026-Q1)
const DEFAULT_PREV_BASELINES: Record<string, number> = {
  dangsan: 14000,
  yeongdeungpo: 12700,
  busan: 8570,
  daegu: 5200,
  gwangju: 6200,
};

// Default actual contract rents (~95% of baseline)
const DEFAULT_ACTUAL_CONTRACT_RENTS: Record<string, number> = {
  dangsan: 13487,
  yeongdeungpo: 13487,
  busan: 9459,
  daegu: 5634,
  gwangju: 7077,
};

export function getActualContractStore(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ACTUAL_CONTRACT_RENTS, ...parsed };
    }
  } catch (e) {
    console.error("Failed to read actual contract store", e);
  }
  return { ...DEFAULT_ACTUAL_CONTRACT_RENTS };
}

export function saveActualContractRent(buildingId: string, value: number): void {
  try {
    const current = getActualContractStore();
    current[buildingId] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save actual contract rent", e);
  }
}

export function saveBatchActualContractRents(data: Record<string, number>): void {
  try {
    const current = getActualContractStore();
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save batch actual contract rents", e);
  }
}

export function getDefaultPrevBaseline(buildingId: string): number {
  return DEFAULT_PREV_BASELINES[buildingId] ?? 10000;
}

export function calculateConversionFactor(actualRent: number, baselineRent: number): {
  factor: number;       // ratio, e.g. 1.053
  percentage: string;  // e.g. "105.3%"
} {
  if (!actualRent || actualRent <= 0) {
    return { factor: 1.0, percentage: "100.0%" };
  }
  const ratio = baselineRent / actualRent;
  return {
    factor: Number(ratio.toFixed(3)),
    percentage: (ratio * 100).toFixed(1) + "%",
  };
}
