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
const DB_VERSION = 2;  // v2: 방법2 시트 저장소 추가

export const STORES = {
  DATASETS: "datasets",
  RAW_LISTINGS: "rawListings",
  CLEANED_LISTINGS: "cleanedListings",
  BUILDING_MEDIANS: "buildingMedians",
  CALCULATION_RESULTS: "calculationResults",
  CONFIRMED_VALUATIONS: "confirmedValuations",
  UPLOAD_MAPPINGS: "uploadMappings",
  METHOD2: "method2Sheets",
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

      // v2 추가. 기존 저장소는 위 가드 덕분에 그대로 유지된다(기존 데이터 보존).
      if (!db.objectStoreNames.contains(STORES.METHOD2)) {
        db.createObjectStore(STORES.METHOD2, { keyPath: "datasetId" });
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
