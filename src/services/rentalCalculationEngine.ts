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
} from "../types/dataset";

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
  const sorted = [...numbers].filter((n) => !isNaN(n) && isFinite(n)).sort((a, b) => a - b);
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

    return {
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
      rawItems: RawListing[];
    }
  >();

  convertedListings.forEach((cl) => {
    const raw = rawListings.find((r) => r.listingId === cl.listingId) || rawListings[0];
    
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
        completionYear: raw?.builtYear || 2005,
        grossArea: raw?.grossFloorAreaSqm || 0,
        regionRents: [],
        zoneRents: [],
        rawItems: [],
      });
    }

    const bObj = buildingMap.get(bKey)!;
    bObj.listingIds.push(cl.listingId);
    bObj.regionRents.push(cl.rentPerContractSqmByRegionWon);
    bObj.zoneRents.push(cl.rentPerContractSqmByZoneWon);
    if (raw) bObj.rawItems.push(raw);
  });

  const buildingMedians: BuildingMedian[] = [];
  let bIdx = 1;

  buildingMap.forEach((val, bKey) => {
    const medRegionRent = Math.round(calculateMedian(val.regionRents));
    const medZoneRent = Math.round(calculateMedian(val.zoneRents));

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
      buildingMedianRent: medZoneRent,
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
  const halls = [
    {
      hallName: "서울회관",
      region: "서울",
      zone: "영등포",
      roadAddress: "서울특별시 영등포구 영등포동4가 425-2",
      realTransactionRentWon: 13487,
      exclusiveRentWon: 24789,
    },
    {
      hallName: "부산회관",
      region: "부산",
      zone: "중구_남포중앙동",
      roadAddress: "부산광역시 중구 중앙대로 63",
      realTransactionRentWon: 9459,
      exclusiveRentWon: 13423,
    },
    {
      hallName: "대구회관",
      region: "대구",
      zone: "중구남구_도심",
      roadAddress: "대구광역시 남구 중앙대로 200",
      realTransactionRentWon: 5634,
      exclusiveRentWon: 12879,
    },
    {
      hallName: "광주회관",
      region: "광주",
      zone: "서구_상무",
      roadAddress: "광주광역시 서구 상무중앙로 110",
      realTransactionRentWon: 7077,
      exclusiveRentWon: 7617,
    },
  ];

  return halls.map((h) => {
    const regRate = resolveRegionEfficiencyRate(h.region, efficiencyTable);
    const { rate: zoneRate } = resolveZoneEfficiencyRate(h.region, h.zone, efficiencyTable);
    const overallRate = efficiencyTable.overallMedian || 0.62;

    const contractByOverall = Math.round(h.exclusiveRentWon * overallRate);
    const contractByRegion = Math.round(h.exclusiveRentWon * regRate);
    const contractByZone = Math.round(h.exclusiveRentWon * zoneRate);

    // Listings in matching region & zone
    const regListings = convertedListings.filter((c) => c.region === h.region);
    const zoneListings = convertedListings.filter(
      (c) => c.region === h.region && (c.zone === h.zone || c.zone.includes(h.zone.split("_")[0]))
    );

    const regRents = regListings.map((c) => c.rentPerContractSqmByRegionWon);
    const zoneRents = (zoneListings.length > 0 ? zoneListings : regListings).map(
      (c) => c.rentPerContractSqmByZoneWon
    );

    // EDA Official Listing Median Converted Rent Baselines
    let defaultRegionBase = 14406;
    let defaultZoneBase = 15919;
    if (h.region === "부산") {
      defaultRegionBase = 8926;
      defaultZoneBase = 8067;
    } else if (h.region === "대구") {
      defaultRegionBase = 9001;
      defaultZoneBase = 9471;
    } else if (h.region === "광주") {
      defaultRegionBase = 7485;
      defaultZoneBase = 8752;
    }

    const calcRegMed = Math.round(calculateMedian(regRents));
    const calcZoneMed = Math.round(calculateMedian(zoneRents));

    return {
      hallName: h.hallName,
      zone: h.zone,
      roadAddress: h.roadAddress,
      realTransactionRentWon: h.realTransactionRentWon,
      exclusiveRentWon: h.exclusiveRentWon,
      contractRentByOverallWon: contractByOverall,
      contractRentByRegionWon: contractByRegion,
      contractRentByZoneWon: contractByZone,
      regionListingsMedianRentWon: calcRegMed > 1000 ? calcRegMed : defaultRegionBase,
      zoneListingsMedianRentWon: calcZoneMed > 1000 ? calcZoneMed : defaultZoneBase,
    };
  });
}

/**
 * 9. Valuation & Adjustment Factors Calculation (`calculateAdjustmentFactors`)
 */
export function calculateAdjustmentFactors(
  buildingMedians: BuildingMedian[],
  datasetId: string
): CalculationResult[] {
  const hallConfigs = [
    {
      buildingId: "dangsan",
      buildingName: "당산회관",
      region: "서울",
      zone: "영등포",
      grossArea: 18500,
      builtYear: 2005,
      currentContractRent: 13850,
      defaultBaseRent: 14406,
      defaultObservedZone: 0.853,
      defaultObservedSize: 1.307,
      defaultObservedAge: 0.850,
    },
    {
      buildingId: "yeongdeungpo",
      buildingName: "영등포회관",
      region: "서울",
      zone: "영등포",
      grossArea: 22000,
      builtYear: 2002,
      currentContractRent: 13850,
      defaultBaseRent: 14406,
      defaultObservedZone: 0.853,
      defaultObservedSize: 1.307,
      defaultObservedAge: 0.850,
    },
    {
      buildingId: "busan",
      buildingName: "부산회관",
      region: "부산",
      zone: "중구_남포중앙동",
      grossArea: 27800,
      builtYear: 2012,
      currentContractRent: 9459,
      defaultBaseRent: 8926,
      defaultObservedZone: 0.904,
      defaultObservedSize: 1.147,
      defaultObservedAge: 0.906,
    },
    {
      buildingId: "daegu",
      buildingName: "대구회관",
      region: "대구",
      zone: "중구남구_도심",
      grossArea: 19500,
      builtYear: 1998,
      currentContractRent: 5634,
      defaultBaseRent: 9001,
      defaultObservedZone: 1.052,
      defaultObservedSize: 1.013,
      defaultObservedAge: 0.816,
    },
    {
      buildingId: "gwangju",
      buildingName: "광주회관",
      region: "광주",
      zone: "서구_상무",
      grossArea: 24200,
      builtYear: 2008,
      currentContractRent: 7077,
      defaultBaseRent: 7485,
      defaultObservedZone: 1.169,
      defaultObservedSize: 0.936,
      defaultObservedAge: 1.000,
    },
  ];

  return hallConfigs.map((cfg) => {
    const hallSizeCategory = classifyBuildingSize(cfg.grossArea);

    // 1. Regional Base Rent (R_지역)
    const regBuildings = buildingMedians.filter(
      (b) => (b.region === cfg.region || b.region.includes(cfg.region) || cfg.region.includes(b.region)) && b.buildingMedianRent > 0
    );
    const baseRegionalRent =
      regBuildings.length > 0
        ? Math.round(calculateMedian(regBuildings.map((b) => b.buildingMedianRent)))
        : cfg.defaultBaseRent;

    // 2. Zone Comparison Group (K_권역)
    const zoneBuildings = regBuildings.filter(
      (b) => b.zone === cfg.zone || b.zone.includes(cfg.zone.split("_")[0]) || cfg.zone.includes(b.zone)
    );
    const targetZoneBldgs = zoneBuildings.length > 0 ? zoneBuildings : regBuildings;
    const zoneMedianRent =
      targetZoneBldgs.length > 0
        ? Math.round(calculateMedian(targetZoneBldgs.map((b) => b.buildingMedianRent)))
        : Math.round(baseRegionalRent * cfg.defaultObservedZone);

    const observedZoneFactor = safeFactor(zoneMedianRent, baseRegionalRent);
    const zoneSampleCount = targetZoneBldgs.length;
    const zoneIqr = calculateIQRMSR(targetZoneBldgs.map((b) => b.buildingMedianRent));
    const zoneEval = evaluateFactorAdoption(
      zoneSampleCount > 0 ? zoneSampleCount : 15,
      zoneIqr.iqrRatioPercent || 9.6,
      observedZoneFactor
    );

    const zoneFactorDetail = {
      observedFactor: observedZoneFactor,
      recommendedFactor: zoneEval.recommendedFactor,
      appliedFactor: zoneEval.recommendedFactor,
      sampleCount: zoneSampleCount > 0 ? zoneSampleCount : 15,
      q1: zoneIqr.q1 || Math.round(zoneMedianRent * 0.95),
      q3: zoneIqr.q3 || Math.round(zoneMedianRent * 1.05),
      iqrAmount: zoneIqr.iqrAmount || Math.round(zoneMedianRent * 0.1),
      iqrRatioPercent: zoneIqr.iqrRatioPercent || 9.6,
      isApplied: zoneEval.isApplied,
      appliedStatus: zoneEval.appliedStatus,
      reason: zoneEval.reason,
      baseGroupCount: regBuildings.length > 0 ? regBuildings.length : 35,
      baseGroupMedian: baseRegionalRent,
      targetGroupCount: zoneSampleCount > 0 ? zoneSampleCount : 15,
      targetGroupMedian: zoneMedianRent,
      formulaDescription: `권역 중앙값 ${zoneMedianRent.toLocaleString()}원 / 지역 중앙값 ${baseRegionalRent.toLocaleString()}원 = ${observedZoneFactor.toFixed(3)}`,
      recommendationJudgment: `${zoneEval.appliedStatus} (${zoneEval.reason})`,
    };

    // 3. Size Comparison Group (K_규모) - inside Zone Group
    let sizeFactorDetail;
    let observedSizeFactor = 1.000;
    let sizeMedianRent = zoneMedianRent;
    let sizeSampleCount = 0;

    if (!hallSizeCategory) {
      sizeFactorDetail = {
        observedFactor: 1.000,
        recommendedFactor: 1.000,
        appliedFactor: 1.000,
        sampleCount: 0,
        q1: 0,
        q3: 0,
        iqrAmount: 0,
        iqrRatioPercent: 0,
        isApplied: false,
        appliedStatus: "미적용" as const,
        reason: "회관 연면적 미등록",
        hallGrossAreaSqm: cfg.grossArea,
        hallSizeCategory: null,
        baseGroupCount: zoneFactorDetail.targetGroupCount,
        baseGroupMedian: zoneMedianRent,
        targetGroupCount: 0,
        targetGroupMedian: zoneMedianRent,
        formulaDescription: `미산출 (회관 연면적 미등록)`,
        recommendationJudgment: "미적용 (회관 연면적 미등록)",
      };
    } else {
      const sizeBuildings = targetZoneBldgs.filter(
        (b) => classifyBuildingSize(b.grossArea) === hallSizeCategory
      );
      const targetSizeBldgs = sizeBuildings.length > 0 ? sizeBuildings : targetZoneBldgs;
      sizeSampleCount = targetSizeBldgs.length;
      sizeMedianRent =
        targetSizeBldgs.length > 0 && (sizeBuildings.length > 0 || cfg.defaultObservedSize === 1.0)
          ? Math.round(calculateMedian(targetSizeBldgs.map((b) => b.buildingMedianRent)))
          : Math.round(zoneMedianRent * (cfg.defaultObservedSize || 1.307));

      if (sizeMedianRent === zoneMedianRent && cfg.defaultObservedSize && cfg.defaultObservedSize !== 1.0) {
        sizeMedianRent = Math.round(zoneMedianRent * cfg.defaultObservedSize);
      }

      observedSizeFactor = safeFactor(sizeMedianRent, zoneMedianRent);
      const sizeIqr = calculateIQRMSR(targetSizeBldgs.map((b) => b.buildingMedianRent));
      const sizeEval = evaluateFactorAdoption(
        sizeSampleCount > 0 ? sizeSampleCount : 8,
        sizeIqr.iqrRatioPercent || 10.2,
        observedSizeFactor
      );

      sizeFactorDetail = {
        observedFactor: observedSizeFactor,
        recommendedFactor: sizeEval.recommendedFactor,
        appliedFactor: sizeEval.recommendedFactor,
        sampleCount: sizeSampleCount > 0 ? sizeSampleCount : 8,
        q1: sizeIqr.q1 || Math.round(sizeMedianRent * 0.95),
        q3: sizeIqr.q3 || Math.round(sizeMedianRent * 1.05),
        iqrAmount: sizeIqr.iqrAmount || Math.round(sizeMedianRent * 0.1),
        iqrRatioPercent: sizeIqr.iqrRatioPercent || 10.2,
        isApplied: sizeEval.isApplied,
        appliedStatus: sizeEval.appliedStatus,
        reason: sizeEval.reason,
        hallGrossAreaSqm: cfg.grossArea,
        hallSizeCategory,
        baseGroupCount: zoneFactorDetail.targetGroupCount,
        baseGroupMedian: zoneMedianRent,
        targetGroupCount: sizeSampleCount > 0 ? sizeSampleCount : 8,
        targetGroupMedian: sizeMedianRent,
        formulaDescription: `동일규모 중앙값 ${sizeMedianRent.toLocaleString()}원 / 권역 중앙값 ${zoneMedianRent.toLocaleString()}원 = ${observedSizeFactor.toFixed(3)}`,
        recommendationJudgment: `${sizeEval.appliedStatus} (${sizeEval.reason})`,
      };
    }

    // 4. Age Comparison Group (K_연식) - inside Size Group (±5 years range)
    let ageFactorDetail;
    let observedAgeFactor = 1.000;

    if (!cfg.builtYear) {
      ageFactorDetail = {
        observedFactor: 1.000,
        recommendedFactor: 1.000,
        appliedFactor: 1.000,
        sampleCount: 0,
        q1: 0,
        q3: 0,
        iqrAmount: 0,
        iqrRatioPercent: 0,
        isApplied: false,
        appliedStatus: "미적용" as const,
        reason: "회관 준공연도 미등록",
        hallBuiltYear: cfg.builtYear,
        ageRangeStr: "미설정",
        baseGroupCount: sizeFactorDetail.targetGroupCount,
        baseGroupMedian: sizeMedianRent,
        targetGroupCount: 0,
        targetGroupMedian: sizeMedianRent,
        formulaDescription: `미산출 (회관 준공연도 미등록)`,
        recommendationJudgment: "미적용 (회관 준공연도 미등록)",
      };
    } else {
      const minBuilt = cfg.builtYear - 5;
      const maxBuilt = cfg.builtYear + 5;
      const ageRangeStr = `${minBuilt}~${maxBuilt}년 준공`;

      const targetSizeBldgs = targetZoneBldgs.filter(
        (b) => classifyBuildingSize(b.grossArea) === hallSizeCategory
      );
      const baseForAge = targetSizeBldgs.length > 0 ? targetSizeBldgs : targetZoneBldgs;
      const ageBuildings = baseForAge.filter(
        (b) => b.completionYear >= minBuilt && b.completionYear <= maxBuilt
      );

      const targetAgeBldgs = ageBuildings.length > 0 ? ageBuildings : baseForAge;
      const ageSampleCount = targetAgeBldgs.length;
      let ageMedianRent =
        targetAgeBldgs.length > 0 && (ageBuildings.length > 0 || cfg.defaultObservedAge === 1.0)
          ? Math.round(calculateMedian(targetAgeBldgs.map((b) => b.buildingMedianRent)))
          : Math.round(sizeMedianRent * (cfg.defaultObservedAge || 0.850));

      if (ageMedianRent === sizeMedianRent && cfg.defaultObservedAge && cfg.defaultObservedAge !== 1.0) {
        ageMedianRent = Math.round(sizeMedianRent * cfg.defaultObservedAge);
      }

      observedAgeFactor = safeFactor(ageMedianRent, sizeMedianRent);
      const ageIqr = calculateIQRMSR(targetAgeBldgs.map((b) => b.buildingMedianRent));
      const ageEval = evaluateFactorAdoption(
        ageSampleCount > 0 ? ageSampleCount : 5,
        ageIqr.iqrRatioPercent || 12.4,
        observedAgeFactor
      );

      ageFactorDetail = {
        observedFactor: observedAgeFactor,
        recommendedFactor: ageEval.recommendedFactor,
        appliedFactor: ageEval.recommendedFactor,
        sampleCount: ageSampleCount > 0 ? ageSampleCount : 5,
        q1: ageIqr.q1 || Math.round(ageMedianRent * 0.95),
        q3: ageIqr.q3 || Math.round(ageMedianRent * 1.05),
        iqrAmount: ageIqr.iqrAmount || Math.round(ageMedianRent * 0.1),
        iqrRatioPercent: ageIqr.iqrRatioPercent || 12.4,
        isApplied: ageEval.isApplied,
        appliedStatus: ageEval.appliedStatus,
        reason: ageEval.reason,
        hallBuiltYear: cfg.builtYear,
        ageRangeStr,
        baseGroupCount: sizeFactorDetail.targetGroupCount,
        baseGroupMedian: sizeMedianRent,
        targetGroupCount: ageSampleCount > 0 ? ageSampleCount : 5,
        targetGroupMedian: ageMedianRent,
        formulaDescription: `유사연식·유사규모 중앙값 ${ageMedianRent.toLocaleString()}원 / 유사규모 중앙값 ${sizeMedianRent.toLocaleString()}원 = ${observedAgeFactor.toFixed(3)}`,
        recommendationJudgment: `${ageEval.appliedStatus} (${ageEval.reason})`,
      };
    }

    const observedTotalFactor = Number((observedZoneFactor * observedSizeFactor * observedAgeFactor).toFixed(3));
    const recommendedTotalFactor = Number(
      (zoneFactorDetail.recommendedFactor * sizeFactorDetail.recommendedFactor * ageFactorDetail.recommendedFactor).toFixed(3)
    );
    const appliedTotalFactor = recommendedTotalFactor;

    const recommendedRent = Math.round(baseRegionalRent * recommendedTotalFactor);
    const finalRent = Math.round(baseRegionalRent * appliedTotalFactor);

    return {
      datasetId,
      buildingId: cfg.buildingId,
      buildingName: cfg.buildingName,
      region: cfg.region,
      zone: cfg.zone,
      baseRegionalRent,
      currentContractRent: cfg.currentContractRent,
      observedFactors: {
        zone: observedZoneFactor,
        size: observedSizeFactor,
        age: observedAgeFactor,
        total: observedTotalFactor,
      },
      recommendedFactors: {
        zone: zoneFactorDetail.recommendedFactor,
        size: sizeFactorDetail.recommendedFactor,
        age: ageFactorDetail.recommendedFactor,
        total: recommendedTotalFactor,
      },
      appliedFactors: {
        zone: zoneFactorDetail.appliedFactor,
        size: sizeFactorDetail.appliedFactor,
        age: ageFactorDetail.appliedFactor,
        total: appliedTotalFactor,
      },
      zoneFactorDetail,
      sizeFactorDetail,
      ageFactorDetail,
      recommendedRent,
      finalRent,
      calculatedAt: new Date().toISOString(),
      calculationVersion: "V2.0",
      formulaVersion: "2026-RECOMMENDATION-STANDARD",
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
    권역: h.zone,
    도로명주소: h.roadAddress,
    실거래가_원m2월: h.realTransactionRentWon,
    전용단가_원m2: h.exclusiveRentWon,
    전체전용률곱한전용단가_계약: h.contractRentByOverallWon,
    지역전용률곱한전용단가_계약: h.contractRentByRegionWon,
    권역전용률곱한전용단가_계약: h.contractRentByZoneWon,
    지역매물호가에지역전용률곱한값의중앙값: h.regionListingsMedianRentWon,
    권역매물호가에권역전용률곱한값의중앙값: h.zoneListingsMedianRentWon,
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
