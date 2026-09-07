/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CalculationResult,
  QuarterComparison,
  ConfirmedValuation,
} from "../types/dataset";

/**
 * 분기 비교 표 한 줄. 산정 자체는 여기서 하지 않는다.
 *
 * 이 파일에는 원래 두 번째 산정 경로(getMedian·calculateBuildingMedians·
 * calculateDatasetValuations)와 쓰이지 않는 Bootstrap 신뢰구간 계산이 함께
 * 있었다. 그 경로는 전용률을 전국 일괄 62%로 놓고 계산해 정식 경로와 다른
 * 답을 냈다. 산정은 rentalCalculationEngine 의 runValuationPipeline 하나뿐이다.
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

