/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ComparableBuilding {
  id: string;
  name: string;
  address: string;
  builtYear: number;
  floors: string;
  grossAreaSqm: number; // 연면적 (sqm)
  distanceMeters: number; // 해당 보험회관과의 거리
  useType: string; // 용도
  depositPerPyeong: number; // 평당 보증금 (만원)
  monthlyRentPerPyeong: number; // 평당 월세 (만원)
  maintenancePerPyeong: number; // 평당 관리비 (만원)
}

export interface InsuranceBuilding {
  id: string;
  name: string;
  city: string;
  address: string;
  coordinates: { x: number; y: number }; // For Korean map visualization (relative % coordinates)
  builtYear: number;
  floors: {
    underground: number;
    ground: number;
  };
  landAreaSqm: number; // 대지면적
  grossAreaSqm: number; // 연면적
  useType: string; // 주요 용도
  currentDepositPerPyeong: number; // 현재 평당 보증금 (만원)
  currentMonthlyRentPerPyeong: number; // 현재 평당 월세 (만원)
  currentMaintenancePerPyeong: number; // 현재 평당 관리비 (만원)
  occupancyRate: number; // 가동률 / 임대율 (%)
  comparables: ComparableBuilding[];
  description: string;
}

export interface FactorDetail {
  observedFactor: number;        // 관측 보정계수 (예: 1.050)
  recommendedFactor: number;     // 추천 보정계수 (예: 1.050)
  appliedFactor: number;         // 담당자 적용 보정계수
  sampleCount: number;           // 비교 건물 수 (고유 건물 수)
  q1?: number;                   // Q1 (25%)
  q3?: number;                   // Q3 (75%)
  iqrAmount?: number;            // IQR 금액 (Q3 - Q1)
  iqrRatioPercent?: number;      // IQR 비율 (%)
  isApplied?: boolean;           // 추천계수 적용 여부 (true = 적용, false = 미적용)
  appliedStatus?: "적용" | "미적용"; // 추천계수 적용 여부
  reason: string;                // 사유 (이유)
  hallGrossAreaSqm?: number;
  hallSizeCategory?: "대" | "중" | "소" | null;
  hallBuiltYear?: number;
  ageRangeStr?: string;          // e.g. "1990~2000년"
  baseGroupCount?: number;       // 기준군 건물 수
  baseGroupMedian?: number;      // 기준군 중앙값 (원/㎡)
  targetGroupCount?: number;     // 대상군 건물 수
  targetGroupMedian?: number;    // 대상군 중앙값 (원/㎡)
  formulaDescription?: string;   // 관측계수 산식 문구 (예: "13,125 ÷ 12,500 = 1.050")
  recommendationJudgment?: string; // 추천 적용 판정 문구
  confidenceLow?: number;        // 95% CI 하한 (호환용)
  confidenceHigh?: number;       // 95% CI 상한 (호환용)
  reliability?: "높음" | "보통" | "낮음" | "표본 부족" | "신뢰도 낮음" | "신뢰도 보통";
}

export interface BuildingAdjustmentConfig {
  baseRegionalRent: number;      // 지역 기준가격 (원/㎡)
  currentContractRent: number;   // 현재 계약가격 (원/㎡)
  zone: FactorDetail;
  size: FactorDetail;
  age: FactorDetail;
  adjustmentReason?: string;     // 담당자 수기조정 사유
}

export interface EstimatorConfig {
  locationWeight?: number; // legacy fallback
  ageWeight?: number;
  sizeWeight?: number;
  infraWeight?: number;
  brandWeight?: number;
}

export interface ValuationConfig {
  capRate: number;         // 환원이율 (%)
  vacancyRate: number;     // 예상 공실률 (%)
  operatingExpenses: number; // 영업경비 비율 (%)
  reconstructionUnitCost: number; // 신축 단가 (만원/㎡)
  depreciationRate: number; // 감가상각 누계율 (%)
  landUnitCostPerSqm: number; // 토지 평당/㎡ 공시지가 (만원)
}
