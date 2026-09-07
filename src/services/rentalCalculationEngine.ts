/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import {
  RawListing,
  RegionalConvertedListing,
  EfficiencyRateRow,
  EfficiencyRateTable,
  BuildingMedian,
  HallComparisonRow,
  CalculationResult,
  FactorDetail,
} from "../types/dataset";
import { HALLS } from "./halls";
import { getActualContractStore } from "./actualContractStore";

export function safeFactor(
  numerator: number | null | undefined,
  denominator: number | null | undefined
): number {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  ) {
    return 1.0;
  }

  const factor = numerator / denominator;

  return Number.isFinite(factor) && factor > 0
    ? Number(factor.toFixed(3))
    : 1.0;
}

export function calculateIQRMSR(numbers: number[]): {
  median: number;
  q1: number;
  q3: number;
  iqrAmount: number;
  iqrRatioPercent: number;
} {
  const valid = (numbers || []).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (valid.length === 0) {
    return { median: 0, q1: 0, q3: 0, iqrAmount: 0, iqrRatioPercent: 0 };
  }

  const median = calculateMedian(valid);

  const getPercentile = (arr: number[], p: number) => {
    if (arr.length === 1) return arr[0];
    const index = (arr.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  };

  const q1 = Math.round(getPercentile(valid, 0.25));
  const q3 = Math.round(getPercentile(valid, 0.75));
  const iqrAmount = Math.max(0, q3 - q1);
  const iqrRatioPercent = median > 0 ? Number(((iqrAmount / median) * 100).toFixed(1)) : 0;

  return { median, q1, q3, iqrAmount, iqrRatioPercent };
}

export function evaluateFactorAdoption(
  count: number,
  iqrRatioPercent: number,
  observedFactor: number
): {
  recommendedFactor: number;
  isApplied: boolean;
  appliedStatus: "적용" | "미적용";
  reason: string;
} {
  const isCountOk = count >= 5;
  const isIqrOk = count > 2 && iqrRatioPercent <= 15;

  if (isCountOk && isIqrOk) {
    const reason =
      count >= 10
        ? "비교 건물 10개 이상이며 가격 분포가 안정적"
        : "비교 건물 5~9개이며 가격 분포가 허용 범위 이내";
    return {
      recommendedFactor: observedFactor,
      isApplied: true,
      appliedStatus: "적용",
      reason,
    };
  }

  let reason = "";
  if (count <= 2) {
    reason = "대표성을 확보하기 어려운 비교군";
  } else if (!isCountOk && !isIqrOk) {
    reason = "비교군 부족 및 가격 분산 과다";
  } else if (!isCountOk) {
    reason = "비교군 부족으로 대표성 미흡";
  } else if (!isIqrOk) {
    reason = "가격 분산이 커 대표성이 부족";
  }

  return {
    recommendedFactor: 1.000,
    isApplied: false,
    appliedStatus: "미적용",
    reason,
  };
}

/**
 * 1. Column Header Normalizer
 */
export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s/g, "")
    .replace(/㎡/g, "m2")
    .replace(/[()_]/g, "")
    .toLowerCase();
}

/**
 * Statistics Helpers
 */
export function calculateMedian(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].filter((n) => !isNaN(n) && isFinite(n) && n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateQuantile(numbers: number[], q: number): number {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].filter((n) => !isNaN(n) && isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

import {
  HEADER_ALIASES,
  findColumnIndexWithPriority,
  parseNumber,
  classifyBuildingSize,
  calculateDerivedValues,
} from "./excelEngine";

/**
 * 2. Parse Uploaded Excel Workbook (Sheet "통합데이터")
 */
export function parseRentalWorkbook(
  workbook: XLSX.WorkBook,
  datasetId: string
): {
  rawListings: RawListing[];
  unmappedColumns: string[];
  totalRowCount: number;
} {
  const sheetName = workbook.SheetNames.find((s) => s.trim() === "통합데이터") || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("'통합데이터' 시트를 찾을 수 없습니다.");
  }

  // Read array of arrays with header row at index 1 (Row 2 in Excel)
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (!rows || rows.length < 2) {
    throw new Error("엑셀 파일에 데이터가 존재하지 않거나 2행 헤더가 없습니다.");
  }

  const rawHeaderRow = rows[1] || [];
  const normalizedHeaders = rawHeaderRow.map((col: any) => normalizeHeader(col));

  const colIndices: Record<string, number> = {};
  Object.entries(HEADER_ALIASES).forEach(([key, aliases]) => {
    colIndices[key] = findColumnIndexWithPriority(normalizedHeaders, aliases);
  });

  const dataRows = rows.slice(2);
  const rawListings: RawListing[] = [];

  dataRows.forEach((row, idx) => {
    if (!row || row.every((val) => val === null || val === "")) return;

    const parseVal = (key: string) => {
      const i = colIndices[key];
      return i !== undefined && i >= 0 && row[i] !== undefined ? row[i] : null;
    };

    const rawSourceVal = String(parseVal("source") || "").trim();
    let source = "기타";
    if (/알스퀘어|rsquare|r스퀘어/i.test(rawSourceVal)) {
      source = "알스퀘어";
    } else if (/네모|nemo/i.test(rawSourceVal)) {
      source = "네모";
    } else if (rawSourceVal) {
      source = rawSourceVal;
    }

    const listingId = String(parseVal("listingId") || `RAW-${idx + 1}`).trim();
    const region = String(parseVal("region") || "").trim();
    const zone = String(parseVal("zone") || "").trim();
    const roadAddress = String(parseVal("roadAddress") || "").trim();
    const buildingName = String(parseVal("buildingName") || "미지정 건물").trim();
    const primaryUse = String(parseVal("primaryUse") || "업무시설").trim();

    const depositTenThousandWon = parseNumber(parseVal("depositTenThousandWon")) ?? 0;
    const monthlyRentTenThousandWon = parseNumber(parseVal("monthlyRentTenThousandWon")) ?? 0;
    const maintenanceFeeTenThousandWon = parseNumber(parseVal("maintenanceFeeTenThousandWon")) ?? 0;
    const exclusiveAreaSqm = parseNumber(parseVal("exclusiveAreaSqm")) ?? 0;
    const grossFloorAreaSqm = parseNumber(parseVal("grossFloorAreaSqm")) ?? 0;
    const builtYearRaw = parseNumber(parseVal("builtYear"));
    const builtYear = builtYearRaw ? Math.round(builtYearRaw) : 2005;

    let conversionRate = parseNumber(parseVal("rentConversionRate")) ?? 0.056;
    if (conversionRate > 1) conversionRate /= 100;
    if (conversionRate <= 0) conversionRate = 0.056;

    const sizeCat = classifyBuildingSize(grossFloorAreaSqm);
    const buildingSizeCategory: "small" | "medium" | "large" =
      sizeCat === "대" ? "large" : sizeCat === "중" ? "medium" : "small";

    const derived = calculateDerivedValues({
      exclusiveAreaSqm,
      depositTenThousandWon,
      monthlyRentTenThousandWon,
      maintenanceFeeTenThousandWon,
      rentConversionRate: conversionRate,
    });

    const collectedDate = String(parseVal("collectedDate") || "").trim();
    const confirmedDate = String(parseVal("listingConfirmedDate") || "").trim();
    const distanceToHallMeters = parseNumber(parseVal("distanceToHallMeters")) ?? 500;

    const rawItem: RawListing = {
      id: `${datasetId}-raw-${idx + 1}`,
      datasetId,
      rowNumber: idx + 1,
      source,
      collectedDate,
      confirmedDate,
      crawledDate: collectedDate,
      listingId,
      transactionType: String(parseVal("transactionType") || "임대").trim(),
      region,
      zone,
      roadAddress,
      address: roadAddress,
      buildingName,
      primaryUse,
      completionYear: builtYear,
      builtYear,
      grossArea: grossFloorAreaSqm,
      grossFloorAreaSqm,
      leaseArea: exclusiveAreaSqm,
      exclusiveArea: exclusiveAreaSqm,
      exclusiveAreaSqm,
      deposit: depositTenThousandWon,
      depositTenThousandWon,
      monthlyRent: monthlyRentTenThousandWon,
      monthlyRentTenThousandWon,
      maintenanceFee: maintenanceFeeTenThousandWon,
      maintenanceFeeTenThousandWon,
      subwayDistance: distanceToHallMeters,
      distanceToHallMeters,
      floor: parseVal("listingFloor") || "",
      latitude: parseNumber(parseVal("latitude")) ?? 0,
      longitude: parseNumber(parseVal("longitude")) ?? 0,
      pnu: String(parseVal("pnu") || "").trim(),
      groundFloors: parseNumber(parseVal("groundFloorCount")) ?? 0,
      undergroundFloors: parseNumber(parseVal("undergroundFloorCount")) ?? 0,
      parkingCount: parseNumber(parseVal("parkingCapacity")) ?? 0,
      freeParking: String(parseVal("freeParkingStatus") || "").trim(),
      rentConversionRate: conversionRate,
      buildingSizeCategory,

      depositPerExclusiveSqmWon: derived.depositPerExclusiveSqmWon ?? 0,
      rentPerExclusiveSqmWon: derived.rentPerExclusiveSqmWon ?? 0,
      maintenancePerExclusiveSqmWon: derived.maintenancePerExclusiveSqmWon ?? 0,
      convertedRentPerExclusiveSqmWon: derived.convertedRentPerExclusiveSqmWon ?? 0,

      rawRowData: row,
    };

    validateAndCalculateRawListing(rawItem);
    rawListings.push(rawItem);
  });

  return {
    rawListings,
    unmappedColumns: [],
    totalRowCount: rawListings.length,
  };
}

/**
 * 3. Unit Price Recalculation & Validation (`validateListing`)
 */
export function validateAndCalculateRawListing(listing: RawListing): void {
  const exclusive = listing.exclusiveAreaSqm;
  if (exclusive > 0) {
    listing.depositPerExclusiveSqmWon = Math.round(
      (listing.depositTenThousandWon * 10000) / exclusive
    );
    listing.rentPerExclusiveSqmWon = Math.round(
      (listing.monthlyRentTenThousandWon * 10000) / exclusive
    );
    listing.maintenancePerExclusiveSqmWon = Math.round(
      ((listing.maintenanceFeeTenThousandWon || 0) * 10000) / exclusive
    );

    const convRate = listing.rentConversionRate || 0.056;
    const depositConvertedRent = (listing.depositTenThousandWon * 10000 * convRate) / 12 / exclusive;
    listing.convertedRentPerExclusiveSqmWon = Math.round(
      listing.rentPerExclusiveSqmWon + depositConvertedRent
    );
  } else {
    listing.depositPerExclusiveSqmWon = 0;
    listing.rentPerExclusiveSqmWon = 0;
    listing.maintenancePerExclusiveSqmWon = 0;
    listing.convertedRentPerExclusiveSqmWon = 0;
  }
}

/**
 * 4. RSquare Efficiency Rate Calculation (`calculateEfficiencyRate`)
 */
export function calculateEfficiencyRate(listing: RawListing): number | null {
  if (listing.source !== "알스퀘어") return null;
  if (!listing.contractAreaSqm || listing.contractAreaSqm <= 0) return null;
  if (!listing.exclusiveAreaSqm || listing.exclusiveAreaSqm <= 0) return null;
  if (listing.exclusiveAreaSqm > listing.contractAreaSqm) return null;

  const rate = listing.exclusiveAreaSqm / listing.contractAreaSqm;
  if (rate < 0.2 || rate > 0.95) return null;
  return rate;
}

/**
 * Initial Default Efficiency Rates (Section 9)
 */
export const INITIAL_DEFAULT_EFFICIENCY_RATES = {
  overall: { median: 0.62, sampleCount: 908 },
  regions: {
    서울: { median: 0.506, sampleCount: 150 },
    부산: { median: 0.635, sampleCount: 332 },
    대구: { median: 0.622, sampleCount: 236 },
    광주: { median: 0.688, sampleCount: 190 },
  } as Record<string, { median: number; sampleCount: number }>,
  zones: {
    "서울/당산_문래": { median: 0.55, sampleCount: 31 },
    "서울/여의도": { median: 0.504, sampleCount: 115 },
    "서울/영등포": { median: 0.506, sampleCount: 4, fallbackUsed: true },
    "부산/중구_남포중앙동": { median: 0.598, sampleCount: 107 },
    "부산/부산진구_서면": { median: 0.658, sampleCount: 121 },
    "부산/연제구_시청": { median: 0.642, sampleCount: 62 },
    "부산/동구_부산역": { median: 0.635, sampleCount: 42 },
    "대구/중구남구_도심": { median: 0.574, sampleCount: 82 },
    "대구/달서구_성서": { median: 0.907, sampleCount: 6 },
    "대구/동구_동대구로": { median: 0.659, sampleCount: 52 },
    "대구/수성구_동대구": { median: 0.622, sampleCount: 96 },
    "광주/서구_상무": { median: 0.651, sampleCount: 70 },
    "광주/동구_금남로": { median: 0.7, sampleCount: 120 },
  } as Record<string, { median: number; sampleCount: number; fallbackUsed?: boolean }>,
};

/**
 * 5. Build RSquare Efficiency Rate Table (`buildEfficiencyRateTable`)
 */
export function buildEfficiencyRateTable(
  rawListings: RawListing[],
  datasetId: string
): EfficiencyRateTable {
  // Filter valid RSquare listings
  const validRSquareListings = rawListings.filter((l) => {
    const rate = calculateEfficiencyRate(l);
    return rate !== null;
  });

  const isInitialDefaultUsed = validRSquareListings.length === 0;

  if (isInitialDefaultUsed) {
    // Generate Table using Initial Default Rates
    const rows: EfficiencyRateRow[] = [];

    // 1) Overall
    rows.push({
      categoryType: "전체",
      region: "전국",
      zone: "전체",
      sampleCount: INITIAL_DEFAULT_EFFICIENCY_RATES.overall.sampleCount,
      efficiencyMean: 0.62,
      efficiencyMedian: INITIAL_DEFAULT_EFFICIENCY_RATES.overall.median,
      quantile25: 0.55,
      quantile75: 0.68,
      associatedHall: "-",
    });

    // 2) Regional
    Object.entries(INITIAL_DEFAULT_EFFICIENCY_RATES.regions).forEach(([reg, val]) => {
      rows.push({
        categoryType: "지역",
        region: reg,
        zone: `${reg} 전체`,
        sampleCount: val.sampleCount,
        efficiencyMean: val.median,
        efficiencyMedian: val.median,
        quantile25: Math.round((val.median - 0.05) * 1000) / 1000,
        quantile75: Math.round((val.median + 0.05) * 1000) / 1000,
        associatedHall: "-",
      });
    });

    // 3) Zones
    const hallMap: Record<string, string> = {
      "서울/영등포": "서울회관",
      "서울/당산_문래": "당산회관",
      "부산/중구_남포중앙동": "부산회관",
      "대구/중구남구_도심": "대구회관",
      "광주/서구_상무": "광주회관",
    };

    Object.entries(INITIAL_DEFAULT_EFFICIENCY_RATES.zones).forEach(([key, val]) => {
      const [reg, zName] = key.split("/");
      rows.push({
        categoryType: "권역",
        region: reg,
        zone: zName,
        sampleCount: val.sampleCount,
        efficiencyMean: val.median,
        efficiencyMedian: val.median,
        quantile25: Math.round((val.median - 0.04) * 1000) / 1000,
        quantile75: Math.round((val.median + 0.04) * 1000) / 1000,
        associatedHall: hallMap[key] || "-",
        isFallbackUsed: val.fallbackUsed || val.sampleCount < 5,
        fallbackReason:
          val.fallbackUsed || val.sampleCount < 5
            ? "권역 표본 부족 (5건 미만) → 지역 전용률 적용"
            : undefined,
      });
    });

    const regionMedians: Record<string, number> = {};
    Object.entries(INITIAL_DEFAULT_EFFICIENCY_RATES.regions).forEach(([k, v]) => {
      regionMedians[k] = v.median;
    });

    const zoneMedians: Record<string, number> = {};
    Object.entries(INITIAL_DEFAULT_EFFICIENCY_RATES.zones).forEach(([k, v]) => {
      const [, zName] = k.split("/");
      zoneMedians[zName] = v.median;
    });

    return {
      datasetId,
      isInitialDefaultUsed: true,
      versionNotice: "업로드 파일에 알스퀘어 계약면적이 없어 저장된 초기 전용률 기준을 적용했습니다.",
      rows,
      overallMedian: INITIAL_DEFAULT_EFFICIENCY_RATES.overall.median,
      regionMedians,
      zoneMedians,
    };
  }

  // Calculate fresh efficiency table from uploaded RSquare listings
  const ratesWithListing = validRSquareListings.map((l) => ({
    listing: l,
    rate: calculateEfficiencyRate(l)!,
  }));

  const allRates = ratesWithListing.map((r) => r.rate);
  const overallMedian = calculateMedian(allRates);

  const rows: EfficiencyRateRow[] = [];

  // 1) Overall
  rows.push({
    categoryType: "전체",
    region: "전국",
    zone: "전체",
    sampleCount: allRates.length,
    efficiencyMean: Math.round((allRates.reduce((a, b) => a + b, 0) / allRates.length) * 1000) / 1000,
    efficiencyMedian: Math.round(overallMedian * 1000) / 1000,
    quantile25: Math.round(calculateQuantile(allRates, 0.25) * 1000) / 1000,
    quantile75: Math.round(calculateQuantile(allRates, 0.75) * 1000) / 1000,
    associatedHall: "-",
  });

  // Group by Region
  const regionMap = new Map<string, number[]>();
  ratesWithListing.forEach(({ listing, rate }) => {
    const list = regionMap.get(listing.region) || [];
    list.push(rate);
    regionMap.set(listing.region, list);
  });

  const regionMedians: Record<string, number> = {};
  regionMap.forEach((rates, reg) => {
    const med = calculateMedian(rates);
    regionMedians[reg] = Math.round(med * 1000) / 1000;
    rows.push({
      categoryType: "지역",
      region: reg,
      zone: `${reg} 전체`,
      sampleCount: rates.length,
      efficiencyMean: Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 1000,
      efficiencyMedian: Math.round(med * 1000) / 1000,
      quantile25: Math.round(calculateQuantile(rates, 0.25) * 1000) / 1000,
      quantile75: Math.round(calculateQuantile(rates, 0.75) * 1000) / 1000,
      associatedHall: "-",
    });
  });

  // Group by Zone
  const zoneGroupMap = new Map<string, { region: string; zone: string; rates: number[] }>();
  ratesWithListing.forEach(({ listing, rate }) => {
    const key = `${listing.region}/${listing.zone}`;
    if (!zoneGroupMap.has(key)) {
      zoneGroupMap.set(key, { region: listing.region, zone: listing.zone, rates: [] });
    }
    zoneGroupMap.get(key)!.rates.push(rate);
  });

  const hallZoneMatch: Record<string, string> = {
    "서울/영등포": "서울회관",
    "서울/당산_문래": "당산회관",
    "부산/중구_남포중앙동": "부산회관",
    "대구/중구남구_도심": "대구회관",
    "광주/서구_상무": "광주회관",
  };

  const zoneMedians: Record<string, number> = {};
  zoneGroupMap.forEach((val, key) => {
    const isSampleLow = val.rates.length < 5;
    const rawZoneMed = calculateMedian(val.rates);
    const regMed = regionMedians[val.region] || overallMedian;
    const finalZoneMed = isSampleLow ? regMed : rawZoneMed;

    zoneMedians[val.zone] = Math.round(finalZoneMed * 1000) / 1000;

    rows.push({
      categoryType: "권역",
      region: val.region,
      zone: val.zone,
      sampleCount: val.rates.length,
      efficiencyMean: Math.round((val.rates.reduce((a, b) => a + b, 0) / val.rates.length) * 1000) / 1000,
      efficiencyMedian: Math.round(rawZoneMed * 1000) / 1000,
      quantile25: Math.round(calculateQuantile(val.rates, 0.25) * 1000) / 1000,
      quantile75: Math.round(calculateQuantile(val.rates, 0.75) * 1000) / 1000,
      associatedHall: hallZoneMatch[key] || "-",
      isFallbackUsed: isSampleLow,
      fallbackReason: isSampleLow ? "권역 표본 부족 (5건 미만) → 지역 전용률 적용" : undefined,
    });
  });

  return {
    datasetId,
    isInitialDefaultUsed: false,
    rows,
    overallMedian: Math.round(overallMedian * 1000) / 1000,
    regionMedians,
    zoneMedians,
  };
}

/**
 * Resolvers
 */
export function resolveRegionEfficiencyRate(
  region: string,
  table: EfficiencyRateTable
): number {
  if (table.regionMedians[region]) return table.regionMedians[region];
  const found = table.rows.find((r) => r.categoryType === "지역" && r.region === region);
  if (found) return found.efficiencyMedian;
  return table.overallMedian || 0.62;
}

export function resolveZoneEfficiencyRate(
  region: string,
  zone: string,
  table: EfficiencyRateTable
): { rate: number; fallbackUsed: boolean; fallbackReason?: string } {
  const normZone = zone.replace(/\s+/g, "");
  const foundZone = table.rows.find(
    (r) => r.categoryType === "권역" && r.region === region && (r.zone === zone || r.zone.replace(/\s+/g, "") === normZone)
  );

  if (foundZone && !foundZone.isFallbackUsed && foundZone.sampleCount >= 5) {
    return {
      rate: foundZone.efficiencyMedian,
      fallbackUsed: false,
    };
  }

  // Fallback to region efficiency rate
  const regRate = resolveRegionEfficiencyRate(region, table);
  return {
    rate: regRate,
    fallbackUsed: true,
    fallbackReason: foundZone
      ? `권역 표본 부족 (${foundZone.sampleCount}건) → 지역 전용률 적용`
      : "권역 표본 미존재 → 지역 전용률 적용",
  };
}

/**
 * 6. Full Listing Contract Conversion (`buildRegionalConvertedListings`)
 */
export function buildRegionalConvertedListings(
  rawListings: RawListing[],
  table: EfficiencyRateTable
): RegionalConvertedListing[] {
  return rawListings.map((l) => {
    const rentExcl = l.rentPerExclusiveSqmWon || 0;
    const regRate = resolveRegionEfficiencyRate(l.region, table);
    const { rate: zoneRate, fallbackUsed, fallbackReason } = resolveZoneEfficiencyRate(
      l.region,
      l.zone,
      table
    );

    const rentContractByRegion = Math.round(rentExcl * regRate);
    const rentContractByZone = Math.round(rentExcl * zoneRate);

    // 실제로 쓸 전용률: 이 매물의 계약·전용면적이 둘 다 있으면 그 매물의 실측값이 최우선이다.
    // (전용률 기준 관리 화면이 안내하는 우선순위 1순위 — 2026-09-07 이전에는 안내와 달리
    //  권역 중앙값만 곱하고 있었다. 이 표본에서 실측값 보유 매물이 765/1,117건이고 실측값과
    //  권역 중앙값의 차이가 중앙 11%·4건 중 1건은 20%를 넘어, 상수로 바꿔치기하면 결과가
    //  회관 단위로 최대 10%까지 밀렸다. 전용률과 전용단가의 상관이 -0.32라 오차가 중앙값에서
    //  상쇄되지도 않는다 — 전용률이 낮은 건물일수록 전용면적당 호가를 높게 부르기 때문이다.)
    const ownRate = calculateEfficiencyRate(l);
    const appliedRate = ownRate ?? zoneRate;
    const appliedRateSource: RegionalConvertedListing["appliedRateSource"] = ownRate
      ? "매물실측"
      : fallbackUsed
        ? "지역중앙값"
        : "권역중앙값";

    return {
      appliedEfficiencyRate: appliedRate,
      appliedRateSource,
      rentPerContractSqmAppliedWon: Math.round(rentExcl * appliedRate),
      source: l.source,
      listingId: l.listingId,
      region: l.region,
      zone: l.zone,
      buildingName: l.buildingName,
      roadAddress: l.roadAddress,
      primaryUse: l.primaryUse,
      exclusiveAreaSqm: l.exclusiveAreaSqm,
      rentPerExclusiveSqmWon: rentExcl,
      regionEfficiencyRate: regRate,
      zoneEfficiencyRate: zoneRate,
      rentPerContractSqmByRegionWon: rentContractByRegion,
      rentPerContractSqmByZoneWon: rentContractByZone,
      zoneRateFallbackUsed: fallbackUsed,
      zoneRateFallbackReason: fallbackReason,
    };
  });
}

/**
 * 7. Building Deduplication & Median Aggregation (`aggregateBuildingMedians`)
 */
export function aggregateBuildingMedians(
  convertedListings: RegionalConvertedListing[],
  rawListings: RawListing[],
  datasetId: string
): BuildingMedian[] {
  const buildingMap = new Map<
    string,
    {
      listingIds: string[];
      buildingName: string;
      roadAddress: string;
      region: string;
      zone: string;
      primaryUse: string;
      completionYear: number;
      grossArea: number;
      regionRents: number[];
      zoneRents: number[];
      appliedRents: number[];
      rawItems: RawListing[];
    }
  >();

  convertedListings.forEach((cl) => {
    // 못 찾으면 undefined로 둔다. 예전에는 rawListings[0]을 갖다 썼는데, 그러면 전혀 다른
    // 건물의 PNU·연면적·준공연도가 이 매물에 붙어 조용히 잘못된 건물로 묶인다.
    const raw = rawListings.find((r) => r.listingId === cl.listingId);
    
    // Key priority: 1) PNU, 2) RoadAddress + BuildingName, 3) BuildingName
    let bKey = "";
    if (raw?.pnu && raw.pnu.length >= 8) {
      bKey = `PNU_${raw.pnu}`;
    } else if (cl.roadAddress && cl.buildingName) {
      bKey = `${cl.roadAddress.replace(/\s+/g, "")}_${cl.buildingName.replace(/\s+/g, "")}`;
    } else {
      bKey = `${cl.region}_${cl.zone}_${cl.buildingName?.replace(/\s+/g, "") || "UNKNOWN"}`;
    }

    if (!buildingMap.has(bKey)) {
      buildingMap.set(bKey, {
        listingIds: [],
        buildingName: cl.buildingName || "미지정 건물",
        roadAddress: cl.roadAddress || "",
        region: cl.region,
        zone: cl.zone,
        primaryUse: cl.primaryUse || raw?.primaryUse || "업무시설",
        // 준공연도가 없으면 0으로 둔다(연식군 필터가 0을 제외한다). 기본값 2005는 없는 값을
        // 지어내는 것이고, 2000~2010년 준공 회관(대구 2003·광주 2009)의 연식 비교군에
        // 결측 건물을 통째로 섞어 넣는다.
        // ⚠ 다만 지금은 방어선일 뿐 실효가 없다 — 파서(excelEngine.ts)와
        //   parseListingsFromWorkbook이 이미 결측 준공연도를 2005로 채워서 넘기기 때문이다.
        //   원점을 고치려면 그 두 곳을 함께 손봐야 한다. 현재 분기 데이터는 준공연도
        //   결측이 0건이라 실제 왜곡은 발생하지 않는다.
        completionYear:
          Number.isFinite(raw?.builtYear) && (raw?.builtYear ?? 0) > 0 ? (raw!.builtYear as number) : 0,
        grossArea: raw?.grossFloorAreaSqm || 0,
        regionRents: [],
        zoneRents: [],
        appliedRents: [],
        rawItems: [],
      });
    }

    const bObj = buildingMap.get(bKey)!;
    bObj.listingIds.push(cl.listingId);
    bObj.regionRents.push(cl.rentPerContractSqmByRegionWon);
    bObj.zoneRents.push(cl.rentPerContractSqmByZoneWon);
    bObj.appliedRents.push(cl.rentPerContractSqmAppliedWon);
    if (raw) bObj.rawItems.push(raw);
  });

  const buildingMedians: BuildingMedian[] = [];
  let bIdx = 1;

  buildingMap.forEach((val, bKey) => {
    const medRegionRent = Math.round(calculateMedian(val.regionRents));
    const medZoneRent = Math.round(calculateMedian(val.zoneRents));
    // 산정에 쓰는 값은 매물 실측 전용률을 우선 적용한 단가다(위 두 개는 화면 비교용).
    const medAppliedRent = Math.round(calculateMedian(val.appliedRents));

    // Calculate median deposit/maintenance from raw items
    const deposits = val.rawItems.map((r) => r.depositTenThousandWon * 10000);
    const maints = val.rawItems.map((r) => (r.maintenanceFeeTenThousandWon || 0) * 10000);

    buildingMedians.push({
      datasetId,
      buildingId: `BLD-${bIdx++}`,
      buildingName: val.buildingName,
      normalizedAddress: val.roadAddress,
      region: val.region,
      zone: val.zone,
      primaryUse: val.primaryUse,
      completionYear: val.completionYear,
      grossArea: val.grossArea,
      subwayDistance: val.rawItems[0]?.distanceToHallMeters || 500,
      validListingCount: val.listingIds.length,
      buildingMedianRent: medAppliedRent,
      buildingMedianDeposit: Math.round(calculateMedian(deposits)),
      buildingMedianMaintenance: Math.round(calculateMedian(maints)),
    });
  });

  return buildingMedians;
}

/**
 * 8. Hall Comparison Table (`calculateHallComparison`)
 */
export function calculateHallComparison(
  efficiencyTable: EfficiencyRateTable,
  convertedListings: RegionalConvertedListing[]
): HallComparisonRow[] {
  // 회관 실거래 임대료는 담당자가 고칠 수 있는 값이라 저장소에서 읽는다.
  // 예전에는 이 함수 안에 회관 4곳이 주소·실거래가와 함께 통째로 다시 적혀 있었다.
  const actualRents = getActualContractStore();

  return HALLS.map((hall) => {
    const regRate = resolveRegionEfficiencyRate(hall.region, efficiencyTable);
    const { rate: zoneRate, fallbackUsed: zoneFallback } = resolveZoneEfficiencyRate(
      hall.region,
      hall.zone,
      efficiencyTable
    );

    // 업로드된 매물에서 직접 집계한다. 예전엔 회관별 중앙값이 상수로 박혀 있어
    // 어떤 파일을 올려도 이 표가 같은 숫자를 보여 줬다.
    const regionListings = convertedListings.filter((c) => c.region === hall.region);
    const zoneListings = convertedListings.filter(
      (c) => c.region === hall.region && c.zone === hall.zone
    );

    const regionExclMedianRentWon = Math.round(
      calculateMedian(regionListings.map((c) => c.rentPerExclusiveSqmWon))
    );
    const zoneExclMedianRentWon = Math.round(
      calculateMedian(zoneListings.map((c) => c.rentPerExclusiveSqmWon))
    );

    const regionListingsMedianRentWon = Math.round(
      calculateMedian(regionListings.map((c) => c.rentPerContractSqmByRegionWon))
    );
    const zoneListingsMedianRentWon = Math.round(
      calculateMedian(zoneListings.map((c) => c.rentPerContractSqmByZoneWon))
    );

    return {
      hallName: hall.buildingName,
      region: hall.region,
      zone: hall.zone,
      roadAddress: hall.roadAddress,
      realTransactionRentWon: actualRents[hall.buildingId] ?? 0,

      regionExclMedianRentWon,
      regionAppliedRate: regRate,
      regionListingsMedianRentWon,

      zoneExclMedianRentWon,
      zoneAppliedRate: zoneRate,
      isZoneFallback: zoneFallback,
      zoneListingsMedianRentWon,
    };
  });
}

/**
 * 9. Valuation & Adjustment Factors Calculation (`calculateAdjustmentFactors`)
 *
 * 업로드된 데이터셋의 건물별 중앙값에서 회관별 산정 결과를 계산한다.
 *
 * 캐스케이드: 지역 기준단가 × K권역 × K규모 × K연식
 *   ① 권역 = 회관 권역 건물 중앙값 ÷ 지역 건물 중앙값
 *   ② 규모 = 권역 ∩ 동일 규모군 중앙값 ÷ 권역 중앙값
 *   ③ 연식 = 규모군 ∩ 준공 ±5년 중앙값 ÷ 규모군 중앙값
 *
 * 각 단계는 게이트(표본 ≥ 5건 AND IQR ÷ 중앙값 ≤ 15%)를 통과해야 관측계수를
 * 적용하고, 못 넘으면 중립값 1.000 을 쓴다. 표본이 적거나 값이 흩어진 비교군이
 * 계수를 흔드는 것을 막기 위한 장치로, 2026-07-28 방법비교에서 MAPE 4.2% 로
 * 1위였던 로직 그대로다(`260728_방법비교_계산.py` 의 `gate`).
 */

/**
 * 회관 명단 — 실제 값은 services/halls.ts 한 곳에만 있다.
 * 산정 코드가 오래 쓰던 이름이라 여기서 다시 내보내기만 한다.
 */
export const HALL_SPECS = HALLS;

/** 게이트 기준 — 표본 하한과 흩어짐 상한. */
const FACTOR_MIN_SAMPLES = 5;
const FACTOR_MAX_IQR_RATIO_PERCENT = 15;

/** 연식 비교군 폭(준공연도 ± 이 값). */
const AGE_BAND_YEARS = 5;

/** numpy `np.percentile` 과 같은 선형보간 분위수. */
function percentileOf(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

interface GroupStats {
  count: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  /** IQR ÷ 중앙값 × 100. 중앙값이 0이면 판정 불가라 무한대로 둔다. */
  iqrRatioPercent: number;
}

function statsOf(group: BuildingMedian[]): GroupStats {
  const rents = group.map((b) => b.buildingMedianRent).filter((r) => Number.isFinite(r));
  const median = percentileOf(rents, 0.5);
  const q1 = percentileOf(rents, 0.25);
  const q3 = percentileOf(rents, 0.75);
  return {
    count: rents.length,
    median,
    q1,
    q3,
    iqr: q3 - q1,
    iqrRatioPercent: median > 0 ? ((q3 - q1) / median) * 100 : Number.POSITIVE_INFINITY,
  };
}

/**
 * 산정 엔진 판(版). 저장된 산정 결과에 이 값을 찍어 둔다.
 *
 * 왜 필요한가 — 산정 결과는 업로드 시점에 계산해 IndexedDB 에 넣고, 화면은 저장된
 * 값을 읽기만 한다. 그래서 엔진을 고쳐도 이미 올라간 분기의 숫자는 옛 계산 그대로
 * 남는다. 2026-09-08 에 실제로 겪은 일이다 — 매물 실측 전용률을 쓰도록 고쳤는데
 * 브라우저에 남아 있던 데이터셋은 수정 전 값을 계속 보여줬다.
 *
 * 이 값을 바꾸면 저장소가 옛 결과를 알아보고 다시 계산한다(db/repository.ts).
 * 산출 숫자가 달라지는 수정을 하면 반드시 함께 올릴 것.
 */
export const CALC_ENGINE_VERSION = "v2.1-실측전용률";

export function calculateAdjustmentFactors(
  buildingMedians: BuildingMedian[],
  datasetId: string
): CalculationResult[] {
  const actualContractRents = getActualContractStore();

  // 계산에 못 쓰는 행(단가 0·결측)은 처음부터 뺀다. 0 으로 남겨 두면 중앙값이
  // 실제보다 낮게 잡힌다.
  const usable = buildingMedians.filter(
    (b) => Number.isFinite(b.buildingMedianRent) && b.buildingMedianRent > 0
  );

  return HALL_SPECS.map((hall) => {
    const hallSizeCategory = classifyBuildingSize(hall.grossArea);
    const regionGroup = usable.filter((b) => b.region === hall.region);
    const regionStats = statsOf(regionGroup);
    const baseRegionalRent = Math.round(regionStats.median);

    // ① 권역 — 권역 건물이 없으면 지역군을 그대로 쓴다(계수 1.000 이 된다).
    const zoneMatch = regionGroup.filter((b) => b.zone === hall.zone);
    const zoneGroup = zoneMatch.length > 0 ? zoneMatch : regionGroup;

    // ② 규모 — 연면적이 없는 건물은 규모군에 넣지 않는다(0 으로 세면 안 된다).
    const sizeMatch = zoneGroup.filter(
      (b) => classifyBuildingSize(b.grossArea) === hallSizeCategory
    );
    const sizeGroup = sizeMatch.length > 0 ? sizeMatch : zoneGroup;

    // ③ 연식 — 준공연도가 없는 건물은 연식군에 넣지 않는다.
    const ageMatch = sizeGroup.filter(
      (b) =>
        Number.isFinite(b.completionYear) &&
        b.completionYear > 0 &&
        Math.abs(b.completionYear - hall.builtYear) <= AGE_BAND_YEARS
    );
    const ageGroup = ageMatch.length > 0 ? ageMatch : sizeGroup;

    const zoneStats = statsOf(zoneGroup);
    const sizeStats = statsOf(sizeGroup);
    const ageStats = statsOf(ageGroup);

    const buildFactor = (
      name: string,
      base: GroupStats,
      target: GroupStats,
      extra: Partial<FactorDetail>
    ): FactorDetail => {
      const observedFactor =
        base.median > 0 && target.median > 0
          ? Number((target.median / base.median).toFixed(3))
          : 1.0;

      const enoughSamples = target.count >= FACTOR_MIN_SAMPLES;
      const tightEnough = target.iqrRatioPercent <= FACTOR_MAX_IQR_RATIO_PERCENT;
      const passesGate = enoughSamples && tightEnough;

      const recommendedFactor = passesGate ? observedFactor : 1.0;
      const isApplied = passesGate && observedFactor !== 1.0;

      let reason: string;
      if (target.count === 0) {
        reason = "비교 건물이 없어 중립값 1.000 적용";
      } else if (!enoughSamples) {
        reason = `비교 건물이 ${target.count}건으로 대표성이 부족하여 중립값 1.000 적용 (기준 ${FACTOR_MIN_SAMPLES}건)`;
      } else if (!tightEnough) {
        reason = `비교 건물 ${target.count}건의 단가 흩어짐(IQR ${target.iqrRatioPercent.toFixed(1)}%)이 기준 ${FACTOR_MAX_IQR_RATIO_PERCENT}%를 넘어 중립값 1.000 적용`;
      } else if (!isApplied) {
        reason = `관측 ${name} 보정계수가 1.000 이라 조정 없음 (표본 ${target.count}건)`;
      } else {
        reason = `관측 ${name} 보정계수 ${observedFactor.toFixed(3)} 반영 (표본 ${target.count}건, IQR ${target.iqrRatioPercent.toFixed(1)}%)`;
      }

      const appliedStatus: "적용" | "미적용" = isApplied ? "적용" : "미적용";

      return {
        observedFactor,
        recommendedFactor,
        appliedFactor: recommendedFactor,
        sampleCount: target.count,
        q1: Math.round(target.q1),
        q3: Math.round(target.q3),
        iqrAmount: Math.round(target.iqr),
        iqrRatioPercent: Number.isFinite(target.iqrRatioPercent)
          ? Number(target.iqrRatioPercent.toFixed(1))
          : 0,
        isApplied,
        appliedStatus,
        reason,
        baseGroupCount: base.count,
        baseGroupMedian: Math.round(base.median),
        targetGroupCount: target.count,
        targetGroupMedian: Math.round(target.median),
        formulaDescription: `${Math.round(target.median).toLocaleString()} ÷ ${Math.round(base.median).toLocaleString()} = ${observedFactor.toFixed(3)}`,
        recommendationJudgment: `${appliedStatus} (${reason})`,
        ...extra,
      };
    };

    const zoneFactorDetail = buildFactor("권역", regionStats, zoneStats, {});
    const sizeFactorDetail = buildFactor("규모", zoneStats, sizeStats, {
      hallGrossAreaSqm: hall.grossArea,
      hallSizeCategory,
    });
    const ageFactorDetail = buildFactor("연식", sizeStats, ageStats, {
      hallBuiltYear: hall.builtYear,
      ageRangeStr: `${hall.builtYear - AGE_BAND_YEARS}~${hall.builtYear + AGE_BAND_YEARS}년 준공`,
    });

    const obsTotal = Number(
      (
        zoneFactorDetail.observedFactor *
        sizeFactorDetail.observedFactor *
        ageFactorDetail.observedFactor
      ).toFixed(3)
    );
    const recTotal = Number(
      (
        zoneFactorDetail.recommendedFactor *
        sizeFactorDetail.recommendedFactor *
        ageFactorDetail.recommendedFactor
      ).toFixed(3)
    );

    const now = new Date().toISOString();

    return {
      datasetId,
      buildingId: hall.buildingId,
      buildingName: hall.buildingName,
      region: hall.region,
      zone: hall.zone,
      baseRegionalRent,
      currentContractRent: actualContractRents[hall.buildingId] ?? 0,
      observedFactors: {
        zone: zoneFactorDetail.observedFactor,
        size: sizeFactorDetail.observedFactor,
        age: ageFactorDetail.observedFactor,
        total: obsTotal,
      },
      recommendedFactors: {
        zone: zoneFactorDetail.recommendedFactor,
        size: sizeFactorDetail.recommendedFactor,
        age: ageFactorDetail.recommendedFactor,
        total: recTotal,
      },
      appliedFactors: {
        zone: zoneFactorDetail.appliedFactor,
        size: sizeFactorDetail.appliedFactor,
        age: ageFactorDetail.appliedFactor,
        total: recTotal,
      },
      zoneFactorDetail,
      sizeFactorDetail,
      ageFactorDetail,
      recommendedRent: Math.round(baseRegionalRent * recTotal),
      finalRent: Math.round(baseRegionalRent * recTotal),
      calculatedAt: now,
      calculationVersion: CALC_ENGINE_VERSION,
      formulaVersion: "RS-2026Q2",
    };
  });
}

/**
 * 10. Excel Export (`exportEfficiencyComparisonWorkbook`)
 * Output filename format: 전용률_계약환산_비교_{연도}Q{분기}_{버전}.xlsx
 */
export function exportEfficiencyComparisonWorkbook(
  hallRows: HallComparisonRow[],
  effTable: EfficiencyRateTable,
  convertedListings: RegionalConvertedListing[],
  refYear: number,
  refQuarter: number,
  version: number
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: 시트1_회관비교
  const s1Data = hallRows.map((h) => ({
    회관: h.hallName,
    지역: h.region,
    권역: h.zone,
    도로명주소: h.roadAddress,
    실거래가_원m2월: h.realTransactionRentWon,
    지역매물호가_전용단가중앙값: h.regionExclMedianRentWon,
    지역전용률: h.regionAppliedRate,
    지역매물호가_계약환산중앙값: h.regionListingsMedianRentWon,
    권역매물호가_전용단가중앙값: h.zoneExclMedianRentWon,
    권역전용률: h.zoneAppliedRate,
    권역전용률_폴백여부: h.isZoneFallback ? "지역전용률 적용(폴백)" : "권역전용률 적용",
    권역매물호가_계약환산중앙값: h.zoneListingsMedianRentWon,
  }));
  const ws1 = XLSX.utils.json_to_sheet(s1Data);
  XLSX.utils.book_append_sheet(workbook, ws1, "시트1_회관비교");

  // Sheet 2: 시트2_전용률표
  const s2Data = effTable.rows.map((r) => ({
    구분: r.categoryType,
    지역: r.region,
    권역: r.zone,
    매물수: r.sampleCount,
    전용률_평균: r.efficiencyMean,
    전용률_중앙값_50: r.efficiencyMedian,
    "25%": r.quantile25,
    "75%": r.quantile75,
    적용여부: r.isFallbackUsed ? "지역값 적용 (폴백)" : "정상 적용",
    회관: r.associatedHall || "-",
  }));
  const ws2 = XLSX.utils.json_to_sheet(s2Data);
  XLSX.utils.book_append_sheet(workbook, ws2, "시트2_전용률표");

  // Sheet 3: 시트3_지역매물 (Exact 9 standard columns!)
  const s3Data = convertedListings.map((c) => ({
    출처: c.source,
    매물번호: c.listingId,
    지역: c.region,
    권역: c.zone,
    면적당임대료: c.rentPerExclusiveSqmWon,
    지역별전용률: c.regionEfficiencyRate,
    권역별전용률: c.zoneEfficiencyRate,
    면적당임대료에지역별전용률곱한값: c.rentPerContractSqmByRegionWon,
    권역별전용률에면적당임대료곱한값: c.rentPerContractSqmByZoneWon,
  }));
  const ws3 = XLSX.utils.json_to_sheet(s3Data);
  XLSX.utils.book_append_sheet(workbook, ws3, "시트3_지역매물");

  // Sheet 4: 시트4_설명
  const s4Data = [
    {
      항목: "시스템명",
      내용: "우체국보험회관 부동산 임대기준가격 산정 대시보드",
    },
    {
      항목: "기준분기",
      내용: `${refYear}년 ${refQuarter}분기 V${version}`,
    },
    {
      항목: "전용률 산출원천",
      내용: "알스퀘어 (R스퀘어) 수집 매물 데이터",
    },
    {
      항목: "계약환산 적용대상",
      내용: "알스퀘어 + 네모 전체 크롤링 매물 데이터",
    },
    {
      항목: "권역 폴백 규칙",
      내용: "권역 알스퀘어 표본 5건 미만 시 해당 지역 전용률 중앙값 자동 적용",
    },
    {
      항목: "산정 산식",
      내용: "R최종 = R기준 × K권역 × K규모 × K연식",
    },
  ];
  const ws4 = XLSX.utils.json_to_sheet(s4Data);
  XLSX.utils.book_append_sheet(workbook, ws4, "시트4_설명");

  const filename = `전용률_계약환산_비교_${refYear}Q${refQuarter}_V${version}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
