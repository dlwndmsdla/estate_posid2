/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrdCandidateBuilding, prdDataset, activeBuildingsInfo } from "./prdDataset";

export interface ValuationMetrics {
  medianMonthlyRent: number;
  meanMonthlyRent: number;
  medianDeposit: number;
  meanDeposit: number;
  medianMaintenance: number;
  meanMaintenance: number;
  minMonthlyRent: number;
  maxMonthlyRent: number;
  stdDevMonthlyRent: number;
}

export interface ProcessingStepReport {
  step: number;
  title: string;
  description: string;
  status: "success" | "info" | "warning";
  details: string;
}

export interface SelectionEngineResult {
  activeHub: typeof activeBuildingsInfo[0];
  selectedQuarter: string;
  selectedYear: number;
  allRawCandidates: PrdCandidateBuilding[];
  
  // Pipeline filter outputs
  radiusUsed: number; // 1100 or 1500
  initialRadiusCount: number;
  wasExpanded: boolean;
  
  sameTradeAreaCount: number;
  priorityValidCount: number;
  officeSuitableCount: number;
  
  // Processed collections
  comparables: (PrdCandidateBuilding & {
    priorityRank: number; // 1, 2, 3, 4
    sizeClass: "소형" | "중형" | "대형";
    isSameTradeArea: boolean;
    isOutlier: boolean;
    outlierReason: string;
  })[];
  
  metrics: ValuationMetrics;
  processingSteps: ProcessingStepReport[];
}

export function sortAsc(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

export function calculateMedian(vals: number[]): number {
  if (vals.length === 0) return 0;
  const sorted = sortAsc(vals);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateMean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((sum, v) => sum + v, 0) / vals.length;
}

export function calculateStdDev(vals: number[], mean: number): number {
  if (vals.length <= 1) return 0;
  const sumSqDiff = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
  return Math.sqrt(sumSqDiff / (vals.length - 1));
}

export function executePrdSelection(
  hubId: string,
  year: number,
  quarter: string
): SelectionEngineResult {
  const activeHub = activeBuildingsInfo.find((b) => b.id === hubId) || activeBuildingsInfo[0];
  
  // 1. Gather raw pool matching region, year, and quarter
  const regionRawData = prdDataset.filter(
    (b) => b.city === activeHub.city && b.year === year && b.quarter === quarter
  );

  const processingSteps: ProcessingStepReport[] = [];
  
  // STEP 1: Secure anchor coordinates
  processingSteps.push({
    step: 1,
    title: "보험회관 위도·경도 및 기준 상권 축 확보 완료",
    description: "선택된 회관의 공간 좌표 및 한국부동산원 획정 거래 상권 기준을 인식합니다.",
    status: "success",
    details: `${activeHub.name} (${activeHub.address})의 지리 정보를 파악하였습니다. 한국부동산원 기준 매칭할 획정 상권은 [${activeHub.tradeArea}] 입니다.`
  });

  // STEP 2: Range search
  let radius = 1100; // 1.1km base
  let radiusCandidates = regionRawData.filter((b) => b.distanceMeters <= radius);
  let wasExpanded = false;

  const initialRadiusCount = radiusCandidates.length;

  // STEP 3: Check candidate abundance. If candidates in radius < 10, expand to 1.5km
  if (radiusCandidates.length < 10) {
    radius = 1500;
    radiusCandidates = regionRawData.filter((b) => b.distanceMeters <= radius);
    wasExpanded = true;
    processingSteps.push({
      step: 2,
      title: `수집 범위 반경 확대 의사결정 수립 (1.1km ➔ 1.5km)`,
      description: "기본 검색 충족 모수 미달(10개 미만)에 따른 대체 조사구 확대 기준이 적용되었습니다.",
      status: "warning",
      details: `1.1km 이내 표본 수(${initialRadiusCount}개) 부족으로 의사결정 프로세스 STEP 3에 의거하여 반경을 1.5km(도보 약 20~23분)로 긴급 증폭하였습니다.`
    });
  } else {
    processingSteps.push({
      step: 2,
      title: `기본 수집 범위 만족 (반경 1.1km 유지)`,
      description: "도보 약 15분 반경 내 업무지구 매물이 충분하여 정밀 단일 상권 조사를 개시합니다.",
      status: "success",
      details: `1.1km 이내 수집 표본 수 ${initialRadiusCount}개로, 10개 이상 기준을 충족하여 관할 범위를 고정합니다.`
    });
  }

  // STEP 4 & 5: Trade Area Identification & Suitability audit
  const suitabilityReport: string[] = [];
  
  const formattedCandidates = radiusCandidates.map((b) => {
    // Determine priority ranks:
    // 1순위: 업무시설
    // 2순위: 업무시설 + 근린생활시설 복합건물
    // 3순위: 제1/2종 근린생활시설
    // 4순위: 지식산업센터, 업무용 오피스텔
    const use = b.useType;
    let rank = 99; // Default invalid
    if (use === "업무시설") rank = 1;
    else if (use.includes("복합") || use.includes("업무시설+")) rank = 2;
    else if (use.includes("근린생활시설")) rank = 3;
    else if (use === "지식산업센터" || use === "업무용 오피스텔") rank = 4;

    // Size classifications:
    // 소형 < 9,917㎡, 중형 9,917 ~ 33,058, 대형 >= 33,058
    let sizeClass: "소형" | "중형" | "대형" = "소형";
    if (b.grossAreaSqm >= 33058) sizeClass = "대형";
    else if (b.grossAreaSqm >= 9917) sizeClass = "중형";

    return {
      ...b,
      priorityRank: rank,
      sizeClass,
      isSameTradeArea: b.tradeArea === activeHub.tradeArea,
    };
  });

  // Filter out excludes (actualOfficeRentable === false or rank === 99)
  const officeFiltered = formattedCandidates.filter((b) => {
    return b.actualOfficeRentable && b.priorityRank <= 4;
  });

  const excludedCount = formattedCandidates.length - officeFiltered.length;
  
  processingSteps.push({
    step: 3,
    title: "사무 임차 불가 및 비업무 제외 필터링 가동 (Exclusion Filter)",
    description: "순수 상가, 판매 지배형, 주거 시설 및 미임대 자산을 임대평가 그룹에서 완전 배제합니다.",
    status: excludedCount > 0 ? "warning" : "success",
    details: `순수상가 등 사무 외 용도 부적합 자산 ${excludedCount}개 제거 후 실제 오피스 거래가 활성화된 대조군 ${officeFiltered.length}개를 확보하였습니다.`
  });

  // Sort according to priority criteria:
  // 1. Same Trade Area (Highest rank)
  // 2. Priority Rank (1순위 > 2순위...)
  // 3. Distance (Closer is better)
  // 4. Size correlation (matching activeHub size class)
  // 5. Depreciation Age similarity
  const activeHubSizeClass = activeHub.grossAreaSqm >= 33058 ? "대형" : activeHub.grossAreaSqm >= 9917 ? "중형" : "소형";

  const sortedCandidates = [...officeFiltered].sort((a, b) => {
    // 1. Same Trade Area
    if (a.isSameTradeArea && !b.isSameTradeArea) return -1;
    if (!a.isSameTradeArea && b.isSameTradeArea) return 1;

    // 2. Priority Rank
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }

    // 3. Distance
    if (Math.abs(a.distanceMeters - b.distanceMeters) > 50) {
      return a.distanceMeters - b.distanceMeters;
    }

    // 4. Size match
    const aSizeMatch = a.sizeClass === activeHubSizeClass;
    const bSizeMatch = b.sizeClass === activeHubSizeClass;
    if (aSizeMatch && !bSizeMatch) return -1;
    if (!aSizeMatch && bSizeMatch) return 1;

    // 5. Built year similarity
    const aAgeDiff = Math.abs(a.builtYear - activeHub.builtYear);
    const bAgeDiff = Math.abs(b.builtYear - activeHub.builtYear);
    return aAgeDiff - bAgeDiff;
  });

  processingSteps.push({
    step: 4,
    title: "상권·용도·거리 연립 우선순위 정렬 시스템 시행",
    description: "동일상권 여부를 최선도로 하여 거리 ➔ 규모 상관율 ➔ 노후도 순으로 가중 배열합니다.",
    status: "success",
    details: `부동산원 획정 구획 [${activeHub.tradeArea}] 매물을 1순위 Peer Group으로 격상하고 순위화 배정을 완료하였습니다.`
  });

  // Calculate Median pricing for Outlier reference.
  const rawRents = sortedCandidates.map((c) => c.monthlyRentPerSqm);
  const rawDeposits = sortedCandidates.map((c) => c.depositPerSqm);
  const rawMaintenances = sortedCandidates.map((c) => c.maintenancePerSqm);

  const medianRent = calculateMedian(rawRents);
  const medianDeposit = calculateMedian(rawDeposits);
  const medianMaint = calculateMedian(rawMaintenances);

  // STEP 6: Outlier audit
  // Outliers: monthlyRentPerSqm or maintenancePerSqm diff >= 30% from Trade Area Median
  const comparablesWithOutliers = sortedCandidates.map((c) => {
    const rentDiffPercent = Math.abs(c.monthlyRentPerSqm - medianRent) / (medianRent || 1);
    const maintDiffPercent = Math.abs(c.maintenancePerSqm - medianMaint) / (medianMaint || 1);
    
    let isOutlier = false;
    let outlierReason = "";

    if (rentDiffPercent >= 0.3) {
      isOutlier = true;
      outlierReason += `월세 단가가 상권 중앙값(${medianRent.toFixed(2)}만원) 대비 ${(rentDiffPercent * 100).toFixed(0)}% 급격히 이탈하였습니다. (검토 요망) `;
    }
    if (maintDiffPercent >= 0.3) {
      isOutlier = true;
      outlierReason += `관리비 단가가 상권 중앙값(${medianMaint.toFixed(2)}만원) 대비 ${(maintDiffPercent * 100).toFixed(0)}% 이상 격차를 보입니다.`;
    }

    return {
      ...c,
      isOutlier,
      outlierReason,
    };
  });

  const outlierCount = comparablesWithOutliers.filter((c) => c.isOutlier).length;

  processingSteps.push({
    step: 5,
    title: `실시간 가격 이상치 가청도 조사 (±30% 임계점 초과 모니터링)`,
    description: "업계 평균을 왜곡하는 고가 법률 자산 또는 소형 매매를 AI 정밀 추적합니다.",
    status: outlierCount > 0 ? "warning" : "success",
    details: `상권 기준 월세/관리비 중앙값 대비 ±30% 이상 이탈한 특이 매물 ${outlierCount}건 감하 표시 처리를 수신하였습니다 (담당자 직권 판단 지원).`
  });

  // STEP 7: Formulate comparative metrics
  const activeRentals = comparablesWithOutliers.map((c) => c.monthlyRentPerSqm);
  const activeDeposits = comparablesWithOutliers.map((c) => c.depositPerSqm);
  const activeMaintenances = comparablesWithOutliers.map((c) => c.maintenancePerSqm);

  const finalMedianRent = calculateMedian(activeRentals);
  const finalMeanRent = calculateMean(activeRentals);
  
  const finalMedianDeposit = calculateMedian(activeDeposits);
  const finalMeanDeposit = calculateMean(activeDeposits);

  const finalMedianMaint = calculateMedian(activeMaintenances);
  const finalMeanMaint = calculateMean(activeMaintenances);

  const minRent = activeRentals.length > 0 ? Math.min(...activeRentals) : 0;
  const maxRent = activeRentals.length > 0 ? Math.max(...activeRentals) : 0;
  const stdDevRent = calculateStdDev(activeRentals, finalMeanRent);

  processingSteps.push({
    step: 6,
    title: "설명적 중앙값 통계 정위 산출 (Optimal Median Calculation)",
    description: "고가/사옥형 왜곡 왜란 억제를 위해 산술 평균이 아닌 중앙값(Median) 임대 단가를 도출합니다.",
    status: "success",
    details: `도출임대 중앙값: ${finalMedianRent.toFixed(2)}만원/㎡, 도출관리 중앙값: ${finalMedianMaint.toFixed(2)}만원/㎡ 정합 배치가 실현되었습니다.`
  });

  return {
    activeHub,
    selectedQuarter: quarter,
    selectedYear: year,
    allRawCandidates: regionRawData,
    
    radiusUsed: radius,
    initialRadiusCount,
    wasExpanded,
    
    sameTradeAreaCount: comparablesWithOutliers.filter((c) => c.isSameTradeArea).length,
    priorityValidCount: comparablesWithOutliers.length,
    officeSuitableCount: officeFiltered.length,
    
    comparables: comparablesWithOutliers,
    
    metrics: {
      medianMonthlyRent: finalMedianRent,
      meanMonthlyRent: finalMeanRent,
      medianDeposit: finalMedianDeposit,
      meanDeposit: finalMeanDeposit,
      medianMaintenance: finalMedianMaint,
      meanMaintenance: finalMeanMaint,
      minMonthlyRent: minRent,
      maxMonthlyRent: maxRent,
      stdDevMonthlyRent: stdDevRent,
    },
    processingSteps,
  };
}
