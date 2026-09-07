/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CleanedListing,
  BuildingMedian,
  CalculationResult,
  FactorDetail,
  QuarterComparison,
  ConfirmedValuation,
} from "../types/dataset";
import { calculateAdjustmentFactors } from "./rentalCalculationEngine";

/**
 * Utility to calculate median of a number array
 */
export function getMedian(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Aggregate cleaned listings into Building Medians (건물별 중앙값)
 */
export function calculateBuildingMedians(
  datasetId: string,
  cleanedListings: CleanedListing[]
): BuildingMedian[] {
  // Group valid listings by building key (normalized address + building name)
  const validListings = cleanedListings.filter((l) => !l.excludeFromCalculation && l.rentPerContractArea > 0);
  const groups = new Map<string, CleanedListing[]>();

  validListings.forEach((l) => {
    const key = `${l.region}_${l.zone}_${l.buildingName}`.trim();
    const list = groups.get(key) || [];
    list.push(l);
    groups.set(key, list);
  });

  const medians: BuildingMedian[] = [];

  groups.forEach((items, key) => {
    const representative = items[0];
    const rents = items.map((i) => i.rentPerContractArea);
    const deposits = items.map((i) => i.depositPerSqm);
    const maints = items.map((i) => i.maintenancePerSqm);

    medians.push({
      datasetId,
      buildingId: `bldg-${key.replace(/\s+/g, "-")}`,
      buildingName: representative.buildingName,
      normalizedAddress: representative.address,
      region: representative.region,
      zone: representative.zone,
      primaryUse: representative.primaryUse,
      completionYear: representative.completionYear,
      grossArea: representative.grossArea,
      subwayDistance: representative.subwayDistance,
      validListingCount: items.length,
      buildingMedianRent: getMedian(rents),
      buildingMedianDeposit: getMedian(deposits),
      buildingMedianMaintenance: getMedian(maints),
    });
  });

  return medians;
}

/**
 * Bootstrap Resampling to calculate 95% Confidence Interval for factor values
 */
export function calculateBootstrapFactorCI(
  sampleRents: number[],
  baseMedian: number,
  iterations = 1000
): { factor: number; ciLow: number; ciHigh: number } {
  if (!sampleRents || sampleRents.length === 0 || baseMedian <= 0) {
    return { factor: 1.0, ciLow: 1.0, ciHigh: 1.0 };
  }

  const sampleMed = getMedian(sampleRents);
  const observedFactor = Number((sampleMed / baseMedian).toFixed(3));

  if (sampleRents.length <= 2) {
    return { factor: observedFactor, ciLow: observedFactor * 0.9, ciHigh: observedFactor * 1.1 };
  }

  const bootstrapMedians: number[] = [];
  const n = sampleRents.length;

  for (let iter = 0; iter < iterations; iter++) {
    const resample: number[] = [];
    for (let i = 0; i < n; i++) {
      const randIdx = Math.floor(Math.random() * n);
      resample.push(sampleRents[randIdx]);
    }
    const bMed = getMedian(resample);
    bootstrapMedians.push(bMed / baseMedian);
  }

  bootstrapMedians.sort((a, b) => a - b);
  const lowIdx = Math.floor(iterations * 0.025);
  const highIdx = Math.floor(iterations * 0.975);

  const ciLow = Number((bootstrapMedians[lowIdx] || observedFactor).toFixed(3));
  const ciHigh = Number((bootstrapMedians[highIdx] || observedFactor).toFixed(3));

  return { factor: observedFactor, ciLow, ciHigh };
}

/**
 * Determine AI recommended factor based on bootstrap 95% CI and sample count rules
 */
export function determineRecommendedFactor(
  observedFactor: number,
  ciLow: number,
  ciHigh: number,
  sampleCount: number,
  factorName: string
): FactorDetail {
  let reliability: FactorDetail["reliability"] = "높음";
  const recommendedFactor = observedFactor > 0 ? observedFactor : 1.0;
  let reason = "";

  if (sampleCount <= 2) {
    reliability = "표본 부족";
    reason = `비교 건물 ${sampleCount}개로 관측 ${factorName}보정계수 ${recommendedFactor.toFixed(3)} 반영.`;
  } else if (sampleCount <= 4) {
    reliability = "신뢰도 낮음";
    reason = `관측 ${factorName}보정계수 ${recommendedFactor.toFixed(3)} 반영 (${reliability}).`;
  } else if (sampleCount <= 9) {
    reliability = "신뢰도 보통";
    reason = `관측 ${factorName}보정계수 ${recommendedFactor.toFixed(3)} 반영 (${reliability}).`;
  } else {
    reliability = "높음";
    reason = `관측 ${factorName}보정계수 ${recommendedFactor.toFixed(3)} 반영 (${reliability}).`;
  }

  return {
    observedFactor,
    recommendedFactor,
    appliedFactor: recommendedFactor,
    sampleCount,
    confidenceLow: ciLow,
    confidenceHigh: ciHigh,
    reliability,
    reason,
  };
}

/**
 * Calculate full factor analysis and baseline rents for all insurance buildings
 */
export function calculateDatasetValuations(
  datasetId: string,
  buildingMedians: BuildingMedian[]
): CalculationResult[] {
  return calculateAdjustmentFactors(buildingMedians, datasetId);
}

/**
 * Compare current active dataset with previous confirmed dataset
 */
export function compareQuarterDatasets(
  currentCalc: CalculationResult,
  previousConfirmed: ConfirmedValuation | null,
  currentDatasetLabel: string,
  previousDatasetLabel: string,
  currentListingsCount: number,
  previousListingsCount: number,
  currentUniqueBuildings: number,
  previousUniqueBuildings: number
): QuarterComparison {
  const prevRent = previousConfirmed ? previousConfirmed.finalRent : currentCalc.baseRegionalRent * 0.95;
  const currRent = currentCalc.finalRent;

  const getMetricDiff = (curr: number, prev: number) => {
    const change = curr - prev;
    const percentChange = prev > 0 ? Number(((change / prev) * 100).toFixed(1)) : 0;
    return { current: curr, previous: prev, change, percentChange };
  };

  return {
    currentDatasetId: currentCalc.datasetId,
    previousDatasetId: previousConfirmed ? previousConfirmed.datasetId : null,
    currentQuarterLabel: currentDatasetLabel,
    previousQuarterLabel: previousDatasetLabel,
    metrics: {
      totalListings: getMetricDiff(currentListingsCount, previousListingsCount),
      uniqueBuildings: getMetricDiff(currentUniqueBuildings, previousUniqueBuildings),
      baseRegionalRent: getMetricDiff(
        currentCalc.baseRegionalRent,
        previousConfirmed ? previousConfirmed.baseRegionalRent : currentCalc.baseRegionalRent * 0.95
      ),
      zoneFactor: getMetricDiff(
        currentCalc.appliedFactors.zone,
        previousConfirmed ? previousConfirmed.appliedFactors.zone : 1.05
      ),
      sizeFactor: getMetricDiff(
        currentCalc.appliedFactors.size,
        previousConfirmed ? previousConfirmed.appliedFactors.size : 1.0
      ),
      ageFactor: getMetricDiff(
        currentCalc.appliedFactors.age,
        previousConfirmed ? previousConfirmed.appliedFactors.age : 1.0
      ),
      recommendedRent: getMetricDiff(
        currentCalc.recommendedRent,
        previousConfirmed ? previousConfirmed.recommendedRent : currentCalc.recommendedRent * 0.95
      ),
      finalRent: getMetricDiff(currRent, prevRent),
    },
  };
}

