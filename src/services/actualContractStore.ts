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

/**
 * 회관별 지정 임대기준가(2026-Q1). 회관이 실제로 받고 있는 현행 임대료라
 * 계산 결과가 아니라 주어진 사실이다.
 *
 * 같은 다섯 숫자가 BuildingCalculationView · BuildingSummarySubView ·
 * QuarterComparisonSubView 에도 각각 복사돼 있었다. 네 벌이면 한 곳만 고쳐지고
 * 나머지는 남는다. 이 파일이 유일한 출처다 — 화면에서 다시 적지 말 것.
 */
export const DEFAULT_PREV_BASELINES: Record<string, number> = {
  dangsan: 14000,
  yeongdeungpo: 12700,
  busan: 8570,
  daegu: 5200,
  gwangju: 6200,
};

/**
 * 실거래 임대료(2025.4Q 부서 조사표). 담당자가 1단계 화면에서 고칠 수 있고
 * 고친 값은 localStorage 에 남는다. 지역 단위 조사값이라 서울 두 회관은 같다.
 */
const DEFAULT_ACTUAL_CONTRACT_RENTS: Record<string, number> = {
  dangsan: 13487,
  yeongdeungpo: 13487,
  busan: 9459,
  daegu: 5634,
  gwangju: 7077,
};

export function getActualContractStore(): Record<string, number> {
  // 브라우저 밖(테스트·서버)에서도 호출되므로 기본값으로 조용히 물러난다.
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_ACTUAL_CONTRACT_RENTS };
  }
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
  // 없는 회관이면 0. 예전에는 10,000 원을 돌려줘 근거 없는 값이 화면에 찍혔다.
  return DEFAULT_PREV_BASELINES[buildingId] ?? 0;
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
