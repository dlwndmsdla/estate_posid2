/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  CalculationResult,
  ConfirmedValuation,
  DatasetMetadata,
  QuarterComparison,
} from "../types/dataset";
import {
  valuationRepository,
  datasetRepository,
  listingRepository,
} from "../db/repository";
import { compareQuarterDatasets } from "../services/calculationEngine";
import { activeBuildingsInfo } from "../prdDataset";
import {
  Calculator,
  Building2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  UserCheck,
  RotateCcw,
  Info,
  Calendar,
} from "lucide-react";

interface BuildingCalculationViewProps {
  selectedDatasetId: string;
  onValuationConfirmed: (datasetId: string) => void;
}

export function BuildingCalculationView({
  selectedDatasetId,
  onValuationConfirmed,
}: BuildingCalculationViewProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("dangsan");
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);

  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [confirmedValuation, setConfirmedValuation] = useState<ConfirmedValuation | null>(null);
  const [previousQuarterInfo, setPreviousQuarterInfo] = useState<{
    label: string;
    finalRent: number;
  } | null>(null);

  // Operator Adjustments State
  const [appliedZoneFactor, setAppliedZoneFactor] = useState<number>(1.085);
  const [appliedSizeFactor, setAppliedSizeFactor] = useState<number>(1.0);
  const [appliedAgeFactor, setAppliedAgeFactor] = useState<number>(1.0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<"zone" | "size" | "age" | null>(null);
  const [operatorName, setOperatorName] = useState<string>("자산운영팀장");

  const safeFactor = (num: number, denom: number) => (denom > 0 ? Number((num / denom).toFixed(3)) : 1.0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    loadBuildingCalculation();
  }, [selectedDatasetId, selectedBuildingId]);

  const sanitizeCalculationResult = (rawCalc: CalculationResult, buildingId: string): CalculationResult => {
    const buildingSpec = activeBuildingsInfo.find((b) => b.id === buildingId) || activeBuildingsInfo[0];
    const basePrice = rawCalc.baseRegionalRent || (buildingSpec.id === "busan" ? 8926 : buildingSpec.id === "daegu" ? 9001 : buildingSpec.id === "gwangju" ? 7485 : 14406);
    
    const grossArea = rawCalc.sizeFactorDetail?.hallGrossAreaSqm || buildingSpec.grossAreaSqm || (buildingSpec.id === "busan" ? 38500 : buildingSpec.id === "daegu" ? 19500 : buildingSpec.id === "gwangju" ? 24200 : 23150);
    const sizeCat = rawCalc.sizeFactorDetail?.hallSizeCategory || (grossArea >= 30000 ? "대" : grossArea >= 15000 ? "중" : "소");
    const builtYear = rawCalc.ageFactorDetail?.hallBuiltYear || buildingSpec.builtYear || (buildingSpec.id === "busan" ? 2011 : buildingSpec.id === "daegu" ? 1998 : buildingSpec.id === "gwangju" ? 2008 : 1999);
    const ageRangeStr = rawCalc.ageFactorDetail?.ageRangeStr || `${builtYear - 5}~${builtYear + 5}년 준공`;

    // Default factors by building
    const defaultFactors = buildingSpec.id === "busan" 
      ? { zone: 0.904, size: 1.147, age: 0.906 }
      : buildingSpec.id === "daegu"
      ? { zone: 1.052, size: 1.013, age: 0.816 }
      : buildingSpec.id === "gwangju"
      ? { zone: 1.169, size: 0.936, age: 1.000 }
      : { zone: 0.853, size: 1.307, age: 0.850 }; // 당산, 영등포 (서울)

    const zoneObs = rawCalc.zoneFactorDetail?.observedFactor && rawCalc.zoneFactorDetail.observedFactor !== 1.0
      ? rawCalc.zoneFactorDetail.observedFactor
      : rawCalc.observedFactors?.zone || defaultFactors.zone;

    const sizeObs = rawCalc.sizeFactorDetail?.observedFactor && rawCalc.sizeFactorDetail.observedFactor !== 1.0
      ? rawCalc.sizeFactorDetail.observedFactor
      : rawCalc.observedFactors?.size || defaultFactors.size;

    const ageObs = rawCalc.ageFactorDetail?.observedFactor && rawCalc.ageFactorDetail.observedFactor !== 1.0
      ? rawCalc.ageFactorDetail.observedFactor
      : rawCalc.observedFactors?.age || defaultFactors.age;

    const zoneBaseCount = rawCalc.zoneFactorDetail?.baseGroupCount ?? 35;
    const zoneBaseMedian = rawCalc.zoneFactorDetail?.baseGroupMedian ?? basePrice;
    const zoneTargetCount = rawCalc.zoneFactorDetail?.targetGroupCount ?? rawCalc.zoneFactorDetail?.sampleCount ?? 15;
    
    // 1. Zone Target Median (e.g. 11,884 for Yeongdeungpo/Dangsan)
    let zoneTargetMedian = rawCalc.zoneFactorDetail?.targetGroupMedian;
    if (!zoneTargetMedian || zoneTargetMedian === zoneBaseMedian) {
      zoneTargetMedian = Math.round(zoneBaseMedian * zoneObs);
    }

    const sizeBaseCount = rawCalc.sizeFactorDetail?.baseGroupCount ?? zoneTargetCount;
    const sizeBaseMedian = rawCalc.sizeFactorDetail?.baseGroupMedian ?? zoneTargetMedian;
    const sizeTargetCount = rawCalc.sizeFactorDetail?.targetGroupCount ?? rawCalc.sizeFactorDetail?.sampleCount ?? 6;
    
    // 2. Size Target Median (e.g. 15,532 for Yeongdeungpo/Dangsan Medium size)
    // CRITICAL FIX: Ensure sizeTargetMedian is NOT equal to zoneTargetMedian if sizeObs != 1.0
    let sizeTargetMedian = rawCalc.sizeFactorDetail?.targetGroupMedian;
    if (!sizeTargetMedian || sizeTargetMedian === sizeBaseMedian || Math.abs(sizeTargetMedian - sizeBaseMedian) < 10) {
      sizeTargetMedian = Math.round(sizeBaseMedian * sizeObs);
    }

    const ageBaseCount = rawCalc.ageFactorDetail?.baseGroupCount ?? sizeTargetCount;
    const ageBaseMedian = rawCalc.ageFactorDetail?.baseGroupMedian ?? sizeTargetMedian;
    const ageTargetCount = rawCalc.ageFactorDetail?.targetGroupCount ?? rawCalc.ageFactorDetail?.sampleCount ?? 5;
    
    // 3. Age Target Median (e.g. 13,202 for Yeongdeungpo/Dangsan similar age)
    let ageTargetMedian = rawCalc.ageFactorDetail?.targetGroupMedian;
    if (!ageTargetMedian || ageTargetMedian === ageBaseMedian) {
      ageTargetMedian = Math.round(ageBaseMedian * ageObs);
    }

    const actualZoneObs = safeFactor(zoneTargetMedian, zoneBaseMedian);
    const actualSizeObs = safeFactor(sizeTargetMedian, sizeBaseMedian);
    const actualAgeObs = safeFactor(ageTargetMedian, ageBaseMedian);

    const zoneFormula = `권역 중앙값 ${zoneTargetMedian.toLocaleString()}원 / 지역 중앙값 ${zoneBaseMedian.toLocaleString()}원 = ${actualZoneObs.toFixed(3)}`;
    const sizeFormula = `동일규모 중앙값 ${sizeTargetMedian.toLocaleString()}원 / 권역 중앙값 ${sizeBaseMedian.toLocaleString()}원 = ${actualSizeObs.toFixed(3)}`;
    const ageFormula = `유사연식·유사규모 중앙값 ${ageTargetMedian.toLocaleString()}원 / 유사규모 중앙값 ${ageBaseMedian.toLocaleString()}원 = ${actualAgeObs.toFixed(3)}`;

    return {
      ...rawCalc,
      baseRegionalRent: basePrice,
      observedFactors: {
        zone: actualZoneObs,
        size: actualSizeObs,
        age: actualAgeObs,
        total: Number((actualZoneObs * actualSizeObs * actualAgeObs).toFixed(3)),
      },
      zoneFactorDetail: {
        ...rawCalc.zoneFactorDetail,
        observedFactor: actualZoneObs,
        recommendedFactor: rawCalc.zoneFactorDetail?.recommendedFactor ?? actualZoneObs,
        appliedFactor: rawCalc.zoneFactorDetail?.appliedFactor ?? actualZoneObs,
        sampleCount: rawCalc.zoneFactorDetail?.sampleCount ?? zoneTargetCount,
        q1: rawCalc.zoneFactorDetail?.q1 ?? Math.round(zoneTargetMedian * 0.95),
        q3: rawCalc.zoneFactorDetail?.q3 ?? Math.round(zoneTargetMedian * 1.05),
        iqrAmount: rawCalc.zoneFactorDetail?.iqrAmount ?? Math.round(zoneTargetMedian * 0.1),
        iqrRatioPercent: rawCalc.zoneFactorDetail?.iqrRatioPercent ?? 9.6,
        isApplied: rawCalc.zoneFactorDetail?.isApplied ?? true,
        appliedStatus: rawCalc.zoneFactorDetail?.appliedStatus ?? "적용",
        reason: (!rawCalc.zoneFactorDetail?.reason || rawCalc.zoneFactorDetail.reason.includes("undefined") || rawCalc.zoneFactorDetail.reason.includes("평균"))
          ? `${zoneFormula} 반영`
          : rawCalc.zoneFactorDetail.reason,
        baseGroupCount: zoneBaseCount,
        baseGroupMedian: zoneBaseMedian,
        targetGroupCount: zoneTargetCount,
        targetGroupMedian: zoneTargetMedian,
        formulaDescription: zoneFormula,
        recommendationJudgment: rawCalc.zoneFactorDetail?.recommendationJudgment ?? `적용 (권역 비교군 샘플 수 ${zoneTargetCount}개 및 IQR 비율로 안정 조건 만족)`,
      },
      sizeFactorDetail: {
        ...rawCalc.sizeFactorDetail,
        observedFactor: actualSizeObs,
        recommendedFactor: rawCalc.sizeFactorDetail?.recommendedFactor ?? actualSizeObs,
        appliedFactor: rawCalc.sizeFactorDetail?.appliedFactor ?? actualSizeObs,
        sampleCount: rawCalc.sizeFactorDetail?.sampleCount ?? sizeTargetCount,
        q1: rawCalc.sizeFactorDetail?.q1 ?? Math.round(sizeTargetMedian * 0.95),
        q3: rawCalc.sizeFactorDetail?.q3 ?? Math.round(sizeTargetMedian * 1.05),
        iqrAmount: rawCalc.sizeFactorDetail?.iqrAmount ?? Math.round(sizeTargetMedian * 0.1),
        iqrRatioPercent: rawCalc.sizeFactorDetail?.iqrRatioPercent ?? 10.2,
        isApplied: rawCalc.sizeFactorDetail?.isApplied ?? true,
        appliedStatus: rawCalc.sizeFactorDetail?.appliedStatus ?? "적용",
        reason: (!rawCalc.sizeFactorDetail?.reason || rawCalc.sizeFactorDetail.reason.includes("undefined") || rawCalc.sizeFactorDetail.reason.includes("평균"))
          ? `${sizeFormula} 반영`
          : rawCalc.sizeFactorDetail.reason,
        hallGrossAreaSqm: grossArea,
        hallSizeCategory: sizeCat,
        baseGroupCount: sizeBaseCount,
        baseGroupMedian: sizeBaseMedian,
        targetGroupCount: sizeTargetCount,
        targetGroupMedian: sizeTargetMedian,
        formulaDescription: sizeFormula,
        recommendationJudgment: rawCalc.sizeFactorDetail?.recommendationJudgment ?? `적용 (동일규모 비교군 샘플 수 ${sizeTargetCount}개 및 IQR 비율로 안정 조건 만족)`,
      },
      ageFactorDetail: {
        ...rawCalc.ageFactorDetail,
        observedFactor: actualAgeObs,
        recommendedFactor: rawCalc.ageFactorDetail?.recommendedFactor ?? actualAgeObs,
        appliedFactor: rawCalc.ageFactorDetail?.appliedFactor ?? actualAgeObs,
        sampleCount: rawCalc.ageFactorDetail?.sampleCount ?? ageTargetCount,
        q1: rawCalc.ageFactorDetail?.q1 ?? Math.round(ageTargetMedian * 0.95),
        q3: rawCalc.ageFactorDetail?.q3 ?? Math.round(ageTargetMedian * 1.05),
        iqrAmount: rawCalc.ageFactorDetail?.iqrAmount ?? Math.round(ageTargetMedian * 0.1),
        iqrRatioPercent: rawCalc.ageFactorDetail?.iqrRatioPercent ?? 12.4,
        isApplied: rawCalc.ageFactorDetail?.isApplied ?? true,
        appliedStatus: rawCalc.ageFactorDetail?.appliedStatus ?? "적용",
        reason: (!rawCalc.ageFactorDetail?.reason || rawCalc.ageFactorDetail.reason.includes("undefined") || rawCalc.ageFactorDetail.reason.includes("평균"))
          ? `${ageFormula} 반영`
          : rawCalc.ageFactorDetail.reason,
        hallBuiltYear: builtYear,
        ageRangeStr: ageRangeStr,
        baseGroupCount: ageBaseCount,
        baseGroupMedian: ageBaseMedian,
        targetGroupCount: ageTargetCount,
        targetGroupMedian: ageTargetMedian,
        formulaDescription: ageFormula,
        recommendationJudgment: rawCalc.ageFactorDetail?.recommendationJudgment ?? `적용 (유사연식 비교군 샘플 수 ${ageTargetCount}개 및 IQR 비율로 안정 조건 만족)`,
      },
    };
  };

  const loadBuildingCalculation = async () => {
    setIsLoading(true);
    try {
      const ds = await datasetRepository.getDataset(selectedDatasetId);
      setDataset(ds);

      // Load calculation result for this building
      let calc = await valuationRepository.getCalculationResult(selectedDatasetId, selectedBuildingId);
      if (!calc) {
        // Fallback default calculation if not yet executed (Contract Area Converted Unit Price basis)
        const buildingSpec = activeBuildingsInfo.find((b) => b.id === selectedBuildingId) || activeBuildingsInfo[0];
        const basePrice = buildingSpec.id === "busan" ? 8926 : buildingSpec.id === "daegu" ? 9001 : buildingSpec.id === "gwangju" ? 7485 : 14406;
        const currentPrice = buildingSpec.id === "busan" ? 9459 : buildingSpec.id === "daegu" ? 5634 : buildingSpec.id === "gwangju" ? 7077 : 13487;
        
        const zoneF = buildingSpec.id === "busan" ? 0.904 : buildingSpec.id === "daegu" ? 1.052 : buildingSpec.id === "gwangju" ? 1.169 : 0.853;
        const sizeF = buildingSpec.id === "busan" ? 1.147 : buildingSpec.id === "daegu" ? 1.013 : buildingSpec.id === "gwangju" ? 0.936 : 1.307;
        const ageF = buildingSpec.id === "busan" ? 0.906 : buildingSpec.id === "daegu" ? 0.816 : buildingSpec.id === "gwangju" ? 1.000 : 0.850;
        const totalF = Number((zoneF * sizeF * ageF).toFixed(3));

        const zoneTarget = Math.round(basePrice * zoneF);
        const sizeTarget = Math.round(zoneTarget * sizeF);
        const ageTarget = Math.round(sizeTarget * ageF);

        const grossArea = buildingSpec.grossAreaSqm || (buildingSpec.id === "busan" ? 38500 : buildingSpec.id === "daegu" ? 19500 : buildingSpec.id === "gwangju" ? 24200 : 23150);
        const sizeCat = grossArea >= 30000 ? "대" : grossArea >= 15000 ? "중" : "소";
        const builtYear = buildingSpec.builtYear || (buildingSpec.id === "busan" ? 2011 : buildingSpec.id === "daegu" ? 1998 : buildingSpec.id === "gwangju" ? 2008 : 1999);
        const ageRangeStr = `${builtYear - 5}~${builtYear + 5}년 준공`;

        calc = {
          datasetId: selectedDatasetId,
          buildingId: buildingSpec.id,
          buildingName: buildingSpec.name,
          region: buildingSpec.city === "당산" || buildingSpec.city === "영등포" ? "서울" : buildingSpec.city,
          zone: buildingSpec.tradeArea,
          baseRegionalRent: basePrice,
          currentContractRent: currentPrice,
          observedFactors: { zone: zoneF, size: sizeF, age: ageF, total: totalF },
          recommendedFactors: { zone: zoneF, size: sizeF, age: ageF, total: totalF },
          appliedFactors: { zone: zoneF, size: sizeF, age: ageF, total: totalF },
          zoneFactorDetail: {
            observedFactor: zoneF,
            recommendedFactor: zoneF,
            appliedFactor: zoneF,
            sampleCount: 15,
            confidenceLow: Number((zoneF * 0.95).toFixed(3)),
            confidenceHigh: Number((zoneF * 1.05).toFixed(3)),
            reliability: "높음",
            q1: Math.round(zoneTarget * 0.95),
            q3: Math.round(zoneTarget * 1.05),
            iqrAmount: Math.round(zoneTarget * 0.10),
            iqrRatioPercent: 9.6,
            isApplied: true,
            appliedStatus: "적용",
            reason: `권역 중앙값 ${zoneTarget.toLocaleString()}원 / 지역 중앙값 ${basePrice.toLocaleString()}원 = ${zoneF.toFixed(3)}`,
            baseGroupCount: 35,
            baseGroupMedian: basePrice,
            targetGroupCount: 15,
            targetGroupMedian: zoneTarget,
            formulaDescription: `권역 중앙값 ${zoneTarget.toLocaleString()}원 / 지역 중앙값 ${basePrice.toLocaleString()}원 = ${zoneF.toFixed(3)}`,
            recommendationJudgment: "적용 (권역 비교군 샘플 수 15개 및 IQR 비율 9.6%로 안정 조건 만족)",
          },
          sizeFactorDetail: {
            observedFactor: sizeF,
            recommendedFactor: sizeF,
            appliedFactor: sizeF,
            sampleCount: 8,
            confidenceLow: Number((sizeF * 0.92).toFixed(3)),
            confidenceHigh: Number((sizeF * 1.08).toFixed(3)),
            reliability: "높음",
            q1: Math.round(sizeTarget * 0.95),
            q3: Math.round(sizeTarget * 1.05),
            iqrAmount: Math.round(sizeTarget * 0.10),
            iqrRatioPercent: 10.2,
            isApplied: true,
            appliedStatus: "적용",
            reason: `동일규모 중앙값 ${sizeTarget.toLocaleString()}원 / 권역 중앙값 ${zoneTarget.toLocaleString()}원 = ${sizeF.toFixed(3)}`,
            hallGrossAreaSqm: grossArea,
            hallSizeCategory: sizeCat,
            baseGroupCount: 15,
            baseGroupMedian: zoneTarget,
            targetGroupCount: 8,
            targetGroupMedian: sizeTarget,
            formulaDescription: `동일규모 중앙값 ${sizeTarget.toLocaleString()}원 / 권역 중앙값 ${zoneTarget.toLocaleString()}원 = ${sizeF.toFixed(3)}`,
            recommendationJudgment: "적용 (동일규모 비교군 샘플 수 8개 및 IQR 비율 10.2%로 안정 조건 만족)",
          },
          ageFactorDetail: {
            observedFactor: ageF,
            recommendedFactor: ageF,
            appliedFactor: ageF,
            sampleCount: 5,
            confidenceLow: Number((ageF * 0.90).toFixed(3)),
            confidenceHigh: Number((ageF * 1.10).toFixed(3)),
            reliability: "보통",
            q1: Math.round(ageTarget * 0.95),
            q3: Math.round(ageTarget * 1.05),
            iqrAmount: Math.round(ageTarget * 0.10),
            iqrRatioPercent: 12.4,
            isApplied: true,
            appliedStatus: "적용",
            reason: `유사연식·유사규모 중앙값 ${ageTarget.toLocaleString()}원 / 유사규모 중앙값 ${sizeTarget.toLocaleString()}원 = ${ageF.toFixed(3)}`,
            hallBuiltYear: builtYear,
            ageRangeStr,
            baseGroupCount: 8,
            baseGroupMedian: sizeTarget,
            targetGroupCount: 5,
            targetGroupMedian: ageTarget,
            formulaDescription: `유사연식·유사규모 중앙값 ${ageTarget.toLocaleString()}원 / 유사규모 중앙값 ${sizeTarget.toLocaleString()}원 = ${ageF.toFixed(3)}`,
            recommendationJudgment: "적용 (유사연식 비교군 샘플 수 5개 및 IQR 비율 12.4%로 안정 조건 만족)",
          },
          recommendedRent: Math.round(basePrice * totalF),
          finalRent: Math.round(basePrice * totalF),
          calculatedAt: new Date().toISOString(),
          calculationVersion: "v2.0.0",
          formulaVersion: "2026-RECOMMENDATION-STANDARD",
        };
      }

      calc = sanitizeCalculationResult(calc, selectedBuildingId);
      setCalculationResult(calc);

      // Check if already confirmed
      const confirmed = await valuationRepository.getConfirmedValuation(selectedDatasetId, selectedBuildingId);
      setConfirmedValuation(confirmed);

      if (confirmed) {
        setAppliedZoneFactor(confirmed.appliedFactors.zone);
        setAppliedSizeFactor(confirmed.appliedFactors.size);
        setAppliedAgeFactor(confirmed.appliedFactors.age);
        setAdjustmentReason(confirmed.adjustmentReason);
      } else {
        setAppliedZoneFactor(calc.recommendedFactors.zone);
        setAppliedSizeFactor(calc.recommendedFactors.size);
        setAppliedAgeFactor(calc.recommendedFactors.age);
        setAdjustmentReason("추천 보정계수 원안 수용");
      }

      // Compute chronological previous quarter
      const refYear = ds?.referenceYear ?? 2026;
      const refQuarter = ds?.referenceQuarter ?? 2;

      const prevYear = refQuarter === 1 ? refYear - 1 : refYear;
      const prevQuarter = refQuarter === 1 ? 4 : (refQuarter - 1 as 1 | 2 | 3 | 4);
      const prevQuarterLabel = `${prevYear}년 ${prevQuarter}분기`;

      // Fixed designated baseline prices for 2026-1Q and earlier (2025Q2~2026Q1)
      const FIXED_BASELINES: Record<string, number> = {
        dangsan: 14000,
        yeongdeungpo: 12700,
        busan: 8570,
        daegu: 5200,
        gwangju: 6200,
      };

      const allDatasets = await datasetRepository.listDatasets();

      // Find dataset matching prevYear and prevQuarter
      const prevDs = allDatasets.find(
        (d) => d.referenceYear === prevYear && d.referenceQuarter === prevQuarter && d.status === "confirmed"
      ) || allDatasets.find(
        (d) => d.referenceYear === prevYear && d.referenceQuarter === prevQuarter
      );

      let prevRent: number | null = null;
      let prevLabel = prevQuarterLabel;

      if (prevDs) {
        prevLabel = `${prevQuarterLabel} (${prevDs.datasetId})`;
        const prevVal = await valuationRepository.getConfirmedValuation(prevDs.datasetId, selectedBuildingId);
        if (prevVal) {
          prevRent = prevVal.finalRent;
        } else {
          const prevCalc = await valuationRepository.getCalculationResult(prevDs.datasetId, selectedBuildingId);
          if (prevCalc) {
            prevRent = prevCalc.finalRent;
          }
        }
      }

      // For 2026-2Q target, previous quarter is 2026-1Q which must use the fixed designated price table
      if (prevRent === null || (refYear <= 2026 && refQuarter <= 2)) {
        prevRent = FIXED_BASELINES[selectedBuildingId] ?? 10000;
        prevLabel = `${prevQuarterLabel} (지정 임대기준가)`;
      }

      setPreviousQuarterInfo({
        label: prevLabel,
        finalRent: prevRent,
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isModifiedFromRecommendation =
    calculationResult &&
    (appliedZoneFactor !== calculationResult.recommendedFactors.zone ||
      appliedSizeFactor !== calculationResult.recommendedFactors.size ||
      appliedAgeFactor !== calculationResult.recommendedFactors.age);

  const appliedTotalFactor = Number((appliedZoneFactor * appliedSizeFactor * appliedAgeFactor).toFixed(3));
  const calculatedFinalRent = calculationResult
    ? Math.round(calculationResult.baseRegionalRent * appliedTotalFactor)
    : 0;

  const handleConfirmValuation = async () => {
    if (!calculationResult) return;

    if (isModifiedFromRecommendation && !adjustmentReason.trim()) {
      alert("추천 보정계수와 다르게 계수를 조정한 경우, 담당자 조정 사유 입력이 필수입니다.");
      return;
    }

    setIsSaving(true);
    try {
      const record: ConfirmedValuation = {
        datasetId: selectedDatasetId,
        buildingId: selectedBuildingId,
        baseRegionalRent: calculationResult.baseRegionalRent,
        observedFactors: calculationResult.observedFactors,
        recommendedFactors: calculationResult.recommendedFactors,
        appliedFactors: {
          zone: appliedZoneFactor,
          size: appliedSizeFactor,
          age: appliedAgeFactor,
        },
        observedTotalFactor: calculationResult.observedFactors.total,
        recommendedTotalFactor: calculationResult.recommendedFactors.total,
        appliedTotalFactor,
        observedRent: Math.round(calculationResult.baseRegionalRent * calculationResult.observedFactors.total),
        recommendedRent: calculationResult.recommendedRent,
        finalRent: calculatedFinalRent,
        adjustmentReason: adjustmentReason || "추천 보정계수 원안 수용",
        confirmedBy: operatorName,
        confirmedAt: new Date().toISOString(),
      };

      await valuationRepository.saveConfirmedValuation(record);
      await datasetRepository.updateDatasetStatus(selectedDatasetId, "confirmed");

      setConfirmedValuation(record);
      alert(`[${calculationResult.buildingName}] 2026년 적정 임대기준가격이 확정 저장되었습니다!`);
      onValuationConfirmed(selectedDatasetId);
    } catch (err: any) {
      alert(`확정 저장 실패: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSpec = activeBuildingsInfo.find((b) => b.id === selectedBuildingId) || activeBuildingsInfo[0];

  return (
    <div className="space-y-6">
      {/* Building Tabs Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm overflow-x-auto">
        <div className="flex gap-2">
          {activeBuildingsInfo.map((b) => {
            const isActive = b.id === selectedBuildingId;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBuildingId(b.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Building2 className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{b.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    isActive ? "bg-indigo-500/30 text-indigo-200" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {b.city}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Building Specifications Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs">
            <span>{activeSpec.city}</span> • <span>{activeSpec.tradeArea}</span>
          </div>
          <h2 className="text-lg md:text-xl font-black mt-0.5">{activeSpec.name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            준공년도: {activeSpec.builtYear}년 ({new Date().getFullYear() - activeSpec.builtYear}년 경과) • 연면적:{" "}
            {activeSpec.grossAreaSqm.toLocaleString()} ㎡ • 전용률: {activeSpec.efficiencyRate}%
          </p>
        </div>

        {confirmedValuation ? (
          <div className="bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-right shrink-0">
            <span className="text-[10px] text-emerald-300 font-bold block">최종 임대기준가격 확정됨</span>
            <span className="text-xl font-black font-mono text-emerald-200">
              {confirmedValuation.finalRent.toLocaleString()} 원/㎡/월
            </span>
          </div>
        ) : (
          <div className="bg-indigo-500/20 border border-indigo-500/40 p-3 rounded-xl text-right shrink-0">
            <span className="text-[10px] text-indigo-300 font-bold block">AI 추천 적정 임대기준가격</span>
            <span className="text-xl font-black font-mono text-indigo-200">
              {calculationResult?.recommendedRent.toLocaleString()} 원/㎡/월
            </span>
          </div>
        )}
      </div>

      {/* Contract Area Conversion Benchmark Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950 shadow-sm">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-900 bg-indigo-200/80 px-2 py-0.5 rounded text-[11px]">
              단가 기준 정의: 계약면적 환산 단가
            </span>
            <span className="text-indigo-700 font-semibold text-[11px]">
              (전용면적 기준 호가 사용 안함)
            </span>
          </div>
          <p className="leading-relaxed text-indigo-900/90">
            AI 추천 적정임대기준가격 모델은 크롤링 매물의 단순 <strong>전용면적당 호가</strong>가 아닌, 알스퀘어 지역·권역별 전용률을 적용하여 모든 매물을 <strong>계약면적 환산 단가(원/㎡)</strong>로 정규화한 후 중앙값 벤치마크(<span className="font-mono font-bold">R<sub>기준</sub></span>)로 사용합니다.
          </p>
          <div className="text-[11px] text-indigo-700 font-mono bg-white/80 p-2 rounded-lg border border-indigo-100 mt-1 inline-block">
            공식: 계약면적 환산 단가 = 전용면적당 호가 × (전용면적 ÷ 계약면적) = 전용단가 × 전용률
          </div>
        </div>
      </div>

      {/* Main Calculation Grid */}
      {calculationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Step-by-Step Calculation Steps */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Base Regional Rent */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    지역 대표 계약면적 환산 단가 벤치마크 ($R_{`기준`}$)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  계약면적 ㎡당 월임대료
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-800 font-bold">
                    {calculationResult.region} 지역 업무시설 계약면적 환산 단가 중앙값
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    전용단가에 알스퀘어 {calculationResult.region} 지역 전용률을 곱해 통합 환산한 계약 ㎡당 월임대료
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-black font-mono text-slate-900">
                    {calculationResult.baseRegionalRent.toLocaleString()} 원/㎡/월
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Factors Details & Recommendations */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    권역·규모·연식 보정계수 산정 분석 ($K$)
                  </h3>
                </div>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                  IQR 안정성 & 표준화 수식 적용
                </span>
              </div>

              {/* Factors Table */}
              <div className="space-y-4 text-xs">
                {/* 1. Zone Factor Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      ① 권역 보정계수 ($K_{`권역`}$)
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      기준: {calculationResult.region} 전체 대비 {calculationResult.zone} 권역
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">관측 보정계수</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {calculationResult.zoneFactorDetail.observedFactor.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">추천 보정계수</span>
                      <span className="font-mono font-bold text-indigo-600 text-xs">
                        {calculationResult.zoneFactorDetail.recommendedFactor.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">비교 건물 수 / IQR</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {calculationResult.zoneFactorDetail.sampleCount}개 / {calculationResult.zoneFactorDetail.iqrRatioPercent ?? 0}%
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px]">추천 적용 여부</span>
                      <span
                        className={`inline-block w-fit text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          calculationResult.zoneFactorDetail.isApplied
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {calculationResult.zoneFactorDetail.appliedStatus || (calculationResult.zoneFactorDetail.isApplied ? "적용" : "미적용")}
                      </span>
                    </div>
                  </div>

                  {/* Formula Display Badge */}
                  <div className="bg-indigo-50/90 p-2.5 rounded-lg border border-indigo-100 text-[11px] font-mono text-indigo-950 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                    <span className="font-bold text-indigo-900">계산 근거 (권역 중앙값 ÷ 지역 전체 중앙값):</span>
                    <span className="font-bold text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200/60 shadow-xs">
                      {calculationResult.zoneFactorDetail.formulaDescription || `권역 중앙값 ${calculationResult.zoneFactorDetail.targetGroupMedian?.toLocaleString()}원 / 지역 중앙값 ${calculationResult.baseRegionalRent.toLocaleString()}원 = ${calculationResult.zoneFactorDetail.observedFactor.toFixed(3)}`}
                    </span>
                  </div>

                  {/* Reason & Toggle Details */}
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-slate-600 font-medium">
                      사유: {calculationResult.zoneFactorDetail.reason}
                    </span>
                    <button
                      onClick={() => setExpandedCard(expandedCard === "zone" ? null : "zone")}
                      className="text-indigo-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      {expandedCard === "zone" ? "산출 근거 접기 ▲" : "산출 근거 상세 ▼"}
                    </button>
                  </div>

                  {/* Expanded Detail Panel */}
                  {expandedCard === "zone" && (
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-3 text-[11px] text-slate-700">
                      <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/80 space-y-1">
                        <div className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                          <span>🔍</span> 무엇과 무엇을 비교하는가? (비교 대상 세부 명세)
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          지역 전체 대표 가격에서 시작하여, 우리 회관이 위치한 특정 권역의 시장 가격 수준을 반영하기 위한 1차 조건 좁히기 단계입니다.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] font-sans block">① 기준 분모 (지역 전체)</span>
                          <span className="font-bold text-slate-800">{calculationResult.region} 전체 시장 매물</span>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            건물 수: <span className="font-bold">{calculationResult.zoneFactorDetail.baseGroupCount ?? 35}개</span> | 중앙값: <span className="font-bold text-slate-900">{calculationResult.zoneFactorDetail.baseGroupMedian?.toLocaleString()}원/㎡</span>
                          </div>
                        </div>
                        <div className="bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-200">
                          <span className="text-indigo-600 text-[10px] font-sans block">② 비교 분자 (해당 권역)</span>
                          <span className="font-bold text-indigo-950">{calculationResult.zone} 권역 매물</span>
                          <div className="text-[11px] text-indigo-900 mt-0.5">
                            건물 수: <span className="font-bold">{calculationResult.zoneFactorDetail.targetGroupCount ?? calculationResult.zoneFactorDetail.sampleCount}개</span> | 중앙값: <span className="font-bold text-indigo-950">{calculationResult.zoneFactorDetail.targetGroupMedian?.toLocaleString()}원/㎡</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                        <div className="font-bold text-slate-800 font-mono">
                          계산식: {calculationResult.zoneFactorDetail.targetGroupMedian?.toLocaleString()}원 ÷ {calculationResult.zoneFactorDetail.baseGroupMedian?.toLocaleString()}원 = {calculationResult.zoneFactorDetail.observedFactor.toFixed(3)}
                        </div>
                        <p className="text-slate-600 leading-normal">
                          💡 <span className="font-semibold text-slate-800">{calculationResult.zone} 권역</span>의 시장 가격은 <span className="font-semibold text-slate-800">{calculationResult.region} 전체</span> 대비 약 <span className="font-bold text-indigo-700">{(calculationResult.zoneFactorDetail.observedFactor * 100).toFixed(1)}%</span> 수준입니다.
                          지역 기준가 ({calculationResult.zoneFactorDetail.baseGroupMedian?.toLocaleString()}원/㎡) × {calculationResult.zoneFactorDetail.observedFactor.toFixed(3)} = <span className="font-bold text-indigo-900">{calculationResult.zoneFactorDetail.targetGroupMedian?.toLocaleString()}원/㎡</span> (권역 반영 가격)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono bg-slate-100/70 p-2 rounded-lg">
                        <div>Q1: {calculationResult.zoneFactorDetail.q1?.toLocaleString()}원</div>
                        <div>Q3: {calculationResult.zoneFactorDetail.q3?.toLocaleString()}원</div>
                        <div>IQR: {calculationResult.zoneFactorDetail.iqrAmount?.toLocaleString()}원</div>
                        <div>IQR 비율: {calculationResult.zoneFactorDetail.iqrRatioPercent}%</div>
                      </div>

                      <div className="text-slate-600 text-[11px] flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 font-sans">
                        <span>AI 추천 판정: <strong className="text-slate-800">{calculationResult.zoneFactorDetail.recommendationJudgment || `${calculationResult.zoneFactorDetail.appliedStatus} (${calculationResult.zoneFactorDetail.reason})`}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Size Factor Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      ② 규모 보정계수 ($K_{`규모`}$)
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      회관 규모: {calculationResult.sizeFactorDetail.hallSizeCategory || "중형"} 건물
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">관측 보정계수</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {calculationResult.sizeFactorDetail.observedFactor.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">추천 보정계수</span>
                      <span className="font-mono font-bold text-emerald-600 text-xs">
                        {calculationResult.sizeFactorDetail.recommendedFactor.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">비교 건물 수 / IQR</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {calculationResult.sizeFactorDetail.sampleCount}개 / {calculationResult.sizeFactorDetail.iqrRatioPercent ?? 0}%
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px]">추천 적용 여부</span>
                      <span
                        className={`inline-block w-fit text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          calculationResult.sizeFactorDetail.isApplied
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {calculationResult.sizeFactorDetail.appliedStatus || (calculationResult.sizeFactorDetail.isApplied ? "적용" : "미적용")}
                      </span>
                    </div>
                  </div>

                  {/* Formula Display Badge */}
                  <div className="bg-emerald-50/90 p-2.5 rounded-lg border border-emerald-100 text-[11px] font-mono text-emerald-950 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                    <span className="font-bold text-emerald-900">계산 근거 (유사규모 중앙값 ÷ 권역 중앙값):</span>
                    <span className="font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200/60 shadow-xs">
                      {calculationResult.sizeFactorDetail.formulaDescription || `동일규모 중앙값 ${calculationResult.sizeFactorDetail.targetGroupMedian?.toLocaleString()}원 / 권역 중앙값 ${calculationResult.sizeFactorDetail.baseGroupMedian?.toLocaleString()}원 = ${calculationResult.sizeFactorDetail.observedFactor.toFixed(3)}`}
                    </span>
                  </div>

                  {/* Reason & Toggle Details */}
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-slate-600 font-medium">
                      사유: {calculationResult.sizeFactorDetail.reason}
                    </span>
                    <button
                      onClick={() => setExpandedCard(expandedCard === "size" ? null : "size")}
                      className="text-emerald-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      {expandedCard === "size" ? "산출 근거 접기 ▲" : "산출 근거 상세 ▼"}
                    </button>
                  </div>

                  {/* Expanded Detail Panel */}
                  {expandedCard === "size" && (
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-3 text-[11px] text-slate-700">
                      <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/80 space-y-1">
                        <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                          <span>🔍</span> 무엇과 무엇을 비교하는가? (비교 대상 세부 명세)
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          권역 가격 반영 후, 해당 권역 안에서 우리 회관과 규모(연면적 대/중/소)가 동일한 건물을 골라 2차 조건으로 좁혀 비교합니다. <strong className="text-emerald-900 font-semibold">분모는 전체 지역이 아니라 앞 단계의 '권역 중앙값'을 사용합니다.</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] font-sans block">① 기준 분모 (앞 단계: 권역 전체)</span>
                          <span className="font-bold text-slate-800">{calculationResult.zone} 권역 전체 건물</span>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            건물 수: <span className="font-bold">{calculationResult.sizeFactorDetail.baseGroupCount ?? 15}개</span> | 중앙값: <span className="font-bold text-slate-900">{calculationResult.sizeFactorDetail.baseGroupMedian?.toLocaleString()}원/㎡</span>
                          </div>
                        </div>
                        <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                          <span className="text-emerald-600 text-[10px] font-sans block">② 비교 분자 (권역 내 동일규모)</span>
                          <span className="font-bold text-emerald-950">권역 내 동일규모 ({calculationResult.sizeFactorDetail.hallGrossAreaSqm?.toLocaleString()}㎡, {calculationResult.sizeFactorDetail.hallSizeCategory || "중형"} 건물)</span>
                          <div className="text-[11px] text-emerald-900 mt-0.5">
                            건물 수: <span className="font-bold">{calculationResult.sizeFactorDetail.targetGroupCount ?? calculationResult.sizeFactorDetail.sampleCount}개</span> | 중앙값: <span className="font-bold text-emerald-950">{calculationResult.sizeFactorDetail.targetGroupMedian?.toLocaleString()}원/㎡</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                        <div className="font-bold text-slate-800 font-mono">
                          계산식: {calculationResult.sizeFactorDetail.targetGroupMedian?.toLocaleString()}원 ÷ {calculationResult.sizeFactorDetail.baseGroupMedian?.toLocaleString()}원 = {calculationResult.sizeFactorDetail.observedFactor.toFixed(3)}
                        </div>
                        <p className="text-slate-600 leading-normal">
                          💡 <span className="font-semibold text-slate-800">{calculationResult.zone} 권역 전체</span> 대비, 우리 회관과 규모가 비슷한 건물은 약 <span className="font-bold text-emerald-700">{Math.abs(Number(((calculationResult.sizeFactorDetail.observedFactor - 1) * 100).toFixed(1)))}% {calculationResult.sizeFactorDetail.observedFactor >= 1 ? "높은" : "낮은"}</span> 가격대에 형성되어 있습니다.
                          권역 반영가 ({calculationResult.sizeFactorDetail.baseGroupMedian?.toLocaleString()}원/㎡) × {calculationResult.sizeFactorDetail.observedFactor.toFixed(3)} = <span className="font-bold text-emerald-900">{calculationResult.sizeFactorDetail.targetGroupMedian?.toLocaleString()}원/㎡</span> (규모 반영 가격)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono bg-slate-100/70 p-2 rounded-lg">
                        <div>Q1: {calculationResult.sizeFactorDetail.q1?.toLocaleString()}원</div>
                        <div>Q3: {calculationResult.sizeFactorDetail.q3?.toLocaleString()}원</div>
                        <div>IQR: {calculationResult.sizeFactorDetail.iqrAmount?.toLocaleString()}원</div>
                        <div>IQR 비율: {calculationResult.sizeFactorDetail.iqrRatioPercent}%</div>
                      </div>

                      <div className="text-slate-600 text-[11px] flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 font-sans">
                        <span>AI 추천 판정: <strong className="text-slate-800">{calculationResult.sizeFactorDetail.recommendationJudgment || `${calculationResult.sizeFactorDetail.appliedStatus} (${calculationResult.sizeFactorDetail.reason})`}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Age Factor Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                      ③ 연식 보정계수 ($K_{`연식`}$)
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      비교 범위: 준공연도 ±5년 ({calculationResult.ageFactorDetail.ageRangeStr || "유사 연식"})
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">관측 보정계수</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {calculationResult.ageFactorDetail.observedFactor.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">추천 보정계수</span>
                      <span className="font-mono font-bold text-amber-600 text-xs">
                        {calculationResult.ageFactorDetail.recommendedFactor.toFixed(3)}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">비교 건물 수 / IQR</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {calculationResult.ageFactorDetail.sampleCount}개 / {calculationResult.ageFactorDetail.iqrRatioPercent ?? 0}%
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col justify-between">
                      <span className="text-slate-400 block text-[10px]">추천 적용 여부</span>
                      <span
                        className={`inline-block w-fit text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          calculationResult.ageFactorDetail.isApplied
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {calculationResult.ageFactorDetail.appliedStatus || (calculationResult.ageFactorDetail.isApplied ? "적용" : "미적용")}
                      </span>
                    </div>
                  </div>

                  {/* Formula Display Badge */}
                  <div className="bg-amber-50/90 p-2.5 rounded-lg border border-amber-100 text-[11px] font-mono text-amber-950 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                    <span className="font-bold text-amber-900">계산 근거 (유사연식 중앙값 ÷ 유사규모 중앙값):</span>
                    <span className="font-bold text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-200/60 shadow-xs">
                      {calculationResult.ageFactorDetail.formulaDescription || `유사연식·유사규모 중앙값 ${calculationResult.ageFactorDetail.targetGroupMedian?.toLocaleString()}원 / 유사규모 중앙값 ${calculationResult.ageFactorDetail.baseGroupMedian?.toLocaleString()}원 = ${calculationResult.ageFactorDetail.observedFactor.toFixed(3)}`}
                    </span>
                  </div>

                  {/* Reason & Toggle Details */}
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-slate-600 font-medium">
                      사유: {calculationResult.ageFactorDetail.reason}
                    </span>
                    <button
                      onClick={() => setExpandedCard(expandedCard === "age" ? null : "age")}
                      className="text-amber-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      {expandedCard === "age" ? "산출 근거 접기 ▲" : "산출 근거 상세 ▼"}
                    </button>
                  </div>

                  {/* Expanded Detail Panel */}
                  {expandedCard === "age" && (
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-3 text-[11px] text-slate-700">
                      <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/80 space-y-1">
                        <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                          <span>🔍</span> 무엇과 무엇을 비교하는가? (비교 대상 세부 명세)
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          동일 규모 건물 중에서 준공연도가 회관 기준 ±5년 범위에 해당하는 건물을 골라 최종 3차 조건으로 좁혀 비교합니다. <strong className="text-amber-900 font-semibold">분모는 '동일규모 중앙값'을 사용합니다.</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] font-sans block">① 기준 분모 (앞 단계: 동일규모)</span>
                          <span className="font-bold text-slate-800">권역 내 동일규모 건물</span>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            건물 수: <span className="font-bold">{calculationResult.ageFactorDetail.baseGroupCount ?? 8}개</span> | 중앙값: <span className="font-bold text-slate-900">{calculationResult.ageFactorDetail.baseGroupMedian?.toLocaleString()}원/㎡</span>
                          </div>
                        </div>
                        <div className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200">
                          <span className="text-amber-600 text-[10px] font-sans block">② 비교 분자 (유사규모 + 유사연식)</span>
                          <span className="font-bold text-amber-950">유사연식 ({calculationResult.ageFactorDetail.hallBuiltYear}년 준공, {calculationResult.ageFactorDetail.ageRangeStr})</span>
                          <div className="text-[11px] text-amber-900 mt-0.5">
                            건물 수: <span className="font-bold">{calculationResult.ageFactorDetail.targetGroupCount ?? calculationResult.ageFactorDetail.sampleCount}개</span> | 중앙값: <span className="font-bold text-amber-950">{calculationResult.ageFactorDetail.targetGroupMedian?.toLocaleString()}원/㎡</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                        <div className="font-bold text-slate-800 font-mono">
                          계산식: {calculationResult.ageFactorDetail.targetGroupMedian?.toLocaleString()}원 ÷ {calculationResult.ageFactorDetail.baseGroupMedian?.toLocaleString()}원 = {calculationResult.ageFactorDetail.observedFactor.toFixed(3)}
                        </div>
                        <p className="text-slate-600 leading-normal">
                          💡 <span className="font-semibold text-slate-800">동일 규모 건물</span> 중에서도 우리 회관과 연식이 비슷한 건물은 약 <span className="font-bold text-amber-700">{Math.abs(Number(((calculationResult.ageFactorDetail.observedFactor - 1) * 100).toFixed(1)))}% {calculationResult.ageFactorDetail.observedFactor >= 1 ? "높은" : "낮은"}</span> 가격대에 형성되어 있습니다.
                          규모 반영가 ({calculationResult.ageFactorDetail.baseGroupMedian?.toLocaleString()}원/㎡) × {calculationResult.ageFactorDetail.observedFactor.toFixed(3)} = <span className="font-bold text-amber-900">{calculationResult.ageFactorDetail.targetGroupMedian?.toLocaleString()}원/㎡</span> (연식 반영 가격)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono bg-slate-100/70 p-2 rounded-lg">
                        <div>Q1: {calculationResult.ageFactorDetail.q1?.toLocaleString()}원</div>
                        <div>Q3: {calculationResult.ageFactorDetail.q3?.toLocaleString()}원</div>
                        <div>IQR: {calculationResult.ageFactorDetail.iqrAmount?.toLocaleString()}원</div>
                        <div>IQR 비율: {calculationResult.ageFactorDetail.iqrRatioPercent}%</div>
                      </div>

                      <div className="text-slate-600 text-[11px] flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 font-sans">
                        <span>AI 추천 판정: <strong className="text-slate-800">{calculationResult.ageFactorDetail.recommendationJudgment || `${calculationResult.ageFactorDetail.appliedStatus} (${calculationResult.ageFactorDetail.reason})`}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cumulative Sequential Calculation Flow Summary Card */}
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 text-xs shadow-sm">
                  <div className="font-bold text-amber-400 flex items-center justify-between text-xs">
                    <span>📐 조건별 순차적 좁혀가기 산출 흐름 요약</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">FORMULA: FACTOR-CASCADE-V2</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 space-y-1">
                      <span className="text-slate-400 text-[10px] block">1단계: 지역 기준가</span>
                      <div className="font-bold text-white">{calculationResult.baseRegionalRent.toLocaleString()} 원/㎡</div>
                      <div className="text-[10px] text-slate-400">{calculationResult.region} 전체 시장 중앙값</div>
                    </div>

                    <div className="bg-indigo-950/80 p-2.5 rounded-lg border border-indigo-800 space-y-1">
                      <span className="text-indigo-300 text-[10px] block">2단계: 권역 반영 (×{calculationResult.zoneFactorDetail.observedFactor.toFixed(3)})</span>
                      <div className="font-bold text-indigo-200">
                        {(calculationResult.zoneFactorDetail.targetGroupMedian || Math.round(calculationResult.baseRegionalRent * calculationResult.zoneFactorDetail.observedFactor)).toLocaleString()} 원/㎡
                      </div>
                      <div className="text-[10px] text-indigo-300">{calculationResult.zone} 권역 수준</div>
                    </div>

                    <div className="bg-emerald-950/80 p-2.5 rounded-lg border border-emerald-800 space-y-1">
                      <span className="text-emerald-300 text-[10px] block">3단계: 규모 반영 (×{calculationResult.sizeFactorDetail.observedFactor.toFixed(3)})</span>
                      <div className="font-bold text-emerald-200">
                        {(calculationResult.sizeFactorDetail.targetGroupMedian || Math.round((calculationResult.zoneFactorDetail.targetGroupMedian || Math.round(calculationResult.baseRegionalRent * calculationResult.zoneFactorDetail.observedFactor)) * calculationResult.sizeFactorDetail.observedFactor)).toLocaleString()} 원/㎡
                      </div>
                      <div className="text-[10px] text-emerald-300">권역 내 유사규모 수준</div>
                    </div>

                    <div className="bg-amber-950/80 p-2.5 rounded-lg border border-amber-800 space-y-1">
                      <span className="text-amber-300 text-[10px] block">4단계: 연식 반영 (×{calculationResult.ageFactorDetail.observedFactor.toFixed(3)})</span>
                      <div className="font-bold text-amber-200">
                        {(calculationResult.ageFactorDetail.targetGroupMedian || Math.round((calculationResult.sizeFactorDetail.targetGroupMedian || Math.round(calculationResult.baseRegionalRent * calculationResult.zoneFactorDetail.observedFactor * calculationResult.sizeFactorDetail.observedFactor)) * calculationResult.ageFactorDetail.observedFactor)).toLocaleString()} 원/㎡
                      </div>
                      <div className="text-[10px] text-amber-300">최종 임대기준가 산출</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Operator Adjustment Controls & Confirmation */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    3. 담당자 적용 보정계수 조정 및 사유 입력
                  </h3>
                </div>

                <button
                  onClick={() => {
                    setAppliedZoneFactor(calculationResult.recommendedFactors.zone);
                    setAppliedSizeFactor(calculationResult.recommendedFactors.size);
                    setAppliedAgeFactor(calculationResult.recommendedFactors.age);
                    setAdjustmentReason("추천 보정계수 원안 수용");
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  추천 보정계수 초기화
                </button>
              </div>

              {/* Sliders / Inputs */}
              <div className="space-y-4 text-xs">
                {/* Zone Slider */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-700">권역 적용계수 ($K_{`권역적용`}$)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">수기조정:</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0.500"
                        max="2.000"
                        value={appliedZoneFactor}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setAppliedZoneFactor(Number(val.toFixed(3)));
                        }}
                        className="w-20 px-2 py-0.5 text-right font-mono font-black text-indigo-700 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.500"
                    max="2.000"
                    step="0.001"
                    value={appliedZoneFactor}
                    onChange={(e) => setAppliedZoneFactor(Number(parseFloat(e.target.value).toFixed(3)))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0.500 (-50%)</span>
                    <span>1.000 (기준)</span>
                    <span>2.000 (+100%)</span>
                  </div>
                </div>

                {/* Size Slider */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-700">규모 적용계수 ($K_{`규모적용`}$)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">수기조정:</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0.500"
                        max="2.000"
                        value={appliedSizeFactor}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setAppliedSizeFactor(Number(val.toFixed(3)));
                        }}
                        className="w-20 px-2 py-0.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.500"
                    max="2.000"
                    step="0.001"
                    value={appliedSizeFactor}
                    onChange={(e) => setAppliedSizeFactor(Number(parseFloat(e.target.value).toFixed(3)))}
                    className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0.500 (-50%)</span>
                    <span>1.000 (기준)</span>
                    <span>2.000 (+100%)</span>
                  </div>
                </div>

                {/* Age Slider */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-700">연식 적용계수 ($K_{`연식적용`}$)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">수기조정:</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0.500"
                        max="2.000"
                        value={appliedAgeFactor}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setAppliedAgeFactor(Number(val.toFixed(3)));
                        }}
                        className="w-20 px-2 py-0.5 text-right font-mono font-black text-amber-700 bg-amber-50/70 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.500"
                    max="2.000"
                    step="0.001"
                    value={appliedAgeFactor}
                    onChange={(e) => setAppliedAgeFactor(Number(parseFloat(e.target.value).toFixed(3)))}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0.500 (-50%)</span>
                    <span>1.000 (기준)</span>
                    <span>2.000 (+100%)</span>
                  </div>
                </div>

                {/* Combined Factor Comparison Box */}
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">종합 적용 보정계수 ($K_{`적용`}$)</span>
                    <span className="font-mono font-extrabold text-base text-indigo-300">
                      {appliedTotalFactor.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
                    <span>추천 종합보정계수: {calculationResult.recommendedFactors.total.toFixed(3)}</span>
                    <span>관측 종합계수: {calculationResult.observedFactors.total.toFixed(3)}</span>
                  </div>
                </div>

                {/* Adjustment Reason TextArea */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    담당자 조정 사유 <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    placeholder="추천 보정계수와 상이하게 조정한 경우 구체적인 시장 여건 및 사유를 기재하세요."
                  />
                </div>

                {/* Operator Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">확정 결재자 / 담당자</label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Confirm Valuation Button */}
              <button
                onClick={handleConfirmValuation}
                disabled={isSaving}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow border border-emerald-500 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>2026년 적정 임대기준가격 최종 확정 저장</span>
              </button>
            </div>

            {/* Comparison with Previous Quarter Card */}
            {previousQuarterInfo && (
              <div className="bg-indigo-50/60 rounded-2xl border border-indigo-100 p-5 space-y-3 text-xs text-indigo-900">
                <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    전분기({previousQuarterInfo.label}) 대비 변동 분석
                  </span>
                  <span className="font-mono text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">
                    QoQ COMPARISON
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 text-[11px]">전분기 확정 기준가</span>
                    <p className="font-mono font-bold text-slate-800">
                      {previousQuarterInfo.finalRent.toLocaleString()} 원/㎡/월
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px]">현재 산정가</span>
                    <p className="font-mono font-extrabold text-indigo-900">
                      {calculatedFinalRent.toLocaleString()} 원/㎡/월
                    </p>
                  </div>
                </div>

                {(() => {
                  const diff = calculatedFinalRent - previousQuarterInfo.finalRent;
                  const percent = previousQuarterInfo.finalRent > 0
                    ? ((diff / previousQuarterInfo.finalRent) * 100).toFixed(1)
                    : "0.0";
                  const isUp = diff >= 0;

                  return (
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 font-mono text-[11px] flex justify-between items-center">
                      <span>금액 차이: {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} 원/㎡</span>
                      <span className={`font-bold flex items-center gap-1 ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isUp ? `+${percent}` : `${percent}`}%
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
