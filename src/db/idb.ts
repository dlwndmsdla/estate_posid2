/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DatasetMetadata,
  RawListing,
  CleanedListing,
  BuildingMedian,
  CalculationResult,
  ConfirmedValuation,
  ColumnMappingRule,
} from "../types/dataset";
import { prdDataset, activeBuildingsInfo } from "../prdDataset";

const DB_NAME = "RentBaselineDashboardDB";
const DB_VERSION = 1;

export const STORES = {
  DATASETS: "datasets",
  RAW_LISTINGS: "rawListings",
  CLEANED_LISTINGS: "cleanedListings",
  BUILDING_MEDIANS: "buildingMedians",
  CALCULATION_RESULTS: "calculationResults",
  CONFIRMED_VALUATIONS: "confirmedValuations",
  UPLOAD_MAPPINGS: "uploadMappings",
} as const;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.DATASETS)) {
        const store = db.createObjectStore(STORES.DATASETS, { keyPath: "datasetId" });
        store.createIndex("referenceYearQuarter", ["referenceYear", "referenceQuarter"], { unique: false });
        store.createIndex("uploadedAt", "uploadedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.RAW_LISTINGS)) {
        const store = db.createObjectStore(STORES.RAW_LISTINGS, { keyPath: "id" });
        store.createIndex("datasetId", "datasetId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CLEANED_LISTINGS)) {
        const store = db.createObjectStore(STORES.CLEANED_LISTINGS, { keyPath: "id" });
        store.createIndex("datasetId", "datasetId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.BUILDING_MEDIANS)) {
        const store = db.createObjectStore(STORES.BUILDING_MEDIANS, { keyPath: ["datasetId", "buildingId"] });
        store.createIndex("datasetId", "datasetId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CALCULATION_RESULTS)) {
        const store = db.createObjectStore(STORES.CALCULATION_RESULTS, { keyPath: ["datasetId", "buildingId"] });
        store.createIndex("datasetId", "datasetId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CONFIRMED_VALUATIONS)) {
        const store = db.createObjectStore(STORES.CONFIRMED_VALUATIONS, { keyPath: ["datasetId", "buildingId"] });
        store.createIndex("datasetId", "datasetId", { unique: false });
        store.createIndex("buildingId", "buildingId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.UPLOAD_MAPPINGS)) {
        db.createObjectStore(STORES.UPLOAD_MAPPINGS, { keyPath: "mappingName" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDatasetsByIds(datasetIds: string[]): Promise<void> {
  if (datasetIds.length === 0) return;
  const db = await openDatabase();
  const tx = db.transaction(
    [
      STORES.DATASETS,
      STORES.RAW_LISTINGS,
      STORES.CLEANED_LISTINGS,
      STORES.BUILDING_MEDIANS,
      STORES.CALCULATION_RESULTS,
      STORES.CONFIRMED_VALUATIONS,
    ],
    "readwrite"
  );

  const dsStore = tx.objectStore(STORES.DATASETS);
  datasetIds.forEach((id) => dsStore.delete(id));

  const deleteByDatasetIdIndex = (storeName: string) => {
    const store = tx.objectStore(storeName);
    if (store.indexNames.contains("datasetId")) {
      const idx = store.index("datasetId");
      datasetIds.forEach((id) => {
        const req = idx.openKeyCursor(IDBKeyRange.only(id));
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      });
    } else {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (datasetIds.includes(cursor.value.datasetId)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  };

  deleteByDatasetIdIndex(STORES.RAW_LISTINGS);
  deleteByDatasetIdIndex(STORES.CLEANED_LISTINGS);
  deleteByDatasetIdIndex(STORES.BUILDING_MEDIANS);
  deleteByDatasetIdIndex(STORES.CALCULATION_RESULTS);
  deleteByDatasetIdIndex(STORES.CONFIRMED_VALUATIONS);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllHistoryDatabase(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(
    [
      STORES.DATASETS,
      STORES.RAW_LISTINGS,
      STORES.CLEANED_LISTINGS,
      STORES.BUILDING_MEDIANS,
      STORES.CALCULATION_RESULTS,
      STORES.CONFIRMED_VALUATIONS,
    ],
    "readwrite"
  );

  tx.objectStore(STORES.DATASETS).clear();
  tx.objectStore(STORES.RAW_LISTINGS).clear();
  tx.objectStore(STORES.CLEANED_LISTINGS).clear();
  tx.objectStore(STORES.BUILDING_MEDIANS).clear();
  tx.objectStore(STORES.CALCULATION_RESULTS).clear();
  tx.objectStore(STORES.CONFIRMED_VALUATIONS).clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Seed or Reseed standard 2025 2Q, 3Q, 4Q and 2026 1Q datasets with exact user requested prices:
 * Dangsan: 14,000 KRW
 * Yeongdeungpo: 12,700 KRW
 * Busan: 8,570 KRW
 * Daegu: 5,200 KRW
 * Gwangju: 6,200 KRW
 */
export async function reseedStandardHistoryDatabase(): Promise<void> {
  await clearAllHistoryDatabase();
  const db = await openDatabase();

  const quarters = [
    { year: 2025, quarter: 2, datasetId: "2025-Q2-V1", name: "2025년 2분기 임대기준가 확정 데이터" },
    { year: 2025, quarter: 3, datasetId: "2025-Q3-V1", name: "2025년 3분기 임대기준가 확정 데이터" },
    { year: 2025, quarter: 4, datasetId: "2025-Q4-V1", name: "2025년 4분기 임대기준가 확정 데이터" },
    { year: 2026, quarter: 1, datasetId: "2026-Q1-V1", name: "2026년 1분기 임대기준가 확정 데이터" },
  ];

  const standardPrices: Record<string, { name: string; rent: number; region: string; zone: string }> = {
    dangsan: { name: "당산 우체국보험회관", rent: 14000, region: "서울", zone: "영등포·당산" },
    yeongdeungpo: { name: "영등포 우체국보험회관", rent: 12700, region: "서울", zone: "영등포역" },
    busan: { name: "부산 우체국보험회관", rent: 8570, region: "부산", zone: "부산 중구" },
    daegu: { name: "대구 우체국보험회관", rent: 5200, region: "대구", zone: "대구 남구" },
    gwangju: { name: "광주 우체국보험회관", rent: 6200, region: "광주", zone: "광주 서구" },
  };

  const seedTx = db.transaction(
    [
      STORES.DATASETS,
      STORES.CALCULATION_RESULTS,
      STORES.CONFIRMED_VALUATIONS,
      STORES.UPLOAD_MAPPINGS,
    ],
    "readwrite"
  );

  quarters.forEach((q, idx) => {
    const dsMeta: DatasetMetadata = {
      datasetId: q.datasetId,
      referenceYear: q.year,
      referenceQuarter: q.quarter as 1 | 2 | 3 | 4,
      version: 1,
      status: "confirmed",
      originalFileName: `Crawled_Listings_${q.year}Q${q.quarter}.xlsx`,
      uploadedAt: new Date(q.year, (q.quarter - 1) * 3 + 2, 28).toISOString(),
      uploadedBy: "자산운영담당자",
      fileSize: 128000,
      fileHash: `hash-${q.datasetId}`,
      totalRowCount: 120,
      validRowCount: 118,
      invalidRowCount: 2,
      duplicateRowCount: 0,
      uniqueBuildingCount: 5,
      notes: `${q.year}년 ${q.quarter}분기 정합 기준 임대단가 산정 데이터셋`,
      calculationVersion: "v1.0.0",
      formulaVersion: "FACTOR-MEDIAN-1.0",
      efficiencyRateVersion: `EFF-LOOKUP-${q.year}Q${q.quarter}`,
      applicationVersion: "1.3.0",
    };

    seedTx.objectStore(STORES.DATASETS).put(dsMeta);

    Object.entries(standardPrices).forEach(([bId, bInfo]) => {
      const calcRes: CalculationResult = {
        datasetId: q.datasetId,
        buildingId: bId,
        buildingName: bInfo.name,
        region: bInfo.region,
        zone: bInfo.zone,
        baseRegionalRent: bInfo.rent,
        currentContractRent: bInfo.rent,
        observedFactors: { zone: 1.0, size: 1.0, age: 1.0, total: 1.0 },
        recommendedFactors: { zone: 1.0, size: 1.0, age: 1.0, total: 1.0 },
        appliedFactors: { zone: 1.0, size: 1.0, age: 1.0, total: 1.0 },
        zoneFactorDetail: {
          observedFactor: 1.0,
          recommendedFactor: 1.0,
          appliedFactor: 1.0,
          sampleCount: 10,
          confidenceLow: 0.98,
          confidenceHigh: 1.02,
          reliability: "높음",
          reason: "표본 임대단가 수렴",
        },
        sizeFactorDetail: {
          observedFactor: 1.0,
          recommendedFactor: 1.0,
          appliedFactor: 1.0,
          sampleCount: 5,
          confidenceLow: 0.96,
          confidenceHigh: 1.04,
          reliability: "보통",
          reason: "규모 보정 1.0 수렴",
        },
        ageFactorDetail: {
          observedFactor: 1.0,
          recommendedFactor: 1.0,
          appliedFactor: 1.0,
          sampleCount: 5,
          confidenceLow: 0.95,
          confidenceHigh: 1.05,
          reliability: "보통",
          reason: "연식 보정 1.0 수렴",
        },
        recommendedRent: bInfo.rent,
        finalRent: bInfo.rent,
        calculatedAt: new Date(q.year, (q.quarter - 1) * 3 + 2, 28).toISOString(),
        calculationVersion: "v1.0.0",
        formulaVersion: "FACTOR-MEDIAN-1.0",
      };

      const confVal: ConfirmedValuation = {
        datasetId: q.datasetId,
        buildingId: bId,
        baseRegionalRent: bInfo.rent,
        observedFactors: { zone: 1.0, size: 1.0, age: 1.0 },
        recommendedFactors: { zone: 1.0, size: 1.0, age: 1.0 },
        appliedFactors: { zone: 1.0, size: 1.0, age: 1.0 },
        observedTotalFactor: 1.0,
        recommendedTotalFactor: 1.0,
        appliedTotalFactor: 1.0,
        observedRent: bInfo.rent,
        recommendedRent: bInfo.rent,
        finalRent: bInfo.rent,
        adjustmentReason: `${q.year}년 ${q.quarter}분기 임대기준가격 확정`,
        confirmedBy: "자산운영팀장",
        confirmedAt: new Date(q.year, (q.quarter - 1) * 3 + 2, 28, 10, 0, 0).toISOString(),
      };

      seedTx.objectStore(STORES.CALCULATION_RESULTS).put(calcRes);
      seedTx.objectStore(STORES.CONFIRMED_VALUATIONS).put(confVal);
    });
  });

  return new Promise((resolve, reject) => {
    seedTx.oncomplete = () => resolve();
    seedTx.onerror = () => reject(seedTx.error);
  });
}

/**
 * Seed initial sample datasets if IndexedDB is empty on first boot.
 */
export async function seedInitialDatabaseIfEmpty(): Promise<void> {
  const db = await openDatabase();
  
  const tx = db.transaction(STORES.DATASETS, "readonly");
  const store = tx.objectStore(STORES.DATASETS);
  const countReq = store.count();

  const count = await new Promise<number>((res, rej) => {
    countReq.onsuccess = () => res(countReq.result);
    countReq.onerror = () => rej(countReq.error);
  });

  if (count > 0) {
    return; // Already populated
  }

  await reseedStandardHistoryDatabase();
}
