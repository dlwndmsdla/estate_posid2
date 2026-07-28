/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import {
  RawListing,
  CleanedListing,
  ListingValidation,
  EfficiencyRateApplication,
  ListingEligibility,
} from "../types/dataset";

export interface ExcelParseDiagnostic {
  recognizedSheetName: string;
  usedSheetName: string;
  headerRowNumber: number; // e.g. 2
  totalRowCount: number;
  rsquareCount: number;
  nemoCount: number;
  validMonthlyRentCount: number;
  validExclusiveAreaCount: number;
  validRegionCount: number;
  validZoneCount: number;
  validGrossAreaCount: number;
  validBuiltYearCount: number;
  validRowCount: number;
  warningRowCount: number;
  invalidRowCount: number;
  diagnosticStatus: "SUCCESS" | "WARNING" | "FAILED";
  columnMappingError: string | null;
}

export interface ExcelParseResult {
  fileHash: string;
  rawListings: RawListing[];
  unmappedColumns: string[];
  totalRowCount: number;
  diagnostic: ExcelParseDiagnostic;
}

export interface ExcelValidationSummary {
  totalRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  warningRowCount: number;
  duplicateRowCount: number;
  uniqueBuildingCount: number;
  efficiencyApplicableCount: number;
  efficiencyMissingCount: number;
  addressMissingCount: number;
  rentErrorCount: number;
  areaErrorCount: number;

  exclusiveAreaErrorCount: number;
  rsquareContractAreaErrorCount: number;
  grossFloorAreaMissingCount: number;
  exclusiveGreaterThanContractCount: number;

  validForContractConversionCount: number;
  validForRegionalBaseRentCount: number;
  sizeAdjustmentExcludedCount: number;
  efficiencyRateSampleExcludedCount: number;

  cleanedListings: CleanedListing[];
  diagnostic?: ExcelParseDiagnostic;
}

export interface ColumnInfo {
  key: string;
  label: string;
  index: number;
}

export interface ColumnGroup {
  id: string;
  label: string;
  startColumn: string;
  endColumn: string;
  startIndex: number;
  endIndex: number;
  columns: ColumnInfo[];
}

export const COLUMN_GROUPS: ColumnGroup[] = [
  {
    id: "summary",
    label: "주요정보(요약)",
    startColumn: "A",
    endColumn: "K",
    startIndex: 0,
    endIndex: 10,
    columns: [
      { key: "summary_source", label: "출처", index: 0 },
      { key: "summary_region", label: "지역", index: 1 },
      { key: "summary_zone", label: "권역", index: 2 },
      { key: "summary_primaryUse", label: "주용도", index: 3 },
      { key: "summary_depPerSqm", label: "면적당보증금", index: 4 },
      { key: "summary_rentPerSqm", label: "면적당임대료", index: 5 },
      { key: "summary_maintPerSqm", label: "면적당관리비", index: 6 },
      { key: "summary_convRentPerSqm", label: "면적당환산임대료", index: 7 },
      { key: "summary_floor", label: "매물층", index: 8 },
      { key: "summary_size", label: "건물크기", index: 9 },
      { key: "summary_distance", label: "인접성(m)", index: 10 },
    ],
  },
  {
    id: "crawler",
    label: "사이트/크롤링 관련정보",
    startColumn: "M",
    endColumn: "T",
    startIndex: 12,
    endIndex: 19,
    columns: [
      { key: "source", label: "출처", index: 12 },
      { key: "collectedDate", label: "수집일", index: 13 },
      { key: "confirmedDate", label: "매물확인일", index: 14 },
      { key: "elapsedDays", label: "경과일수", index: 15 },
      { key: "listingId", label: "매물번호/ID", index: 16 },
      { key: "transactionType", label: "거래유형", index: 17 },
      { key: "region", label: "지역", index: 18 },
      { key: "zone", label: "권역", index: 19 },
    ],
  },
  {
    id: "listing",
    label: "매물정보",
    startColumn: "U",
    endColumn: "AC",
    startIndex: 20,
    endIndex: 28,
    columns: [
      { key: "calc_depPerSqm", label: "면적당보증금", index: 20 },
      { key: "calc_rentPerSqm", label: "면적당임대료", index: 21 },
      { key: "calc_maintPerSqm", label: "면적당관리비", index: 22 },
      { key: "calc_convRentPerSqm", label: "면적당환산임대료", index: 23 },
      { key: "depositTenThousandWon", label: "보증금(만원)", index: 24 },
      { key: "monthlyRentTenThousandWon", label: "월세(만원)", index: 25 },
      { key: "maintenanceFeeTenThousandWon", label: "관리비(만원)", index: 26 },
      { key: "exclusiveAreaSqm", label: "전용면적(m2)", index: 27 },
      { key: "listingFloor", label: "매물층", index: 28 },
    ],
  },
  {
    id: "building",
    label: "건물정보",
    startColumn: "AD",
    endColumn: "AJ",
    startIndex: 29,
    endIndex: 35,
    columns: [
      { key: "buildingName", label: "빌딩명", index: 29 },
      { key: "roadAddress", label: "도로명주소", index: 30 },
      { key: "builtYear", label: "준공연도", index: 31 },
      { key: "latitude", label: "위도", index: 32 },
      { key: "longitude", label: "경도", index: 33 },
      { key: "pnu", label: "PNU", index: 34 },
      { key: "distanceToHallMeters", label: "거리_본사(m)", index: 35 },
    ],
  },
  {
    id: "building-register",
    label: "건축물대장정보",
    startColumn: "AK",
    endColumn: "AN",
    startIndex: 36,
    endIndex: 39,
    columns: [
      { key: "primaryUse", label: "주용도_대장", index: 36 },
      { key: "grossFloorAreaSqm", label: "연면적_대장", index: 37 },
      { key: "groundFloorCount", label: "지상층_대장", index: 38 },
      { key: "undergroundFloorCount", label: "지하층_대장", index: 39 },
    ],
  },
  {
    id: "additional",
    label: "부가정보",
    startColumn: "AO",
    endColumn: "AP",
    startIndex: 40,
    endIndex: 41,
    columns: [
      { key: "parkingCapacity", label: "주차가능대수", index: 40 },
      { key: "freeParkingStatus", label: "무료주차여부", index: 41 },
    ],
  },
  {
    id: "conversion-rate",
    label: "전월세전환율정보",
    startColumn: "AQ",
    endColumn: "AQ",
    startIndex: 42,
    endIndex: 42,
    columns: [
      { key: "rentConversionRate", label: "전월세전환율(4월기준)", index: 42 },
    ],
  },
];

/**
 * 1. Normalize column header string
 */
export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .replace(/\s/g, "")
    .replace(/㎡/g, "m2")
    .replace(/m²/gi, "m2")
    .replace(/[()_]/g, "")
    .toLowerCase();
}

/**
 * Header aliases mapping for automatic column recognition
 */
export const HEADER_ALIASES: Record<string, string[]> = {
  source: ["출처"],
  collectedDate: ["수집일"],
  listingConfirmedDate: ["매물확인일"],
  listingId: ["매물번호/id", "매물번호", "매물id"],
  transactionType: ["거래유형"],
  region: ["지역"],
  zone: ["권역"],
  depositTenThousandWon: ["보증금(만원)", "보증금만원", "보증금"],
  monthlyRentTenThousandWon: ["월세(만원)", "월세만원", "월세"],
  maintenanceFeeTenThousandWon: ["관리비(만원)", "관리비만원", "관리비"],
  exclusiveAreaSqm: ["전용면적(m2)", "전용면적(m²)", "전용면적㎡", "전용면적"],
  listingFloor: ["매물층"],
  buildingName: ["빌딩명", "건물명"],
  roadAddress: ["도로명주소", "주소"],
  builtYear: ["준공연도", "준공년도", "사용승인일"],
  latitude: ["위도"],
  longitude: ["경도"],
  pnu: ["pnu"],
  distanceToHallMeters: ["거리_본사(m)", "거리본사m", "거리본사", "지하철거리m"],
  primaryUse: ["주용도_대장", "주용도대장", "주용도"],
  grossFloorAreaSqm: ["연면적_대장", "연면적대장", "연면적"],
  groundFloorCount: ["지상층_대장", "지상층대장"],
  undergroundFloorCount: ["지하층_대장", "지하층대장"],
  parkingCapacity: ["주차가능대수"],
  freeParkingStatus: ["무료주차여부"],
  rentConversionRate: ["전월세전환율(4월기준)", "전월세전환율4월기준", "전월세전환율"],
  rawRentPerSqmTenThousand: ["면적당임대료(만원)", "면적당임대료만원", "면적당임대료"],
  rawConvertedRentPerSqmTenThousand: ["면적당환산임대료(만원)", "면적당환산임대료만원", "면적당환산임대료"],
};

/**
 * 2. Number parser utility
 */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const str = String(value);
  const normalized = str
    .replace(/,/g, "")
    .replace(/만원/g, "")
    .replace(/원/g, "")
    .replace(/㎡/g, "")
    .replace(/m2/gi, "")
    .replace(/년/g, "")
    .replace(/%/g, "")
    .trim();

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (str.includes("%") && parsed > 1) {
    return parsed / 100;
  }

  return parsed;
}

/**
 * 3. Classify building size category (< 9,917㎡ Small, 9,917~33,058㎡ Medium, > 33,058㎡ Large)
 */
export function classifyBuildingSize(
  grossFloorAreaSqm: number | null | undefined
): "대" | "중" | "소" | null {
  if (
    grossFloorAreaSqm === null ||
    grossFloorAreaSqm === undefined ||
    !Number.isFinite(grossFloorAreaSqm) ||
    grossFloorAreaSqm <= 0
  ) {
    return null;
  }

  if (grossFloorAreaSqm >= 33058) {
    return "대";
  }

  if (grossFloorAreaSqm >= 9917) {
    return "중";
  }

  return "소";
}

/**
 * 4. In-Page unit price recalculation function
 */
export function calculateDerivedValues(row: {
  exclusiveAreaSqm: number | null;
  depositTenThousandWon: number | null;
  monthlyRentTenThousandWon: number | null;
  maintenanceFeeTenThousandWon: number | null;
  rentConversionRate: number | null;
}) {
  const area = row.exclusiveAreaSqm;

  if (!area || area <= 0) {
    return {
      depositPerExclusiveSqmWon: null,
      rentPerExclusiveSqmWon: null,
      maintenancePerExclusiveSqmWon: null,
      convertedRentPerExclusiveSqmWon: null,
    };
  }

  const dep = row.depositTenThousandWon ?? 0;
  const rent = row.monthlyRentTenThousandWon ?? 0;
  const maint = row.maintenanceFeeTenThousandWon;
  const conv = row.rentConversionRate ?? 0.056;

  const depositPerExclusiveSqmWon = Math.round((dep * 10000) / area);
  const rentPerExclusiveSqmWon = Math.round((rent * 10000) / area);
  const maintenancePerExclusiveSqmWon =
    maint === null ? null : Math.round((maint * 10000) / area);
  const convertedRentPerExclusiveSqmWon = Math.round(
    ((rent + (dep * conv) / 12) * 10000) / area
  );

  return {
    depositPerExclusiveSqmWon,
    rentPerExclusiveSqmWon,
    maintenancePerExclusiveSqmWon,
    convertedRentPerExclusiveSqmWon,
  };
}

/**
 * Compute SHA-256 hash of ArrayBuffer
 */
export async function calculateFileHash(buffer: ArrayBuffer): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    hash = (hash << 5) - hash + view[i];
    hash |= 0;
  }
  return `hash-${Math.abs(hash).toString(16)}`;
}

/**
 * Find index of column matching alias list.
 * CRITICAL: M~AQ (indices >= 12) are prioritized over A~K summary columns (indices 0..10).
 */

export function findColumnIndexWithPriority(
  normalizedHeaders: string[],
  aliases: string[]
): number {
  const normAliases = aliases.map(normalizeHeader);

  // 1. Search in M~AQ raw source area (index >= 12)
  for (let i = 12; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    if (!h) continue;
    if (normAliases.some((alias) => h === alias || h.includes(alias))) {
      return i;
    }
  }

  // 2. Fallback: search anywhere
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    if (!h) continue;
    if (normAliases.some((alias) => h === alias || h.includes(alias))) {
      return i;
    }
  }

  return -1;
}

/**
 * Parse Excel file buffer into raw listing array using "통합데이터" sheet auto-recognition
 */
export async function parseExcelFile(
  fileBuffer: ArrayBuffer,
  datasetId: string
): Promise<ExcelParseResult> {
  const fileHash = await calculateFileHash(fileBuffer);
  const workbook = XLSX.read(fileBuffer, { type: "array" });

  if (!workbook.SheetNames.length) {
    throw new Error("Excel 파일에 시트가 존재하지 않습니다.");
  }

  // Find sheet "통합데이터" or default to sheet 0
  const recognizedSheetName =
    workbook.SheetNames.find((s) => s.trim() === "통합데이터") || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[recognizedSheetName];

  if (!worksheet) {
    throw new Error(`'${recognizedSheetName}' 시트를 찾을 수 없습니다.`);
  }

  // Read array of array rows
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (!rows || rows.length < 2) {
    throw new Error("엑셀 파일에 데이터가 존재하지 않거나 2행 헤더가 없습니다.");
  }

  // Header row is Row 2 in Excel (index 1)
  const rawHeaderRow = rows[1] || [];
  const normalizedHeaders = rawHeaderRow.map((col: any) => normalizeHeader(col));

  // Find column indices with M~AQ prioritization
  const colIndices: Record<string, number> = {};
  const missingHeaders: string[] = [];

  const requiredKeys = ["listingId", "source", "region", "monthlyRentTenThousandWon", "exclusiveAreaSqm"];

  Object.entries(HEADER_ALIASES).forEach(([key, aliases]) => {
    const idx = findColumnIndexWithPriority(normalizedHeaders, aliases);
    colIndices[key] = idx;
    if (requiredKeys.includes(key) && idx === -1) {
      missingHeaders.push(aliases[0]);
    }
  });

  let columnMappingError: string | null = null;
  if (missingHeaders.length > 0) {
    columnMappingError = `COLUMN_MAPPING_FAILED: 다음 필수 열을 찾을 수 없습니다 [${missingHeaders.join(", ")}]`;
  }

  const dataRows = rows.slice(2);

  let rsquareCount = 0;
  let nemoCount = 0;
  let validMonthlyRentCount = 0;
  let validExclusiveAreaCount = 0;
  let validRegionCount = 0;
  let validZoneCount = 0;
  let validGrossAreaCount = 0;
  let validBuiltYearCount = 0;

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
      rsquareCount++;
    } else if (/네모|nemo/i.test(rawSourceVal)) {
      source = "네모";
      nemoCount++;
    } else if (rawSourceVal) {
      source = rawSourceVal;
    }

    const listingId = String(parseVal("listingId") || `LISTING-${idx + 1}`).trim();
    const region = String(parseVal("region") || "").trim();
    const zone = String(parseVal("zone") || "").trim();
    const roadAddress = String(parseVal("roadAddress") || "").trim();
    const buildingName = String(parseVal("buildingName") || "미지정 건물").trim();
    const primaryUse = String(parseVal("primaryUse") || "업무시설").trim();

    const depositTenThousandWon = parseNumber(parseVal("depositTenThousandWon"));
    const monthlyRentTenThousandWon = parseNumber(parseVal("monthlyRentTenThousandWon"));
    const maintenanceFeeTenThousandWon = parseNumber(parseVal("maintenanceFeeTenThousandWon"));
    const exclusiveAreaSqm = parseNumber(parseVal("exclusiveAreaSqm"));

    const grossFloorAreaSqm = parseNumber(parseVal("grossFloorAreaSqm"));
    const builtYearRaw = parseNumber(parseVal("builtYear"));
    const builtYear = builtYearRaw ? Math.round(builtYearRaw) : null;

    let conversionRate = parseNumber(parseVal("rentConversionRate")) ?? 0.056;
    if (conversionRate > 1) conversionRate /= 100;
    if (conversionRate <= 0) conversionRate = 0.056;

    if (monthlyRentTenThousandWon !== null && monthlyRentTenThousandWon > 0) validMonthlyRentCount++;
    if (exclusiveAreaSqm !== null && exclusiveAreaSqm > 0) validExclusiveAreaCount++;
    if (region) validRegionCount++;
    if (zone) validZoneCount++;
    if (grossFloorAreaSqm !== null && grossFloorAreaSqm > 0) validGrossAreaCount++;
    if (builtYear !== null && builtYear > 0) validBuiltYearCount++;

    const sizeCategory = classifyBuildingSize(grossFloorAreaSqm);
    const sizeCategoryStr = sizeCategory === "대" ? "large" : sizeCategory === "중" ? "medium" : "small";

    const rawRentPerSqmTenThousand = parseNumber(parseVal("rawRentPerSqmTenThousand"));
    const rawConvertedRentPerSqmTenThousand = parseNumber(parseVal("rawConvertedRentPerSqmTenThousand"));

    const derived = calculateDerivedValues({
      exclusiveAreaSqm,
      depositTenThousandWon,
      monthlyRentTenThousandWon,
      maintenanceFeeTenThousandWon,
      rentConversionRate: conversionRate,
    });

    let depositPerExclusiveSqmWon = derived.depositPerExclusiveSqmWon ?? 0;
    let rentPerExclusiveSqmWon = derived.rentPerExclusiveSqmWon ?? 0;
    let maintenancePerExclusiveSqmWon = derived.maintenancePerExclusiveSqmWon ?? 0;
    let convertedRentPerExclusiveSqmWon = derived.convertedRentPerExclusiveSqmWon ?? 0;

    // Unit Guard & Calibration for low unit price (< 500 Won/m2, e.g. 87 Won/m2)
    if (convertedRentPerExclusiveSqmWon <= 500) {
      if (rawConvertedRentPerSqmTenThousand !== null && rawConvertedRentPerSqmTenThousand > 0) {
        if (rawConvertedRentPerSqmTenThousand <= 100) {
          convertedRentPerExclusiveSqmWon = Math.round(rawConvertedRentPerSqmTenThousand * 10000);
        } else {
          convertedRentPerExclusiveSqmWon = Math.round(rawConvertedRentPerSqmTenThousand);
        }
      } else if (rawRentPerSqmTenThousand !== null && rawRentPerSqmTenThousand > 0) {
        if (rawRentPerSqmTenThousand <= 100) {
          rentPerExclusiveSqmWon = Math.round(rawRentPerSqmTenThousand * 10000);
        } else {
          rentPerExclusiveSqmWon = Math.round(rawRentPerSqmTenThousand);
        }
        if (convertedRentPerExclusiveSqmWon <= 500) {
          convertedRentPerExclusiveSqmWon = rentPerExclusiveSqmWon;
        }
      } else if (convertedRentPerExclusiveSqmWon > 0 && exclusiveAreaSqm && exclusiveAreaSqm > 0) {
        // Correct unit where 0.87 (ten-thousand won/m2) was passed as monthlyRent and divided by area
        convertedRentPerExclusiveSqmWon = Math.round(convertedRentPerExclusiveSqmWon * exclusiveAreaSqm);
      }
    }

    const collectedDate = String(parseVal("collectedDate") || "").trim();
    const confirmedDate = String(parseVal("listingConfirmedDate") || "").trim();
    const floor = parseVal("listingFloor") ?? "";
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
      completionYear: builtYear ?? 2005,
      builtYear: builtYear ?? 2005,
      grossArea: grossFloorAreaSqm ?? 0,
      grossFloorAreaSqm: grossFloorAreaSqm ?? 0,
      leaseArea: exclusiveAreaSqm ?? 0,
      exclusiveArea: exclusiveAreaSqm ?? 0,
      exclusiveAreaSqm: exclusiveAreaSqm ?? 0,
      deposit: depositTenThousandWon ?? 0,
      depositTenThousandWon: depositTenThousandWon ?? 0,
      monthlyRent: monthlyRentTenThousandWon ?? 0,
      monthlyRentTenThousandWon: monthlyRentTenThousandWon ?? 0,
      maintenanceFee: maintenanceFeeTenThousandWon ?? 0,
      maintenanceFeeTenThousandWon: maintenanceFeeTenThousandWon ?? 0,
      subwayDistance: distanceToHallMeters,
      distanceToHallMeters,
      floor,
      latitude: parseNumber(parseVal("latitude")) ?? 0,
      longitude: parseNumber(parseVal("longitude")) ?? 0,
      pnu: String(parseVal("pnu") || "").trim(),
      groundFloors: parseNumber(parseVal("groundFloorCount")) ?? 0,
      undergroundFloors: parseNumber(parseVal("undergroundFloorCount")) ?? 0,
      parkingCount: parseNumber(parseVal("parkingCapacity")) ?? 0,
      freeParking: String(parseVal("freeParkingStatus") || "").trim(),
      rentConversionRate: conversionRate,
      buildingSizeCategory: sizeCategoryStr,

      depositPerExclusiveSqmWon,
      rentPerExclusiveSqmWon,
      maintenancePerExclusiveSqmWon,
      convertedRentPerExclusiveSqmWon,

      rawRowData: row,
    };

    rawListings.push(rawItem);
  });

  const diagnostic: ExcelParseDiagnostic = {
    recognizedSheetName,
    usedSheetName: recognizedSheetName,
    headerRowNumber: 2,
    totalRowCount: rawListings.length,
    rsquareCount,
    nemoCount,
    validMonthlyRentCount,
    validExclusiveAreaCount,
    validRegionCount,
    validZoneCount,
    validGrossAreaCount,
    validBuiltYearCount,
    validRowCount: 0,
    warningRowCount: 0,
    invalidRowCount: 0,
    diagnosticStatus: columnMappingError ? "FAILED" : "SUCCESS",
    columnMappingError,
  };

  return {
    fileHash,
    rawListings,
    unmappedColumns: missingHeaders,
    totalRowCount: rawListings.length,
    diagnostic,
  };
}

/**
 * Validate raw listings and convert to CleanedListings
 */
export function validateAndCleanListings(
  rawListings: RawListing[],
  referenceYear: number
): ExcelValidationSummary {
  const listingIdCounts = new Map<string, number>();
  const duplicatePropMap = new Map<string, number>();

  rawListings.forEach((r) => {
    if (r.listingId) {
      listingIdCounts.set(r.listingId, (listingIdCounts.get(r.listingId) || 0) + 1);
    }
    const areaVal = r.exclusiveAreaSqm ?? r.exclusiveArea;
    const key = `${r.buildingName}_${areaVal}_${r.monthlyRentTenThousandWon || r.monthlyRent}`;
    duplicatePropMap.set(key, (duplicatePropMap.get(key) || 0) + 1);
  });

  let duplicateRowCount = 0;
  let addressMissingCount = 0;
  let rentErrorCount = 0;
  let areaErrorCount = 0;
  let exclusiveAreaErrorCount = 0;
  let rsquareContractAreaErrorCount = 0;
  let grossFloorAreaMissingCount = 0;
  let exclusiveGreaterThanContractCount = 0;

  let efficiencyApplicableCount = 0;
  let efficiencyMissingCount = 0;

  const buildingNamesSet = new Set<string>();

  const cleanedListings: CleanedListing[] = rawListings.map((r) => {
    const errorCodes: string[] = [];
    const warningCodes: string[] = [];

    const isRsquare = r.source === "알스퀘어";
    const exArea = r.exclusiveAreaSqm ?? r.exclusiveArea ?? 0;
    const grossArea = r.grossFloorAreaSqm ?? r.grossArea ?? 0;
    const mRent = r.monthlyRentTenThousandWon ?? r.monthlyRent ?? 0;
    const depositVal = r.depositTenThousandWon ?? r.deposit ?? 0;
    const maintVal = r.maintenanceFeeTenThousandWon ?? r.maintenanceFee ?? 0;

    // 1. Invalid Error Checks (Fatal issues preventing price calculations)
    if (!r.listingId) {
      errorCodes.push("MISSING_LISTING_ID");
    }
    if (!r.source) {
      errorCodes.push("MISSING_SOURCE");
    }
    if (!r.region) {
      errorCodes.push("MISSING_REGION");
    }
    if (exArea <= 0) {
      errorCodes.push("EXCLUSIVE_AREA_LE_ZERO");
      exclusiveAreaErrorCount++;
      areaErrorCount++;
    }
    if (mRent <= 0) {
      errorCodes.push("RENT_LE_ZERO");
      rentErrorCount++;
    }

    // 2. Warning Checks (Non-fatal, data quality warnings)
    if (!r.zone) {
      warningCodes.push("MISSING_ZONE");
    }
    if (!r.roadAddress && !r.address) {
      warningCodes.push("MISSING_ADDRESS");
      addressMissingCount++;
    }
    if (!r.buildingName || r.buildingName === "미지정 건물") {
      warningCodes.push("UNSPECIFIED_BUILDING_NAME");
    }
    const compYear = r.builtYear ?? r.completionYear ?? 0;
    if (compYear <= 0) {
      warningCodes.push("MISSING_BUILT_YEAR");
    } else if (compYear > referenceYear) {
      warningCodes.push("COMPLETION_AFTER_REFERENCE");
    }
    if (!r.primaryUse || r.primaryUse === "0") {
      warningCodes.push("MISSING_PRIMARY_USE");
    }

    // CRITICAL REQUIREMENT: Missing Gross Floor Area is WARNING ONLY (not Invalid!)
    if (grossArea <= 0) {
      warningCodes.push("GROSS_FLOOR_AREA_MISSING");
      grossFloorAreaMissingCount++;
    }

    if (maintVal <= 0) {
      warningCodes.push("MISSING_MAINTENANCE_FEE");
    }

    // Duplicates
    const isDupListingId = (listingIdCounts.get(r.listingId) || 0) > 1;
    const propKey = `${r.buildingName}_${exArea}_${mRent}`;
    const isDupProperty = (duplicatePropMap.get(propKey) || 0) > 1;

    if (isDupListingId) {
      errorCodes.push("DUPLICATE_LISTING_ID");
      duplicateRowCount++;
    } else if (isDupProperty) {
      warningCodes.push("DUPLICATE_PROPERTY_SUSPECT");
    }

    // Standard Efficiency Rate Application
    const effRate = 0.62;
    const sourceType: EfficiencyRateApplication["sourceType"] = "overall";
    const sourceName = "전국 표준 전용률(62.0%)";
    efficiencyMissingCount++;

    // Unit prices per Exclusive Area (원/㎡)
    const rentPerExclusiveArea =
      exArea > 0 ? Math.round((mRent * 10000) / exArea) : 0;
    const rentPerContractArea = Math.round(rentPerExclusiveArea * effRate);

    const isValid = errorCodes.length === 0;

    if (isValid && r.buildingName && r.buildingName !== "미지정 건물") {
      buildingNamesSet.add(r.buildingName);
    }

    // Eligibility flags
    const validForContractConversion = isValid && exArea > 0 && mRent > 0;
    const validForRegionalBaseRent = validForContractConversion && !!(r.region || r.zone);
    const validForZoneAdjustment = validForRegionalBaseRent;
    const validForSizeAdjustment = validForRegionalBaseRent && grossArea > 0;
    const validForAgeAdjustment = validForRegionalBaseRent && compYear > 0;
    const validForEfficiencyRateSample = isRsquare && exArea > 0;

    const eligibility: ListingEligibility = {
      validForContractConversion,
      validForRegionalBaseRent,
      validForZoneAdjustment,
      validForSizeAdjustment,
      validForAgeAdjustment,
      validForEfficiencyRateSample,
    };

    return {
      ...r,
      validation: {
        isValid,
        errorCodes,
        warningCodes,
      },
      eligibility,
      efficiencyRate: {
        appliedRate: effRate,
        sourceType,
        sourceName,
      },
      rentPerExclusiveArea,
      rentPerContractArea,
      depositPerSqm: exArea > 0 ? Math.round((depositVal * 10000) / exArea) : 0,
      maintenancePerSqm: exArea > 0 ? Math.round((maintVal * 10000) / exArea) : 0,
      isDuplicate: isDupListingId || isDupProperty,
      isOutlier: false,
      excludeFromCalculation: !isValid,
      exclusionReason: !isValid ? `검증 오류 (${errorCodes.join(", ")})` : undefined,
    };
  });

  const validRowCount = cleanedListings.filter((c) => c.validation.isValid).length;
  const invalidRowCount = cleanedListings.length - validRowCount;
  const warningRowCount = cleanedListings.filter((c) => c.validation.warningCodes.length > 0).length;

  const validForContractConversionCount = cleanedListings.filter(
    (c) => c.eligibility.validForContractConversion
  ).length;
  const validForRegionalBaseRentCount = cleanedListings.filter(
    (c) => c.eligibility.validForRegionalBaseRent
  ).length;
  const sizeAdjustmentExcludedCount = cleanedListings.filter(
    (c) => !c.eligibility.validForSizeAdjustment
  ).length;
  const efficiencyRateSampleExcludedCount = cleanedListings.filter(
    (c) => !c.eligibility.validForEfficiencyRateSample
  ).length;

  return {
    totalRowCount: rawListings.length,
    validRowCount,
    invalidRowCount,
    warningRowCount,
    duplicateRowCount,
    uniqueBuildingCount: buildingNamesSet.size,
    efficiencyApplicableCount,
    efficiencyMissingCount,
    addressMissingCount,
    rentErrorCount,
    areaErrorCount,

    exclusiveAreaErrorCount,
    rsquareContractAreaErrorCount,
    grossFloorAreaMissingCount,
    exclusiveGreaterThanContractCount,

    validForContractConversionCount,
    validForRegionalBaseRentCount,
    sizeAdjustmentExcludedCount,
    efficiencyRateSampleExcludedCount,

    cleanedListings,
  };
}

/**
 * Generate Excel file containing error details and download in browser
 */
export function exportValidationErrorsToExcel(
  cleanedListings: CleanedListing[],
  datasetId: string
): void {
  const errorRows = cleanedListings
    .filter((item) => !item.validation.isValid || item.validation.warningCodes.length > 0)
    .map((item) => ({
      "행번호": item.rowNumber,
      "매물ID": item.listingId,
      "출처": item.source,
      "건물명": item.buildingName,
      "주소": item.roadAddress || item.address,
      "전용면적_m2": item.exclusiveAreaSqm || item.exclusiveArea,
      "월임대료_만원": item.monthlyRentTenThousandWon || item.monthlyRent,
      "검증상태": item.validation.isValid ? "경고" : "오류",
      "오류코드": item.validation.errorCodes.join(", "),
      "경고코드": item.validation.warningCodes.join(", "),
      "산정제외여부": item.excludeFromCalculation ? "제외" : "포함",
    }));

  const worksheet = XLSX.utils.json_to_sheet(errorRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "검증오류내역");

  XLSX.writeFile(workbook, `Validation_Errors_${datasetId}.xlsx`);
}

/**
 * Generate sample Excel template file for users to download and test
 */
export function generateSampleExcelTemplate(): void {
  const headersRow1 = [
    "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "주요정보(요약)", "",
    "사이트/크롤링 관련정보", "사이트/크롤링 관련정보", "사이트/크롤링 관련정보", "사이트/크롤링 관련정보", "사이트/크롤링 관련정보", "사이트/크롤링 관련정보", "사이트/크롤링 관련정보", "사이트/크롤링 관련정보",
    "매물정보", "매물정보", "매물정보", "매물정보", "매물정보", "매물정보", "매물정보", "매물정보", "매물정보",
    "건물정보", "건물정보", "건물정보", "건물정보", "건물정보", "건물정보", "건물정보",
    "건축물대장정보", "건축물대장정보", "건축물대장정보", "건축물대장정보",
    "부가정보", "부가정보",
    "전월세전환율정보"
  ];

  const headersRow2 = [
    "출처", "지역", "권역", "주용도", "면적당보증금", "면적당임대료", "면적당관리비", "면적당환산임대료", "매물층", "건물크기", "인접성(m)", "",
    "출처", "수집일", "매물확인일", "경과일수", "매물번호/ID", "거래유형", "지역", "권역",
    "면적당보증금", "면적당임대료", "면적당관리비", "면적당환산임대료", "보증금(만원)", "월세(만원)", "관리비(만원)", "전용면적(m2)", "매물층",
    "빌딩명", "도로명주소", "준공연도", "위도", "경도", "PNU", "거리_본사(m)",
    "주용도_대장", "연면적_대장", "지상층_대장", "지하층_대장",
    "주차가능대수", "무료주차여부",
    "전월세전환율(4월기준)"
  ];

  const sampleRow1 = [
    "알스퀘어", "서울", "영등포", "업무시설", 1.2069, 0.1172, 0.0391, 0.1229, 3, "중", 520, "",
    "알스퀘어", "2026-06-30", "2026-06-30", 0, "RS-1001", "임대", "서울", "영등포", 1.2069, 0.1172, 0.0391, 0.1229, 105, 10.2, 3.4, 87, 3, "삼성생명 당산빌딩", "서울특별시 영등포구 양평로 21", 2005, 37.5312, 126.9012, "1156011000100210000", 520, "업무시설", 18500, 15, 4, 120, "무료", 0.056
  ];

  const sampleRow2 = [
    "네모", "서울", "영등포", "업무시설", 1.0345, 0.0991, 0.0328, 0.1039, 5, "중", 280, "",
    "네모", "2026-06-30", "2026-06-30", 0, "NEMO-2002", "임대", "서울", "영등포", 1.0345, 0.0991, 0.0328, 0.1039, 120, 11.5, 3.8, 116, 5, "코오롱 디지털타워", "서울특별시 영등포구 선유동3로 15", 2002, 37.5345, 126.8998, "1156011000100150000", 280, "업무시설", 15800, 12, 3, 95, "무료", 0.056
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headersRow1, headersRow2, sampleRow1, sampleRow2]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "통합데이터");

  XLSX.writeFile(workbook, "임대료_기준가격_매물_데이터_양식.xlsx");
}
