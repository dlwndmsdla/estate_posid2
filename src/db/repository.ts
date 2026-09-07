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
  DatasetStatus,
  Method2SheetData,
} from "../types/dataset";
import { openDatabase, STORES } from "./idb";

export interface IDatasetRepository {
  createDataset(metadata: DatasetMetadata): Promise<void>;
  getDataset(datasetId: string): Promise<DatasetMetadata | null>;
  listDatasets(includeArchived?: boolean): Promise<DatasetMetadata[]>;
  updateDatasetStatus(datasetId: string, status: DatasetStatus): Promise<void>;
  archiveDataset(datasetId: string): Promise<void>;
}

export interface IListingRepository {
  saveRawListings(datasetId: string, rows: RawListing[]): Promise<void>;
  saveCleanedListings(datasetId: string, rows: CleanedListing[]): Promise<void>;
  getRawListings(datasetId: string): Promise<RawListing[]>;
  getCleanedListings(datasetId: string): Promise<CleanedListing[]>;
  saveBuildingMedians(datasetId: string, medians: BuildingMedian[]): Promise<void>;
  getBuildingMedians(datasetId: string): Promise<BuildingMedian[]>;
}

export interface IValuationRepository {
  saveCalculationResult(result: CalculationResult): Promise<void>;
  saveCalculationResults(results: CalculationResult[]): Promise<void>;
  getCalculationResult(datasetId: string, buildingId: string): Promise<CalculationResult | null>;
  getCalculationResultsByDataset(datasetId: string): Promise<CalculationResult[]>;
  saveConfirmedValuation(result: ConfirmedValuation): Promise<void>;
  getConfirmedValuation(datasetId: string, buildingId: string): Promise<ConfirmedValuation | null>;
  listValuationsByBuilding(buildingId: string): Promise<ConfirmedValuation[]>;
  listConfirmedValuationsByDataset(datasetId: string): Promise<ConfirmedValuation[]>;
}

export interface IMappingRepository {
  getMappingRule(): Promise<Record<string, string>>;
  saveMappingRule(mapping: Record<string, string>): Promise<void>;
}

export class DatasetRepository implements IDatasetRepository {
  async createDataset(metadata: DatasetMetadata): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DATASETS, "readwrite");
      const store = tx.objectStore(STORES.DATASETS);
      store.put(metadata);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getDataset(datasetId: string): Promise<DatasetMetadata | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DATASETS, "readonly");
      const store = tx.objectStore(STORES.DATASETS);
      const req = store.get(datasetId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async listDatasets(includeArchived = false): Promise<DatasetMetadata[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DATASETS, "readonly");
      const store = tx.objectStore(STORES.DATASETS);
      const req = store.getAll();
      req.onsuccess = () => {
        let results: DatasetMetadata[] = req.result || [];
        if (!includeArchived) {
          results = results.filter((d) => !d.isArchived);
        }
        // Sort newest uploaded first
        results.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async updateDatasetStatus(datasetId: string, status: DatasetStatus): Promise<void> {
    const dataset = await this.getDataset(datasetId);
    if (!dataset) return;
    dataset.status = status;
    await this.createDataset(dataset);
  }

  async archiveDataset(datasetId: string): Promise<void> {
    const dataset = await this.getDataset(datasetId);
    if (!dataset) return;
    dataset.isArchived = true;
    await this.createDataset(dataset);
  }
}

export class ListingRepository implements IListingRepository {
  async saveRawListings(datasetId: string, rows: RawListing[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RAW_LISTINGS, "readwrite");
      const store = tx.objectStore(STORES.RAW_LISTINGS);
      rows.forEach((row) => store.put({ ...row, datasetId }));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveCleanedListings(datasetId: string, rows: CleanedListing[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CLEANED_LISTINGS, "readwrite");
      const store = tx.objectStore(STORES.CLEANED_LISTINGS);
      rows.forEach((row) => store.put({ ...row, datasetId }));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRawListings(datasetId: string): Promise<RawListing[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RAW_LISTINGS, "readonly");
      const store = tx.objectStore(STORES.RAW_LISTINGS);
      const index = store.index("datasetId");
      const req = index.getAll(datasetId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getCleanedListings(datasetId: string): Promise<CleanedListing[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CLEANED_LISTINGS, "readonly");
      const store = tx.objectStore(STORES.CLEANED_LISTINGS);
      const index = store.index("datasetId");
      const req = index.getAll(datasetId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveBuildingMedians(datasetId: string, medians: BuildingMedian[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BUILDING_MEDIANS, "readwrite");
      const store = tx.objectStore(STORES.BUILDING_MEDIANS);
      medians.forEach((m) => store.put({ ...m, datasetId }));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getBuildingMedians(datasetId: string): Promise<BuildingMedian[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BUILDING_MEDIANS, "readonly");
      const store = tx.objectStore(STORES.BUILDING_MEDIANS);
      const index = store.index("datasetId");
      const req = index.getAll(datasetId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}

export class ValuationRepository implements IValuationRepository {
  async saveCalculationResult(result: CalculationResult): Promise<void> {
    await this.saveCalculationResults([result]);
  }

  async saveCalculationResults(results: CalculationResult[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CALCULATION_RESULTS, "readwrite");
      const store = tx.objectStore(STORES.CALCULATION_RESULTS);
      results.forEach((r) => store.put(r));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCalculationResult(datasetId: string, buildingId: string): Promise<CalculationResult | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CALCULATION_RESULTS, "readonly");
      const store = tx.objectStore(STORES.CALCULATION_RESULTS);
      const req = store.get([datasetId, buildingId]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getCalculationResultsByDataset(datasetId: string): Promise<CalculationResult[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CALCULATION_RESULTS, "readonly");
      const store = tx.objectStore(STORES.CALCULATION_RESULTS);
      const index = store.index("datasetId");
      const req = index.getAll(datasetId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveConfirmedValuation(result: ConfirmedValuation): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CONFIRMED_VALUATIONS, "readwrite");
      const store = tx.objectStore(STORES.CONFIRMED_VALUATIONS);
      store.put(result);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getConfirmedValuation(datasetId: string, buildingId: string): Promise<ConfirmedValuation | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CONFIRMED_VALUATIONS, "readonly");
      const store = tx.objectStore(STORES.CONFIRMED_VALUATIONS);
      const req = store.get([datasetId, buildingId]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async listValuationsByBuilding(buildingId: string): Promise<ConfirmedValuation[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CONFIRMED_VALUATIONS, "readonly");
      const store = tx.objectStore(STORES.CONFIRMED_VALUATIONS);
      const index = store.index("buildingId");
      const req = index.getAll(buildingId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async listConfirmedValuationsByDataset(datasetId: string): Promise<ConfirmedValuation[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CONFIRMED_VALUATIONS, "readonly");
      const store = tx.objectStore(STORES.CONFIRMED_VALUATIONS);
      const index = store.index("datasetId");
      const req = index.getAll(datasetId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async listAllConfirmedValuations(): Promise<ConfirmedValuation[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CONFIRMED_VALUATIONS, "readonly");
      const store = tx.objectStore(STORES.CONFIRMED_VALUATIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}

/** 방법2 시트 — 데이터셋 1개당 1건. 사이트가 계산하지 않고 엑셀에서 읽은 값을 그대로 보관한다. */
export class Method2Repository {
  async save(data: Method2SheetData): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.METHOD2, "readwrite");
      tx.objectStore(STORES.METHOD2).put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(datasetId: string): Promise<Method2SheetData | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.METHOD2, "readonly");
      const req = tx.objectStore(STORES.METHOD2).get(datasetId);
      req.onsuccess = () => resolve((req.result as Method2SheetData) || null);
      req.onerror = () => reject(req.error);
    });
  }
}

export class MappingRepository implements IMappingRepository {
  async getMappingRule(): Promise<Record<string, string>> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.UPLOAD_MAPPINGS, "readonly");
      const store = tx.objectStore(STORES.UPLOAD_MAPPINGS);
      const req = store.get("defaultMapping");
      req.onsuccess = () => {
        resolve(req.result?.mapping || {
          "소재지": "주소",
          "건축년도": "준공연도",
          "건축연도": "준공연도",
          "임대면적(㎡)": "임대면적",
          "전용면적(㎡)": "전용면적",
          "보증금(만원)": "보증금",
          "월임대료(만원)": "월임대료",
          "관리비(만원)": "관리비",
          "출처": "데이터출처",
        });
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveMappingRule(mapping: Record<string, string>): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.UPLOAD_MAPPINGS, "readwrite");
      const store = tx.objectStore(STORES.UPLOAD_MAPPINGS);
      store.put({ mappingName: "defaultMapping", mapping, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const datasetRepository = new DatasetRepository();
export const listingRepository = new ListingRepository();
export const valuationRepository = new ValuationRepository();
export const mappingRepository = new MappingRepository();
export const method2Repository = new Method2Repository();
