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
import {
  compareQuarterDatasets,
  calculateBuildingMedians,
  calculateDatasetValuations,
} from "../services/calculationEngine";
import { activeBuildingsInfo } from "../prdDataset";
import {
  getActualContractStore,
  saveActualContractRent,
  calculateConversionFactor,
} from "../services/actualContractStore";
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
  Clock,
  FileText,
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

  // Operator Adjustments State - defaults to recommended factors on calculation load
  const [appliedZoneFactor, setAppliedZoneFactor] = useState<number>(1.0);
  const [appliedSizeFactor, setAppliedSizeFactor] = useState<number>(1.0);
  const [appliedAgeFactor, setAppliedAgeFactor] = useState<number>(1.0);
  const [appliedMarketFactor, setAppliedMarketFactor] = useState<number>(1.0);
  const [actualContractRentInput, setActualContractRentInput] = useState<number>(13300);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<"zone" | "size" | "age" | null>(null);
  const [operatorName, setOperatorName] = useState<string>("자산운영팀장");

  useEffect(() => {
    const store = getActualContractStore();
    const prevRent = store[selectedBuildingId] ?? Math.round((previousQuarterInfo?.finalRent || 14000) * 0.95);
    setActualContractRentInput(prevRent);
  }, [selectedBuildingId, previousQuarterInfo]);

  const safeFactor = (num: number, denom: number) => (denom > 0 ? Number((num / denom).toFixed(3)) : 1.0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    loadBuildingCalculation();
  }, [selectedDatasetId, selectedBuildingId]);


  const loadBuildingCalculation = async () => {
    setIsLoading(true);
    try {
      const ds = await datasetRepository.getDataset(selectedDatasetId);
      setDataset(ds);

      // Load calculation result for this building
      let calc = await valuationRepository.getCalculationResult(selectedDatasetId, selectedBuildingId);
      if (!calc) {
        // 아직 산정을 실행하지 않은 데이터셋 — 저장된 결과가 없으면 업로드된
        // 매물에서 즉석 계산한다. 기본값을 지어내면 어떤 파일을 올려도 같은
        // 숫자가 나와 검증이 불가능해진다.
        const listings = await listingRepository.getCleanedListings(selectedDatasetId);
        if (listings.length > 0) {
          const medians = calculateBuildingMedians(selectedDatasetId, listings);
          calc =
            calculateDatasetValuations(selectedDatasetId, medians).find(
              (c) => c.buildingId === selectedBuildingId
            ) || null;
        }
      }

      if (!calc) {
        setCalculationResult(null);
        return;
      }
      setCalculationResult(calc);

      // Check if already confirmed
      const confirmed = await valuationRepository.getConfirmedValuation(selectedDatasetId, selectedBuildingId);
      setConfirmedValuation(confirmed);

      if (confirmed) {
        setAppliedZoneFactor(confirmed.appliedFactors.zone);
        setAppliedSizeFactor(confirmed.appliedFactors.size);
        setAppliedAgeFactor(confirmed.appliedFactors.age);
        setAppliedMarketFactor(confirmed.appliedFactors.marketPolicy ?? 1.000);
        setAdjustmentReason(confirmed.adjustmentReason);
      } else {
        setAppliedZoneFactor(calc.recommendedFactors.zone);
        setAppliedSizeFactor(calc.recommendedFactors.size);
        setAppliedAgeFactor(calc.recommendedFactors.age);
        setAppliedMarketFactor(calc.recommendedFactors.marketPolicy ?? 1.000);
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
      appliedAgeFactor !== calculationResult.recommendedFactors.age ||
      appliedMarketFactor !== (calculationResult.recommendedFactors.marketPolicy ?? 1.000));

  const appliedTotalFactor = Number((appliedZoneFactor * appliedSizeFactor * appliedAgeFactor * appliedMarketFactor).toFixed(3));
  
  const isAtRecommended =
    calculationResult &&
    appliedZoneFactor === calculationResult.recommendedFactors.zone &&
    appliedSizeFactor === calculationResult.recommendedFactors.size &&
    appliedAgeFactor === calculationResult.recommendedFactors.age &&
    appliedMarketFactor === (calculationResult.recommendedFactors.marketPolicy ?? 1.000);

  const calculatedFinalRent = calculationResult
    ? (isAtRecommended
        ? calculationResult.recommendedRent
        : Math.round(calculationResult.baseRegionalRent * appliedTotalFactor))
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
          marketPolicy: appliedMarketFactor,
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

      {/* 산정 결과 없음 — 값을 지어내지 않고 이유를 알린다 */}
      {!isLoading && !calculationResult && (
        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">산정 결과가 없습니다</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                이 데이터셋에는 <span className="font-semibold">{activeSpec.name}</span> 의
                비교 대상 매물이 없거나 아직 산정을 실행하지 않았습니다.
                <br />
                검증 화면에서 <span className="font-semibold">산정 실행</span> 을 먼저 눌러 주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Executive Valuation Summary Hero Box */}
      {calculationResult && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/30 space-y-4">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-500/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/30 text-indigo-300 font-bold font-mono text-[11px] px-2.5 py-0.5 rounded-full border border-indigo-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  VALUATION EXECUTIVE SUMMARY
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {activeSpec.city} • {activeSpec.tradeArea} • {activeSpec.name}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1 flex items-center gap-2">
                <span>{activeSpec.name} 임대가격 산정 결과</span>
                <span className="text-xs text-slate-400 font-normal">
                  (연면적 {activeSpec.grossAreaSqm.toLocaleString()}㎡, 준공 {activeSpec.builtYear}년, 전용률 {activeSpec.efficiencyRate}%)
                </span>
              </h2>
            </div>

            {/* Status badge */}
            {confirmedValuation ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                담당자 최종 확정 완료 ({confirmedValuation.confirmedBy})
              </span>
            ) : (
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Clock className="w-4 h-4 text-indigo-400" />
                2026년 2분기 임대가격 산정 진행 중
              </span>
            )}
          </div>

          {/* Eye-catching Price Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
            {/* 1. MOST PROMINENT EYE-CATCHER: [현재 산정가] (7 Cols on desktop) */}
            <div className="md:col-span-7 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-5 rounded-2xl border-2 border-indigo-300/80 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 bg-amber-300 px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wider flex items-center gap-1">
                  ★ 핵심 확정/산정 가격
                </span>
                <span className="text-xs text-indigo-200 font-mono font-bold">2026년 2분기</span>
              </div>

              <div className="my-3">
                <span className="text-xs font-bold text-indigo-200 block">현재 산정가 (계약면적 기준)</span>
                <div className="text-3xl md:text-4xl lg:text-5xl font-black font-mono text-white tracking-tight mt-1 drop-shadow-sm">
                  {calculatedFinalRent.toLocaleString()}{" "}
                  <span className="text-lg md:text-xl font-bold text-indigo-200 font-sans">원/㎡/월</span>
                </div>
              </div>

              <div className="text-xs text-indigo-100 font-medium bg-black/25 p-2.5 rounded-xl flex items-center justify-between border border-white/10">
                <span>적용 총 보정계수: <strong className="font-mono text-amber-300">{appliedTotalFactor.toFixed(3)}</strong></span>
                <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold">
                  {confirmedValuation ? "담당자 최종 확정가" : "AI 모델 현재 산정가"}
                </span>
              </div>
            </div>

            {/* 2. SECONDARY HIGHLIGHT: [전분기 확정 기준가] (5 Cols on desktop) */}
            <div className="md:col-span-5 bg-slate-800/90 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 bg-slate-700/80 px-2.5 py-0.5 rounded-full">
                  비교 지표 (전분기)
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold">
                  {previousQuarterInfo?.label || "2026년 1분기"}
                </span>
              </div>

              <div className="my-2">
                <span className="text-xs font-bold text-slate-400 block">전분기 확정 기준가</span>
                <div className="text-2xl md:text-3xl font-black font-mono text-slate-100 tracking-tight mt-1">
                  {(previousQuarterInfo?.finalRent || 0).toLocaleString()}{" "}
                  <span className="text-sm font-bold text-slate-400 font-sans">원/㎡/월</span>
                </div>
              </div>

              {/* QoQ Variation Pill */}
              {previousQuarterInfo && (
                (() => {
                  const diff = calculatedFinalRent - previousQuarterInfo.finalRent;
                  const percent = previousQuarterInfo.finalRent > 0
                    ? ((diff / previousQuarterInfo.finalRent) * 100).toFixed(1)
                    : "0.0";
                  const isUp = diff >= 0;

                  return (
                    <div className="text-xs font-mono font-bold p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between mt-1">
                      <span className="text-slate-400">전분기 대비 (QoQ):</span>
                      <span className={`flex items-center gap-1 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                        {isUp ? <TrendingUp className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} 원 ({isUp ? `+${percent}` : `${percent}`}% {isUp ? "▲" : "▼"})
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Subdued Reference Note for Contract Area Conversion */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                산정 기초 정보
              </span>
              <span>
                {calculationResult.region} 지역 기준가격 ($R_{`지역`}$): <strong className="font-mono text-slate-200 text-xs">{calculationResult.baseRegionalRent.toLocaleString()}</strong> 원/㎡/월
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              * {calculationResult.region} 지역 전체 매물 계약면적 환산단가 중앙값
            </span>
          </div>
        </div>
      )}

      {/* Main Calculation Grid */}
      {calculationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Step-by-Step Calculation Steps */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Base Regional Rent */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    지역 기준가격 ($R_{`지역`}$)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {calculationResult.region} 지역 전체 매물 계약면적 환산단가 중앙값 (알스퀘어 전용률 적용)
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-sm font-extrabold font-mono text-slate-800">
                  {calculationResult.baseRegionalRent.toLocaleString()} 원/㎡/월
                </span>
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
                    setAppliedMarketFactor(calculationResult.recommendedFactors.marketPolicy ?? 1.000);
                    setAdjustmentReason("추천 보정계수 원안 수용");
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  추천 보정계수 초기화
                </button>
              </div>

              {/* Sliders / Inputs */}
              <div className="space-y-4 text-xs">
                {/* Zone Slider */}
                {(() => {
                  const baseZone = calculationResult.recommendedFactors.zone;
                  const minZone = Number((baseZone * 0.90).toFixed(3));
                  const maxZone = Number((baseZone * 1.10).toFixed(3));
                  return (
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-700">권역 적용계수 ($K_{`권역적용`}$) <span className="text-[10px] text-indigo-600 font-normal ml-1">(±10% 범위)</span></span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">수기조정:</span>
                          <input
                            type="number"
                            step="0.001"
                            min={minZone}
                            max={maxZone}
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
                        min={minZone}
                        max={maxZone}
                        step="0.001"
                        value={appliedZoneFactor}
                        onChange={(e) => setAppliedZoneFactor(Number(parseFloat(e.target.value).toFixed(3)))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>{minZone} (-10%)</span>
                        <span>{baseZone} (추천)</span>
                        <span>{maxZone} (+10%)</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Size Slider */}
                {(() => {
                  const baseSize = calculationResult.recommendedFactors.size;
                  const minSize = Number((baseSize * 0.90).toFixed(3));
                  const maxSize = Number((baseSize * 1.10).toFixed(3));
                  return (
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-700">규모 적용계수 ($K_{`규모적용`}$) <span className="text-[10px] text-emerald-600 font-normal ml-1">(±10% 범위)</span></span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">수기조정:</span>
                          <input
                            type="number"
                            step="0.001"
                            min={minSize}
                            max={maxSize}
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
                        min={minSize}
                        max={maxSize}
                        step="0.001"
                        value={appliedSizeFactor}
                        onChange={(e) => setAppliedSizeFactor(Number(parseFloat(e.target.value).toFixed(3)))}
                        className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>{minSize} (-10%)</span>
                        <span>{baseSize} (추천)</span>
                        <span>{maxSize} (+10%)</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Age Slider */}
                {(() => {
                  const baseAge = calculationResult.recommendedFactors.age;
                  const minAge = Number((baseAge * 0.90).toFixed(3));
                  const maxAge = Number((baseAge * 1.10).toFixed(3));
                  return (
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-700">연식 적용계수 ($K_{`연식적용`}$) <span className="text-[10px] text-amber-600 font-normal ml-1">(±10% 범위)</span></span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">수기조정:</span>
                          <input
                            type="number"
                            step="0.001"
                            min={minAge}
                            max={maxAge}
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
                        min={minAge}
                        max={maxAge}
                        step="0.001"
                        value={appliedAgeFactor}
                        onChange={(e) => setAppliedAgeFactor(Number(parseFloat(e.target.value).toFixed(3)))}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>{minAge} (-10%)</span>
                        <span>{baseAge} (추천)</span>
                        <span>{maxAge} (+10%)</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Manager Factor Slider */}
                <div className="space-y-1.5 bg-purple-50/50 p-3 rounded-xl border border-purple-200/80">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-purple-900 flex items-center gap-1">
                      <span>담당자 판단 반영계수 ($K_{`담당자판단`}$) <span className="text-[10px] text-purple-600 font-normal ml-1">(±10% 범위)</span></span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-purple-600 font-semibold">수기조정:</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0.900"
                        max="1.100"
                        value={appliedMarketFactor}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setAppliedMarketFactor(Number(val.toFixed(3)));
                        }}
                        className="w-20 px-2 py-0.5 text-right font-mono font-black text-purple-700 bg-purple-100/80 border border-purple-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.900"
                    max="1.100"
                    step="0.001"
                    value={appliedMarketFactor}
                    onChange={(e) => setAppliedMarketFactor(Number(parseFloat(e.target.value).toFixed(3)))}
                    className="w-full accent-purple-600 cursor-pointer h-1.5 bg-purple-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-purple-500 font-mono">
                    <span>0.900 (-10%)</span>
                    <span>1.000 (기준)</span>
                    <span>1.100 (+10%)</span>
                  </div>
                </div>

                {/* Our Building Contract Rent & Conversion Factor (Right below Age Slider) */}
                {(() => {
                  const prevBaselineRent = previousQuarterInfo?.finalRent || 14000;
                  const { factor, percentage } = calculateConversionFactor(
                    actualContractRentInput,
                    prevBaselineRent
                  );

                  return (
                    <div className="space-y-2 bg-gradient-to-br from-indigo-50 via-purple-50/50 to-indigo-50 p-3.5 rounded-xl border border-indigo-200/90 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          전분기 우리매물 실계약단가
                        </span>
                        <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-bold">
                          변환계수 ($C_{`변환`}$) 산출
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="text-[11px] text-slate-600 font-mono">
                          <span>계약단가 입력:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={actualContractRentInput}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setActualContractRentInput(val);
                              saveActualContractRent(selectedBuildingId, val);
                            }}
                            className="w-28 px-2 py-1 text-right font-mono font-extrabold text-indigo-900 bg-white border border-indigo-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          />
                          <span className="text-[11px] font-bold text-slate-600">원/㎡</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-indigo-200/70 text-xs">
                        <span className="font-bold text-slate-700">
                          임대가격 변환계수 ($C_{`변환`}$):
                        </span>
                        <div className="text-right">
                          <span className="bg-indigo-600 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-lg shadow-2xs">
                            {factor.toFixed(3)} <span className="text-[10px] text-indigo-200 font-normal">({percentage})</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono text-right">
                        산식: 전분기 임대기준가 ({prevBaselineRent.toLocaleString()}원) ÷ 전분기 실계약단가 ({actualContractRentInput.toLocaleString()}원)
                      </div>
                    </div>
                  );
                })()}

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
