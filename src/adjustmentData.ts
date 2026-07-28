/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BuildingAdjustmentConfig } from "./types";

export const initialAdjustmentConfigs: Record<string, BuildingAdjustmentConfig> = {
  // 서울회관 (당산 / 영등포)
  dangsan: {
    baseRegionalRent: 12543,
    currentContractRent: 13487,
    zone: {
      observedFactor: 0.813,
      recommendedFactor: 0.813,
      appliedFactor: 0.813,
      sampleCount: 15,
      confidenceLow: 0.770,
      confidenceHigh: 0.880,
      reliability: "높음",
      reason: "권역 중앙값 10,201 / 지역 기준가 12,543 = 0.813 반영",
      baseGroupMedian: 12543,
      targetGroupMedian: 10201,
    },
    size: {
      observedFactor: 1.294,
      recommendedFactor: 1.294,
      appliedFactor: 1.294,
      sampleCount: 6,
      confidenceLow: 1.150,
      confidenceHigh: 1.450,
      reliability: "높음",
      reason: "동일규모 중앙값 13,202 / 권역 중앙값 10,201 = 1.294 반영",
      baseGroupMedian: 10201,
      targetGroupMedian: 13202,
    },
    age: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 5,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "높음",
      reason: "유사연식·유사규모 중앙값 13,202 / 유사규모 중앙값 13,202 = 1.000 반영",
      baseGroupMedian: 13202,
      targetGroupMedian: 13202,
    },
    marketPolicy: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 1,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "높음",
      reason: "인근 오피스 공실률 및 시장 상황 보정 (기본 1.000)",
      baseGroupMedian: 13202,
      targetGroupMedian: 13202,
    },
    adjustmentReason: "",
  },

  yeongdeungpo: {
    baseRegionalRent: 12543,
    currentContractRent: 13850,
    zone: {
      observedFactor: 0.813,
      recommendedFactor: 0.813,
      appliedFactor: 0.813,
      sampleCount: 15,
      confidenceLow: 0.770,
      confidenceHigh: 0.880,
      reliability: "높음",
      reason: "권역 중앙값 10,201 / 지역 기준가 12,543 = 0.813 반영",
      baseGroupMedian: 12543,
      targetGroupMedian: 10201,
    },
    size: {
      observedFactor: 1.294,
      recommendedFactor: 1.294,
      appliedFactor: 1.294,
      sampleCount: 6,
      confidenceLow: 1.150,
      confidenceHigh: 1.450,
      reliability: "높음",
      reason: "동일규모 중앙값 13,202 / 권역 중앙값 10,201 = 1.294 반영",
      baseGroupMedian: 10201,
      targetGroupMedian: 13202,
    },
    age: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 5,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "높음",
      reason: "유사연식·유사규모 중앙값 13,202 / 유사규모 중앙값 13,202 = 1.000 반영",
      baseGroupMedian: 13202,
      targetGroupMedian: 13202,
    },
    marketPolicy: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 1,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "높음",
      reason: "인근 오피스 공실률 및 시장 상황 보정 (기본 1.000)",
      baseGroupMedian: 13202,
      targetGroupMedian: 13202,
    },
    adjustmentReason: "",
  },

  // 부산회관
  busan: {
    baseRegionalRent: 8926,
    currentContractRent: 9459,
    zone: {
      observedFactor: 0.904,
      recommendedFactor: 0.904,
      appliedFactor: 0.904,
      sampleCount: 29,
      confidenceLow: 0.829,
      confidenceHigh: 1.036,
      reliability: "높음",
      reason: "권역 중앙값 8,069 / 지역 중앙값 8,926 = 0.904 반영",
      baseGroupMedian: 8926,
      targetGroupMedian: 8069,
    },
    size: {
      observedFactor: 1.147,
      recommendedFactor: 1.147,
      appliedFactor: 1.147,
      sampleCount: 11,
      confidenceLow: 1.005,
      confidenceHigh: 1.415,
      reliability: "높음",
      reason: "동일규모 중앙값 9,255 / 권역 중앙값 8,069 = 1.147 반영",
      baseGroupMedian: 8069,
      targetGroupMedian: 9255,
    },
    age: {
      observedFactor: 0.906,
      recommendedFactor: 0.906,
      appliedFactor: 0.906,
      sampleCount: 5,
      confidenceLow: 0.776,
      confidenceHigh: 1.050,
      reliability: "보통",
      reason: "유사연식·유사규모 중앙값 8,385 / 유사규모 중앙값 9,255 = 0.906 반영",
      baseGroupMedian: 9255,
      targetGroupMedian: 8385,
    },
    marketPolicy: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 1,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "높음",
      reason: "인근 오피스 공실률 및 시장 상황 보정 (기본 1.000)",
      baseGroupMedian: 8385,
      targetGroupMedian: 8385,
    },
    adjustmentReason: "",
  },

  // 대구회관
  daegu: {
    baseRegionalRent: 9001,
    currentContractRent: 5634,
    zone: {
      observedFactor: 1.052,
      recommendedFactor: 1.052,
      appliedFactor: 1.052,
      sampleCount: 16,
      confidenceLow: 0.950,
      confidenceHigh: 1.131,
      reliability: "높음",
      reason: "권역 중앙값 9,469 / 지역 중앙값 9,001 = 1.052 반영",
      baseGroupMedian: 9001,
      targetGroupMedian: 9469,
    },
    size: {
      observedFactor: 1.013,
      recommendedFactor: 1.013,
      appliedFactor: 1.013,
      sampleCount: 5,
      confidenceLow: 0.850,
      confidenceHigh: 1.200,
      reliability: "보통",
      reason: "동일규모 중앙값 9,592 / 권역 중앙값 9,469 = 1.013 반영",
      baseGroupMedian: 9469,
      targetGroupMedian: 9592,
    },
    age: {
      observedFactor: 0.816,
      recommendedFactor: 0.816,
      appliedFactor: 0.816,
      sampleCount: 4,
      confidenceLow: 0.650,
      confidenceHigh: 0.950,
      reliability: "보통",
      reason: "유사연식·유사규모 중앙값 7,827 / 유사규모 중앙값 9,592 = 0.816 반영",
      baseGroupMedian: 9592,
      targetGroupMedian: 7827,
    },
    marketPolicy: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 1,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "높음",
      reason: "인근 오피스 공실률 및 시장 상황 보정 (기본 1.000)",
      baseGroupMedian: 7827,
      targetGroupMedian: 7827,
    },
    adjustmentReason: "",
  },

  // 광주회관
  gwangju: {
    baseRegionalRent: 7485,
    currentContractRent: 7077,
    zone: {
      observedFactor: 1.169,
      recommendedFactor: 1.169,
      appliedFactor: 1.169,
      sampleCount: 17,
      confidenceLow: 1.027,
      confidenceHigh: 1.361,
      reliability: "높음",
      reason: "권역 중앙값 8,750 / 지역 중앙값 7,485 = 1.169 반영",
      baseGroupMedian: 7485,
      targetGroupMedian: 8750,
    },
    size: {
      observedFactor: 0.936,
      recommendedFactor: 0.936,
      appliedFactor: 0.936,
      sampleCount: 7,
      confidenceLow: 0.816,
      confidenceHigh: 1.050,
      reliability: "보통",
      reason: "동일규모 중앙값 8,190 / 권역 중앙값 8,750 = 0.936 반영",
      baseGroupMedian: 8750,
      targetGroupMedian: 8190,
    },
    age: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 7,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "보통",
      reason: "유사연식·유사규모 중앙값 8,190 / 유사규모 중앙값 8,190 = 1.000 반영",
      baseGroupMedian: 8190,
      targetGroupMedian: 8190,
    },
    marketPolicy: {
      observedFactor: 1.000,
      recommendedFactor: 1.000,
      appliedFactor: 1.000,
      sampleCount: 1,
      confidenceLow: 0.900,
      confidenceHigh: 1.100,
      reliability: "높음",
      reason: "인근 오피스 공실률 및 시장 상황 보정 (기본 1.000)",
      baseGroupMedian: 8190,
      targetGroupMedian: 8190,
    },
    adjustmentReason: "",
  },
};

export function calculateAdjustmentSummary(config: BuildingAdjustmentConfig) {
  const { baseRegionalRent, currentContractRent, zone, size, age, marketPolicy } = config;

  const mObserved = marketPolicy?.observedFactor ?? 1.0;
  const mRecommended = marketPolicy?.recommendedFactor ?? 1.0;
  const mApplied = marketPolicy?.appliedFactor ?? 1.0;

  // 관측 종합보정계수
  const totalObservedFactor = zone.observedFactor * size.observedFactor * age.observedFactor * mObserved;

  // AI 추천 종합보정계수
  const totalRecommendedFactor = zone.recommendedFactor * size.recommendedFactor * age.recommendedFactor * mRecommended;

  // 담당자 종합보정계수
  const totalAppliedFactor = zone.appliedFactor * size.appliedFactor * age.appliedFactor * mApplied;

  // 관측 적정 임대기준가격: R관측 = R기준 * K관측
  const observedRent = Math.round(baseRegionalRent * totalObservedFactor);

  // AI 추천 임대기준가격: R추천 = R기준 * K추천
  const recommendedRent = Math.round(baseRegionalRent * totalRecommendedFactor);

  // 담당자 최종 임대기준가격: R최종 = R기준 * K담당자
  const finalAppliedRent = Math.round(baseRegionalRent * totalAppliedFactor);

  // 현재 계약 대비 증감률 (%)
  const diffFromCurrentPercent = currentContractRent > 0 
    ? ((finalAppliedRent - currentContractRent) / currentContractRent) * 100 
    : 0;

  // 합리적 가격 범위 (AI 추천 및 CI 기반)
  const minRecommendedRent = Math.round(baseRegionalRent * Math.min(zone.confidenceLow, size.confidenceLow, age.confidenceLow));
  const maxRecommendedRent = Math.round(baseRegionalRent * Math.max(zone.confidenceHigh, size.confidenceHigh, age.confidenceHigh));

  return {
    baseRegionalRent,
    currentContractRent,
    totalObservedFactor,
    totalRecommendedFactor,
    totalAppliedFactor,
    observedRent,
    recommendedRent,
    finalAppliedRent,
    diffFromCurrentPercent,
    minRecommendedRent,
    maxRecommendedRent,
  };
}
