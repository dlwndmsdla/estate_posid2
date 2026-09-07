/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DatasetStatus = "uploaded" | "validated" | "calculated" | "confirmed" | "superseded";

export interface DatasetMetadata {
  datasetId: string; // e.g. "2026-Q1-V1"
  referenceYear: number;
  referenceQuarter: 1 | 2 | 3 | 4;
  version: number;
  status: DatasetStatus;
  originalFileName: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: number;
  fileHash: string;
  totalRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  duplicateRowCount: number;
  uniqueBuildingCount: number;
  notes: string;
  isArchived?: boolean;
  calculationVersion?: string;
  formulaVersion?: string;
  efficiencyRateVersion?: string;
  applicationVersion?: string;
}

export interface RawListing {
  id: string;
  datasetId: string;
  rowNumber: number;
  source: string;               // 데이터출처
  listingId: string;            // 매물ID
  crawledDate: string;          // 크롤링일자
  collectedDate?: string;
  confirmedDate?: string;
  transactionType?: string;
  region: string;               // 지역 (예: 서울, 부산, 대구, 광주)
  zone: string;                 // 권역 (예: 영등포·당산, 부산 중구, 대구 남구, 광주 서구)
  address: string;              // 주소
  roadAddress?: string;
  buildingName: string;         // 건물명
  primaryUse: string;           // 주용도
  completionYear: number;       // 준공연도
  builtYear?: number;
  grossArea: number;            // 연면적 (㎡)
  grossFloorAreaSqm?: number;
  leaseArea: number;            // 임대면적 (㎡)
  exclusiveArea: number;        // 전용면적 (㎡)
  exclusiveAreaSqm?: number;
  contractAreaSqm?: number;
  deposit: number;              // 보증금 (만원)
  depositTenThousandWon?: number;
  monthlyRent: number;          // 월임대료 (만원)
  monthlyRentTenThousandWon?: number;
  maintenanceFee: number;       // 관리비 (만원)
  maintenanceFeeTenThousandWon?: number;
  subwayDistance: number;       // 지하철거리 (m)
  distanceToHallMeters?: number;
  floor?: string | number;
  latitude?: number;
  longitude?: number;
  pnu?: string;
  groundFloors?: number;
  undergroundFloors?: number;
  parkingCount?: number;
  freeParking?: string;
  rentConversionRate?: number;
  buildingSizeCategory?: "small" | "medium" | "large";
  depositPerExclusiveSqmWon?: number;
  rentPerExclusiveSqmWon?: number;
  maintenancePerExclusiveSqmWon?: number;
  convertedRentPerExclusiveSqmWon?: number;
  rawRowData?: Record<string, any>;
}

export interface ListingValidation {
  isValid: boolean;
  errorCodes: string[];
  warningCodes: string[];
}

export interface ListingEligibility {
  validForContractConversion: boolean;
  validForRegionalBaseRent: boolean;
  validForZoneAdjustment: boolean;
  validForSizeAdjustment: boolean;
  validForAgeAdjustment: boolean;
  validForEfficiencyRateSample: boolean;
}

export interface CleanedListing extends RawListing {
  validation: ListingValidation;
  eligibility: ListingEligibility;
  rentPerExclusiveArea: number; // 전용면적당 월임대료 (원/㎡)
  depositPerSqm: number;        // 계약면적당 보증금 (원/㎡)
  maintenancePerSqm: number;    // 계약면적당 관리비 (원/㎡)
  isDuplicate: boolean;
  isOutlier: boolean;
  excludeFromCalculation: boolean;
  exclusionReason?: string;
}

export interface BuildingMedian {
  datasetId: string;
  buildingId: string;
  buildingName: string;
  normalizedAddress: string;
  region: string;
  zone: string;
  primaryUse: string;
  completionYear: number;
  grossArea: number;
  subwayDistance: number;
  validListingCount: number;
  buildingMedianRent: number;        // 계약면적당 임대료 중앙값 (원/㎡)
  buildingMedianDeposit: number;     // 계약면적당 보증금 중앙값 (원/㎡)
  buildingMedianMaintenance: number; // 계약면적당 관리비 중앙값 (원/㎡)
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

export interface CalculationResult {
  datasetId: string;
  buildingId: string;            // 회관 ID (예: "dangsan", "yeongdeungpo", "busan", "daegu", "gwangju")
  buildingName: string;
  region: string;
  zone: string;
  baseRegionalRent: number;      // R_기준 (원/㎡)
  currentContractRent: number;   // R_현재 (원/㎡)
  observedFactors: { zone: number; size: number; age: number; marketPolicy?: number; total: number };
  recommendedFactors: { zone: number; size: number; age: number; marketPolicy?: number; total: number };
  appliedFactors: { zone: number; size: number; age: number; marketPolicy?: number; total: number };
  zoneFactorDetail: FactorDetail;
  sizeFactorDetail: FactorDetail;
  ageFactorDetail: FactorDetail;
  recommendedRent: number;       // R_추천 (원/㎡)
  finalRent: number;             // R_최종 (원/㎡)
  adjustmentReason?: string;
  calculatedAt: string;
  calculationVersion: string;
  formulaVersion: string;
}

export interface ConfirmedValuation {
  datasetId: string;
  buildingId: string;
  baseRegionalRent: number;
  observedFactors: {
    zone: number;
    size: number;
    age: number;
    marketPolicy?: number;
  };
  recommendedFactors: {
    zone: number;
    size: number;
    age: number;
    marketPolicy?: number;
  };
  appliedFactors: {
    zone: number;
    size: number;
    age: number;
    marketPolicy?: number;
  };
  observedTotalFactor: number;
  recommendedTotalFactor: number;
  appliedTotalFactor: number;
  observedRent: number;
  recommendedRent: number;
  finalRent: number;
  adjustmentReason: string;
  confirmedBy: string;
  confirmedAt: string;
}

export interface QuarterComparison {
  currentDatasetId: string;
  previousDatasetId: string | null;
  currentQuarterLabel: string;   // e.g. "2026년 2분기"
  previousQuarterLabel: string;  // e.g. "2026년 1분기"
  metrics: {
    totalListings: { current: number; previous: number; change: number; percentChange: number };
    uniqueBuildings: { current: number; previous: number; change: number; percentChange: number };
    baseRegionalRent: { current: number; previous: number; change: number; percentChange: number };
    zoneFactor: { current: number; previous: number; change: number; percentChange: number };
    sizeFactor: { current: number; previous: number; change: number; percentChange: number };
    ageFactor: { current: number; previous: number; change: number; percentChange: number };
    recommendedRent: { current: number; previous: number; change: number; percentChange: number };
    finalRent: { current: number; previous: number; change: number; percentChange: number };
  };
}

export interface ColumnMappingRule {
  mappingName: string;
  mapping: Record<string, string>;
  updatedAt: string;
}

export interface RegionalConvertedListing {
  source: string;
  listingId: string;
  region: string;
  zone: string;
  buildingName?: string;
  roadAddress?: string;
  primaryUse?: string;
  exclusiveAreaSqm: number;

  rentPerExclusiveSqmWon: number;

  regionEfficiencyRate: number;
  zoneEfficiencyRate: number;

  rentPerContractSqmByRegionWon: number;
  rentPerContractSqmByZoneWon: number;

  /** 실제로 산정에 쓰인 전용률과 그 출처. 매물이 계약·전용면적을 모두 갖고 있으면 그 실측값이 최우선이다. */
  appliedEfficiencyRate: number;
  appliedRateSource: "매물실측" | "권역중앙값" | "지역중앙값";
  rentPerContractSqmAppliedWon: number;

  zoneRateFallbackUsed: boolean;
  zoneRateFallbackReason?: string;
}

export interface EfficiencyRateRow {
  categoryType: "전체" | "지역" | "권역";
  region: string;
  zone: string;
  sampleCount: number;
  efficiencyMean: number;
  efficiencyMedian: number;
  quantile25: number;
  quantile75: number;
  associatedHall?: string;
  isFallbackUsed?: boolean;
  fallbackReason?: string;
}

export interface EfficiencyRateTable {
  datasetId: string;
  isInitialDefaultUsed: boolean;
  versionNotice?: string;
  rows: EfficiencyRateRow[];
  overallMedian: number;
  regionMedians: Record<string, number>;
  zoneMedians: Record<string, number>;
}

export interface HallComparisonRow {
  hallName: string;
  region: string;
  zone: string;
  roadAddress: string;
  /** 회관 실거래 임대료. 담당자가 1단계에서 고친 값이 있으면 그것을 쓴다. */
  realTransactionRentWon: number;

  regionExclMedianRentWon: number;
  regionAppliedRate: number;
  regionListingsMedianRentWon: number;

  zoneExclMedianRentWon: number;
  zoneAppliedRate: number;
  isZoneFallback: boolean;
  zoneListingsMedianRentWon: number;
}

/**
 * 방법별 비교 섹션 — 분기 발송본 엑셀의 "방법2_유사군매칭"·"방법2_비교건물" 시트를 그대로 읽어 온다.
 * 사이트에서 다시 계산하지 않는다. 숫자의 출처를 엑셀 한 곳으로 유지하기 위해서다.
 */
export interface Method2TierRow {
  tier: string;              // "T1" | "T1+T2(기본15)" | "Top-30전체"
  sampleCount: number;
  askMedianWon: number | null;      // 호가 중앙값 (전용면적 기준)
  byNationalRateWon: number | null; // × 전국 전용률
  byRegionRateWon: number | null;   // × 지역 전용률
  byZoneRateWon: number | null;     // × 권역 전용률
  byCalibrationWon: number | null;  // × 보정계수 (기존 v6 방식)
}

export interface Method2HallRow {
  hallName: string;
  region: string;
  zone: string;
  grossAreaSqm: number | null;
  completionYear: number | null;

  currentRentWon: number | null;        // 현행 임대료 — 지금 적용 중인 계약 단가
  realTransactionRentWon: number | null; // 실거래 임대료 (기준선)
  realTransactionNote: string;           // 값에 붙은 단서 (예: 대구 이상값)
  roneZoneAverageWon: number | null;     // 방법4 R-ONE 권역 평균
  roneZoneLabel: string;
  method1CascadeWon: number | null;      // 방법1 캐스케이드

  tiers: Method2TierRow[];
  nationalRate: number | null;
  regionRate: number | null;
  zoneRate: number | null;
  zoneRateSource: string;
  calibrationFactor: number | null;

  method2RepresentativeWon: number | null; // 대표값 = 기본15 × 권역전용률
  method2LowWon: number | null;
  method2HighWon: number | null;

  measuredAreaRatio: string;   // "15/15" — 비교건물 중 연면적이 실측인 비율
  regionAreaCoverage: string;  // "120/135" — 지역 표본 전체의 연면적 커버리지
}

export interface Method2Candidate {
  hallName: string;
  rank: number;
  inDefault15: boolean;
  tier: string;
  similarity: number | null;
  buildingName: string;
  address: string;
  zone: string;
  grossAreaSqm: number | null;
  areaSource: string;   // "실측(대장)" | "중앙값 대체"
  buildingAgeYears: number | null;
  askRentPerExclusiveSqmWon: number | null;
}

export interface Method2SheetData {
  datasetId: string;
  halls: Method2HallRow[];
  candidates: Method2Candidate[];
}
