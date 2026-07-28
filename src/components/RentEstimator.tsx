/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { InsuranceBuilding, BuildingAdjustmentConfig, FactorDetail } from "../types";
import { initialAdjustmentConfigs, calculateAdjustmentSummary } from "../adjustmentData";
import { 
  Sliders, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Save, 
  Printer, 
  Info, 
  Calendar, 
  ChevronRight, 
  X, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Building2,
  Check
} from "lucide-react";

interface RentEstimatorProps {
  building: InsuranceBuilding;
  config?: any;
  onConfigChange?: (newConfig: any) => void;
}

export const RentEstimator: React.FC<RentEstimatorProps> = ({ building }) => {
  // Determine building ID key (dangsan, yeongdeungpo, busan, daegu, gwangju)
  const buildingKey = useMemo(() => {
    if (building.id.includes("yeongdeungpo")) return "yeongdeungpo";
    if (building.id.includes("busan")) return "busan";
    if (building.id.includes("daegu")) return "daegu";
    if (building.id.includes("gwangju")) return "gwangju";
    return "dangsan";
  }, [building.id]);

  // Main state for the current building's adjustment factors
  const [adjConfig, setAdjConfig] = useState<BuildingAdjustmentConfig>(() => {
    const init = initialAdjustmentConfigs[buildingKey] || initialAdjustmentConfigs["dangsan"];
    // Deep clone so slider modifications don't mutate global state directly
    return JSON.parse(JSON.stringify(init));
  });

  // When selected building changes, reset to that building's initial data
  useEffect(() => {
    const init = initialAdjustmentConfigs[buildingKey] || initialAdjustmentConfigs["dangsan"];
    setAdjConfig(JSON.parse(JSON.stringify(init)));
    setSavedHistory([]);
    setIsSaved(false);
  }, [buildingKey]);

  // Modal and save/history states
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [savedHistory, setSavedHistory] = useState<{ date: string; rent: number; factor: number; reason: string }[]>([]);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);

  // Summary calculations
  const summary = useMemo(() => {
    return calculateAdjustmentSummary(adjConfig);
  }, [adjConfig]);

  // Check if operator applied factors differ from AI recommendations
  const isModifiedFromAI = useMemo(() => {
    const zDiff = Math.abs(adjConfig.zone.appliedFactor - adjConfig.zone.recommendedFactor) > 0.0001;
    const sDiff = Math.abs(adjConfig.size.appliedFactor - adjConfig.size.recommendedFactor) > 0.0001;
    const aDiff = Math.abs(adjConfig.age.appliedFactor - adjConfig.age.recommendedFactor) > 0.0001;
    const mDiff = adjConfig.marketPolicy
      ? Math.abs(adjConfig.marketPolicy.appliedFactor - adjConfig.marketPolicy.recommendedFactor) > 0.0001
      : false;
    return zDiff || sDiff || aDiff || mDiff;
  }, [adjConfig]);

  // Handle factor slider / input change
  const handleFactorChange = (key: "zone" | "size" | "age" | "marketPolicy", val: number) => {
    // Clamp between 0.500 and 2.000
    const clamped = Math.max(0.500, Math.min(2.000, parseFloat(val.toFixed(3))));
    setAdjConfig((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {
          observedFactor: 1.000,
          recommendedFactor: 1.000,
          appliedFactor: 1.000,
          sampleCount: 1,
          confidenceLow: 0.900,
          confidenceHigh: 1.100,
          reliability: "높음",
          reason: "시장 및 공실률 보정",
        }),
        appliedFactor: clamped,
      },
    }));
    setIsSaved(false);
  };

  // Reset factors to AI Recommended
  const handleResetToAI = () => {
    setAdjConfig((prev) => ({
      ...prev,
      zone: { ...prev.zone, appliedFactor: prev.zone.recommendedFactor },
      size: { ...prev.size, appliedFactor: prev.size.recommendedFactor },
      age: { ...prev.age, appliedFactor: prev.age.recommendedFactor },
      marketPolicy: prev.marketPolicy
        ? { ...prev.marketPolicy, appliedFactor: prev.marketPolicy.recommendedFactor }
        : {
            observedFactor: 1.000,
            recommendedFactor: 1.000,
            appliedFactor: 1.000,
            sampleCount: 1,
            confidenceLow: 0.900,
            confidenceHigh: 1.100,
            reliability: "높음",
            reason: "시장 및 공실률 보정",
          },
      adjustmentReason: "",
    }));
    setIsSaved(false);
  };

  // Reset factors to 1.000
  const handleResetToBaseline = () => {
    setAdjConfig((prev) => ({
      ...prev,
      zone: { ...prev.zone, appliedFactor: 1.000 },
      size: { ...prev.size, appliedFactor: 1.000 },
      age: { ...prev.age, appliedFactor: 1.000 },
      marketPolicy: prev.marketPolicy
        ? { ...prev.marketPolicy, appliedFactor: 1.000 }
        : {
            observedFactor: 1.000,
            recommendedFactor: 1.000,
            appliedFactor: 1.000,
            sampleCount: 1,
            confidenceLow: 0.900,
            confidenceHigh: 1.100,
            reliability: "높음",
            reason: "시장 및 공실률 보정",
          },
      adjustmentReason: "",
    }));
    setIsSaved(false);
  };

  // Save current assessment
  const handleSave = () => {
    if (isModifiedFromAI && !adjConfig.adjustmentReason?.trim()) {
      alert("AI 추천값과 다른 수치를 적용할 경우, '담당자 수기조정 사유'를 입력해야 합니다.");
      return;
    }

    const newRecord = {
      date: new Date().toLocaleString("ko-KR"),
      rent: summary.finalAppliedRent,
      factor: summary.totalAppliedFactor,
      reason: adjConfig.adjustmentReason || "AI 추천값 원안 적용",
    };

    setSavedHistory((prev) => [newRecord, ...prev]);
    setIsSaved(true);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  // Print function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${building.name} - 데이터 기반 임대기준가격 산정 보고서</title>
        <style>
          body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          h1 { font-size: 20px; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 20px; }
          .meta-table, .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
          .meta-table td, .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 12px; }
          .meta-table td.label { background-color: #f1f5f9; font-weight: bold; width: 20%; }
          .data-table th { background-color: #e2e8f0; font-weight: bold; text-align: center; }
          .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .number { font-family: 'Consolas', monospace; font-weight: bold; }
          .footer { font-size: 10px; color: #64748b; margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>[우체국금융개발원] ${building.name} 적정 임대기준가격 데이터 기반 산정서</h1>
        
        <table class="meta-table">
          <tr>
            <td class="label">대상 회관명</td>
            <td>${building.name}</td>
            <td class="label">소재지</td>
            <td>${building.address}</td>
          </tr>
          <tr>
            <td class="label">산정 시점</td>
            <td>${new Date().toLocaleDateString("ko-KR")}</td>
            <td class="label">면적/준공연도</td>
            <td>연면적 ${building.grossAreaSqm.toLocaleString()}㎡ / ${building.builtYear}년 준공</td>
          </tr>
        </table>

        <div class="summary-box">
          <h3 style="margin-top:0; font-size:14px; color:#1e1b4b;">■ 산정 결과 요약 (단위: 원/㎡/월, 계약면적 환산 단가 기준)</h3>
          <p>• 지역 대표 계약환산 기준가격 (R<sub>기준</sub>): <span class="number">${summary.baseRegionalRent.toLocaleString()} 원/㎡</span> (알스퀘어 전용률 적용)</p>
          <p>• AI 추천 적정 임대기준가격 (R<sub>추천</sub>): <span class="number">${summary.recommendedRent.toLocaleString()} 원/㎡</span> (종합보정계수: ${summary.totalRecommendedFactor.toFixed(3)})</p>
          <p>• <strong>담당자 최종 확정가격 (R<sub>최종</sub>): <span class="number" style="color:#4338ca; font-size:16px;">${summary.finalAppliedRent.toLocaleString()} 원/㎡</span></strong> (종합보정계수: ${summary.totalAppliedFactor.toFixed(3)})</p>
          <p>• 현재 계약가격 대비: <span class="number" style="color:${summary.diffFromCurrentPercent >= 0 ? '#15803d' : '#b91c1c'};">${summary.diffFromCurrentPercent >= 0 ? '+' : ''}${summary.diffFromCurrentPercent.toFixed(1)}%</span> (현재 계약: ${summary.currentContractRent.toLocaleString()} 원/㎡)</p>
        </div>

        <h3 style="font-size:13px; color:#1e293b;">■ 보정계수 세부 분석 내역</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>관측계수 (K<sub>관측</sub>)</th>
              <th>AI 추천계수 (K<sub>추천</sub>)</th>
              <th>담당자 적용계수 (K<sub>담당자</sub>)</th>
              <th>표본 수</th>
              <th>95% 신뢰구간</th>
              <th>신뢰도 / AI 판단</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>권역 보정</strong></td>
              <td class="number" style="text-align:center;">${adjConfig.zone.observedFactor.toFixed(3)}</td>
              <td class="number" style="text-align:center; color:#2563eb;">${adjConfig.zone.recommendedFactor.toFixed(3)}</td>
              <td class="number" style="text-align:center; color:#7c3aed;">${adjConfig.zone.appliedFactor.toFixed(3)}</td>
              <td style="text-align:center;">${adjConfig.zone.sampleCount}개</td>
              <td class="number" style="text-align:center;">${adjConfig.zone.confidenceLow.toFixed(3)} ~ ${adjConfig.zone.confidenceHigh.toFixed(3)}</td>
              <td>${adjConfig.zone.reliability} (${adjConfig.zone.reason})</td>
            </tr>
            <tr>
              <td><strong>규모 보정</strong></td>
              <td class="number" style="text-align:center;">${adjConfig.size.observedFactor.toFixed(3)}</td>
              <td class="number" style="text-align:center; color:#2563eb;">${adjConfig.size.recommendedFactor.toFixed(3)}</td>
              <td class="number" style="text-align:center; color:#7c3aed;">${adjConfig.size.appliedFactor.toFixed(3)}</td>
              <td style="text-align:center;">${adjConfig.size.sampleCount}개</td>
              <td class="number" style="text-align:center;">${adjConfig.size.confidenceLow.toFixed(3)} ~ ${adjConfig.size.confidenceHigh.toFixed(3)}</td>
              <td>${adjConfig.size.reliability} (${adjConfig.size.reason})</td>
            </tr>
            <tr>
              <td><strong>연식 보정</strong></td>
              <td class="number" style="text-align:center;">${adjConfig.age.observedFactor.toFixed(3)}</td>
              <td class="number" style="text-align:center; color:#2563eb;">${adjConfig.age.recommendedFactor.toFixed(3)}</td>
              <td class="number" style="text-align:center; color:#7c3aed;">${adjConfig.age.appliedFactor.toFixed(3)}</td>
              <td style="text-align:center;">${adjConfig.age.sampleCount}개</td>
              <td class="number" style="text-align:center;">${adjConfig.age.confidenceLow.toFixed(3)} ~ ${adjConfig.age.confidenceHigh.toFixed(3)}</td>
              <td>${adjConfig.age.reliability} (${adjConfig.age.reason})</td>
            </tr>
          </tbody>
        </table>

        ${adjConfig.adjustmentReason ? `
        <div style="border:1px solid #cbd5e1; padding:12px; background:#fafafa; border-radius:6px; margin-bottom:20px;">
          <strong>• 담당자 수기조정 사유:</strong><br/>
          ${adjConfig.adjustmentReason}
        </div>` : ""}

        <div class="footer">
          본 산정서는 크롤링 매물 데이터를 기반으로 부트스트랩 95% 신뢰구간 검증 및 담당자 조정을 거쳐 생성된 내부 행정 검토용 문서입니다.
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  // Helper for Reliability badge styling
  const getReliabilityBadge = (rel: FactorDetail["reliability"]) => {
    switch (rel) {
      case "높음":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
      case "보통":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
      case "낮음":
        return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
      case "표본 부족":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6" id="data-driven-estimator-root">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-700 font-bold text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                공공기관 표준 규격
              </span>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                {building.name} 데이터 기반 임대기준가격 산정 및 수기조정
              </span>
            </div>
            <h2 className="font-sans font-extrabold text-slate-900 text-lg md:text-xl flex items-center gap-2">
              데이터 기반 보정계수 산정 및 담당자 조정 대시보드
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              본 시스템은 머신러닝 예측모델을 배제하고, <strong className="text-slate-700">실제 크롤링 매물 데이터의 중앙값 차이 및 부트스트랩 3,000회 95% 신뢰구간 검증</strong>을 통해 AI 추천값과 담당자 적용값을 투명하게 분리·산출합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              onClick={() => setShowFormulaModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl px-3.5 py-2 border border-indigo-200 transition cursor-pointer shadow-sm"
            >
              <Calculator className="w-4 h-4 text-indigo-600" />
              산출 공식 및 검증 모달
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl px-3.5 py-2 border border-slate-200 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              보고서 출력
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Top Summary Cards (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Regional Base Rent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1.5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. 지역 기준가격 (R<sub>기준</sub>)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-extrabold font-mono text-slate-800">
              {summary.baseRegionalRent.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">원/㎡</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">동일 지역 업무시설 건물별 중앙값</p>
        </div>

        {/* Card 2: AI Recommended Rent */}
        <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-sm space-y-1.5 relative overflow-hidden bg-gradient-to-br from-blue-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">2. AI 추천가격 (R<sub>추천</sub>)</span>
            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
              K={summary.totalRecommendedFactor.toFixed(3)}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-extrabold font-mono text-blue-700">
              {summary.recommendedRent.toLocaleString()}
            </span>
            <span className="text-[10px] text-blue-600 font-bold">원/㎡</span>
          </div>
          <p className="text-[10px] text-blue-500 truncate">95% 신뢰구간 자동 검증 반영</p>
        </div>

        {/* Card 3: Final Operator Rent */}
        <div className="bg-white rounded-2xl border border-indigo-300 p-4 shadow-sm space-y-1.5 relative overflow-hidden bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">3. 담당자 적용가격 (R<sub>최종</sub>)</span>
            <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">
              K={summary.totalAppliedFactor.toFixed(3)}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-extrabold font-mono text-indigo-800">
              {summary.finalAppliedRent.toLocaleString()}
            </span>
            <span className="text-[10px] text-indigo-700 font-bold">원/㎡</span>
          </div>
          <p className="text-[10px] text-indigo-600 truncate font-medium">슬라이더/수기조정 확정값</p>
        </div>

        {/* Card 4: Current Contract Rent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1.5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">4. 현재 계약가격 (R<sub>현재</sub>)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-extrabold font-mono text-slate-700">
              {summary.currentContractRent.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">원/㎡</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">현재 운용 중인 계약 단가</p>
        </div>

        {/* Card 5: Rate Change vs Current */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1.5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">5. 현재 계약 대비</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl md:text-2xl font-extrabold font-mono ${
              summary.diffFromCurrentPercent >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {summary.diffFromCurrentPercent >= 0 ? "+" : ""}{summary.diffFromCurrentPercent.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">
            {summary.finalAppliedRent >= summary.currentContractRent ? "인상 적정안" : "동결/인하 적정안"}
          </p>
        </div>

        {/* Card 6: Total Applied Calibration Factor */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1.5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">6. 종합보정계수 (K<sub>담당자</sub>)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-extrabold font-mono text-indigo-700">
              {summary.totalAppliedFactor.toFixed(3)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate">권역 × 규모 × 연식</p>
        </div>

      </div>

      {/* SECTION 2: Calibration Factor Adjustment Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        
        {/* Panel Header & Action Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-sm"></span>
              <h3 className="font-sans font-bold text-slate-800 text-base">
                보정계수 수기조정 패널 (Factor Calibration Panel)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              각 항목별 [관측값 / AI 추천값 / 담당자 적용값]을 대조 분석하고, 슬라이더 및 수치를 통해 세밀히 보정합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={handleResetToAI}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="담당자 적용값을 AI 추천값으로 되돌립니다."
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
              AI 추천값으로 초기화
            </button>
            <button
              onClick={handleResetToBaseline}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="모든 적용계수를 1.000으로 초기화합니다."
            >
              1.000 으로 초기화
            </button>
          </div>
        </div>

        {/* 4 Factor Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Zone Factor */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:border-indigo-200 transition">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Factor 1</span>
                <h4 className="font-bold text-slate-800 text-sm">① 권역 보정계수 (K<sub>권역</sub>)</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getReliabilityBadge(adjConfig.zone.reliability)}`}>
                {adjConfig.zone.reliability}
              </span>
            </div>

            {/* Values comparison box */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[9px] text-slate-400 block font-sans">관측값</span>
                <span className="font-bold text-slate-600">{adjConfig.zone.observedFactor.toFixed(3)}</span>
              </div>
              <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-200">
                <span className="text-[9px] text-blue-600 font-bold block font-sans">AI 추천값</span>
                <span className="font-extrabold text-blue-700">{adjConfig.zone.recommendedFactor.toFixed(3)}</span>
              </div>
              <div className="bg-purple-50/70 p-2 rounded-xl border border-purple-200">
                <span className="text-[9px] text-purple-600 font-bold block font-sans">담당자 적용</span>
                <span className="font-extrabold text-purple-700">{adjConfig.zone.appliedFactor.toFixed(3)}</span>
              </div>
            </div>

            {/* Slider & Input control */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">담당자 적용계수</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.001"
                    min="0.500"
                    max="2.000"
                    value={adjConfig.zone.appliedFactor}
                    onChange={(e) => handleFactorChange("zone", parseFloat(e.target.value) || 1.000)}
                    className="w-20 px-2 py-1 text-right font-mono font-bold text-purple-700 bg-purple-50/50 border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              <input
                type="range"
                min="0.500"
                max="2.000"
                step="0.001"
                value={adjConfig.zone.appliedFactor}
                onChange={(e) => handleFactorChange("zone", parseFloat(e.target.value))}
                className="w-full accent-purple-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0.500</span>
                <span>1.000</span>
                <span>2.000</span>
              </div>
            </div>

            {/* Statistics details */}
            <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">비교군 표본 수:</span>
                <span className="font-bold text-slate-700">{adjConfig.zone.sampleCount} 개</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">95% 신뢰구간 (CI):</span>
                <span className="font-mono text-slate-700">{adjConfig.zone.confidenceLow.toFixed(3)} ~ {adjConfig.zone.confidenceHigh.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">추천 판단 사유:</span>
                <span className="font-semibold text-indigo-900 truncate max-w-[150px]" title={adjConfig.zone.reason}>
                  {adjConfig.zone.reason}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowFormulaModal(true)}
              className="w-full py-1.5 text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-1 border border-indigo-100 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              산출 근거 보기
            </button>
          </div>

          {/* Card 2: Size Factor */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:border-indigo-200 transition">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Factor 2</span>
                <h4 className="font-bold text-slate-800 text-sm">② 규모 보정계수 (K<sub>규모</sub>)</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getReliabilityBadge(adjConfig.size.reliability)}`}>
                {adjConfig.size.reliability}
              </span>
            </div>

            {/* Values comparison box */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[9px] text-slate-400 block font-sans">관측값</span>
                <span className="font-bold text-slate-600">{adjConfig.size.observedFactor.toFixed(3)}</span>
              </div>
              <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-200">
                <span className="text-[9px] text-blue-600 font-bold block font-sans">AI 추천값</span>
                <span className="font-extrabold text-blue-700">{adjConfig.size.recommendedFactor.toFixed(3)}</span>
              </div>
              <div className="bg-purple-50/70 p-2 rounded-xl border border-purple-200">
                <span className="text-[9px] text-purple-600 font-bold block font-sans">담당자 적용</span>
                <span className="font-extrabold text-purple-700">{adjConfig.size.appliedFactor.toFixed(3)}</span>
              </div>
            </div>

            {/* Slider & Input control */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">담당자 적용계수</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.001"
                    min="0.500"
                    max="2.000"
                    value={adjConfig.size.appliedFactor}
                    onChange={(e) => handleFactorChange("size", parseFloat(e.target.value) || 1.000)}
                    className="w-20 px-2 py-1 text-right font-mono font-bold text-purple-700 bg-purple-50/50 border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              <input
                type="range"
                min="0.500"
                max="2.000"
                step="0.001"
                value={adjConfig.size.appliedFactor}
                onChange={(e) => handleFactorChange("size", parseFloat(e.target.value))}
                className="w-full accent-purple-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0.500</span>
                <span>1.000</span>
                <span>2.000</span>
              </div>
            </div>

            {/* Statistics details */}
            <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">비교군 표본 수:</span>
                <span className="font-bold text-slate-700">{adjConfig.size.sampleCount} 개</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">95% 신뢰구간 (CI):</span>
                <span className="font-mono text-slate-700">{adjConfig.size.confidenceLow.toFixed(3)} ~ {adjConfig.size.confidenceHigh.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">추천 판단 사유:</span>
                <span className="font-semibold text-indigo-900 truncate max-w-[150px]" title={adjConfig.size.reason}>
                  {adjConfig.size.reason}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowFormulaModal(true)}
              className="w-full py-1.5 text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-1 border border-indigo-100 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              산출 근거 보기
            </button>
          </div>

          {/* Card 3: Age Factor */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:border-indigo-200 transition">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Factor 3</span>
                <h4 className="font-bold text-slate-800 text-sm">③ 연식 보정계수 (K<sub>연식</sub>)</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getReliabilityBadge(adjConfig.age.reliability)}`}>
                {adjConfig.age.reliability}
              </span>
            </div>

            {/* Values comparison box */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[9px] text-slate-400 block font-sans">관측값</span>
                <span className="font-bold text-slate-600">{adjConfig.age.observedFactor.toFixed(3)}</span>
              </div>
              <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-200">
                <span className="text-[9px] text-blue-600 font-bold block font-sans">AI 추천값</span>
                <span className="font-extrabold text-blue-700">{adjConfig.age.recommendedFactor.toFixed(3)}</span>
              </div>
              <div className="bg-purple-50/70 p-2 rounded-xl border border-purple-200">
                <span className="text-[9px] text-purple-600 font-bold block font-sans">담당자 적용</span>
                <span className="font-extrabold text-purple-700">{adjConfig.age.appliedFactor.toFixed(3)}</span>
              </div>
            </div>

            {/* Slider & Input control */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">담당자 적용계수</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.001"
                    min="0.500"
                    max="2.000"
                    value={adjConfig.age.appliedFactor}
                    onChange={(e) => handleFactorChange("age", parseFloat(e.target.value) || 1.000)}
                    className="w-20 px-2 py-1 text-right font-mono font-bold text-purple-700 bg-purple-50/50 border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              <input
                type="range"
                min="0.500"
                max="2.000"
                step="0.001"
                value={adjConfig.age.appliedFactor}
                onChange={(e) => handleFactorChange("age", parseFloat(e.target.value))}
                className="w-full accent-purple-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0.500</span>
                <span>1.000</span>
                <span>2.000</span>
              </div>
            </div>

            {/* Statistics details */}
            <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">비교군 표본 수:</span>
                <span className="font-bold text-slate-700">{adjConfig.age.sampleCount} 개</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">95% 신뢰구간 (CI):</span>
                <span className="font-mono text-slate-700">{adjConfig.age.confidenceLow.toFixed(3)} ~ {adjConfig.age.confidenceHigh.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">추천 판단 사유:</span>
                <span className="font-semibold text-indigo-900 truncate max-w-[150px]" title={adjConfig.age.reason}>
                  {adjConfig.age.reason}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowFormulaModal(true)}
              className="w-full py-1.5 text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-1 border border-indigo-100 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              산출 근거 보기
            </button>
          </div>

          {/* Card 4: Market Policy / Manager Factor */}
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 space-y-4 hover:border-indigo-200 transition">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">Factor 4</span>
                <h4 className="font-bold text-slate-800 text-sm">④ 담당자/시장상황 반영계수 (K<sub>시장</sub>)</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getReliabilityBadge(adjConfig.marketPolicy?.reliability || "높음")}`}>
                {adjConfig.marketPolicy?.reliability || "높음"}
              </span>
            </div>

            {/* Values comparison box */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[9px] text-slate-400 block font-sans">관측값</span>
                <span className="font-bold text-slate-600">{(adjConfig.marketPolicy?.observedFactor ?? 1.000).toFixed(3)}</span>
              </div>
              <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-200">
                <span className="text-[9px] text-blue-600 font-bold block font-sans">AI 추천값</span>
                <span className="font-extrabold text-blue-700">{(adjConfig.marketPolicy?.recommendedFactor ?? 1.000).toFixed(3)}</span>
              </div>
              <div className="bg-purple-50/70 p-2 rounded-xl border border-purple-200">
                <span className="text-[9px] text-purple-600 font-bold block font-sans">담당자 적용</span>
                <span className="font-extrabold text-purple-700">{(adjConfig.marketPolicy?.appliedFactor ?? 1.000).toFixed(3)}</span>
              </div>
            </div>

            {/* Slider & Input control */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">담당자 적용계수</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.001"
                    min="0.500"
                    max="2.000"
                    value={adjConfig.marketPolicy?.appliedFactor ?? 1.000}
                    onChange={(e) => handleFactorChange("marketPolicy", parseFloat(e.target.value) || 1.000)}
                    className="w-20 px-2 py-1 text-right font-mono font-bold text-purple-700 bg-purple-50/50 border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              <input
                type="range"
                min="0.500"
                max="2.000"
                step="0.001"
                value={adjConfig.marketPolicy?.appliedFactor ?? 1.000}
                onChange={(e) => handleFactorChange("marketPolicy", parseFloat(e.target.value))}
                className="w-full accent-purple-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0.500</span>
                <span>1.000</span>
                <span>2.000</span>
              </div>
            </div>

            {/* Statistics details */}
            <div className="space-y-1.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">고려 요소:</span>
                <span className="font-bold text-slate-700">공실률·상권·정책</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">95% 신뢰구간 (CI):</span>
                <span className="font-mono text-slate-700">{(adjConfig.marketPolicy?.confidenceLow ?? 0.9).toFixed(3)} ~ {(adjConfig.marketPolicy?.confidenceHigh ?? 1.1).toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">설명 사유:</span>
                <span className="font-semibold text-indigo-900 truncate max-w-[150px]" title={adjConfig.marketPolicy?.reason || "시장 상황 반영"}>
                  {adjConfig.marketPolicy?.reason || "시장 상황 반영"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowFormulaModal(true)}
              className="w-full py-1.5 text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-1 border border-indigo-100 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              산출 근거 보기
            </button>
          </div>

        </div>

        {/* SECTION 3: Adjustment Reason Input & Confirmation Save */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className={`w-4 h-4 ${isModifiedFromAI ? "text-amber-500" : "text-slate-400"}`} />
              담당자 수기조정 사유 기재
              {isModifiedFromAI && (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                  AI 추천값 변경 감지 (필수 입력)
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-400">
              내부 행정 결재 및 수기조정 타당성 감사 자료로 활용됩니다.
            </span>
          </div>

          <textarea
            rows={2}
            value={adjConfig.adjustmentReason || ""}
            onChange={(e) => {
              setAdjConfig((prev) => ({ ...prev, adjustmentReason: e.target.value }));
              setIsSaved(false);
            }}
            placeholder={
              isModifiedFromAI
                ? "AI 추천값과 다른 계수를 적용하는 사유를 입력하십시오 (예: 현장 실사 결과 인근 대중교통 리모델링 반영, 상권 특수성 요인 고려 등)"
                : "AI 추천값 원안을 그대로 채택합니다 (추가 의견 작성 가능)"
            }
            className={`w-full p-3 text-xs bg-white border rounded-xl focus:outline-none focus:ring-1 transition ${
              isModifiedFromAI && !adjConfig.adjustmentReason?.trim()
                ? "border-amber-300 focus:ring-amber-500"
                : "border-slate-200 focus:ring-indigo-500"
            }`}
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {showSaveSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  산정 결과가 성공적으로 저장되었습니다.
                </span>
              )}
            </div>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              산정 결과 확정 및 저장
            </button>
          </div>
        </div>

        {/* History comparison panel if saved */}
        {savedHistory.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              최근 담당자 확정 이력 ({savedHistory.length}건)
            </h5>
            <div className="space-y-1.5">
              {savedHistory.map((rec, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-mono">{rec.date}</span>
                    <span className="font-bold text-slate-800 font-mono">{rec.rent.toLocaleString()} 원/㎡</span>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                      K={rec.factor.toFixed(3)}
                    </span>
                  </div>
                  <span className="text-slate-500 truncate max-w-[250px]">{rec.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* SECTION 3: Standard Formula & Technical Specification Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] bg-indigo-700 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    산출 명세서
                  </span>
                  <h3 className="font-sans font-extrabold text-slate-800 text-base md:text-lg mt-0.5">
                    산출 공식 및 검증 원리 기술 명세서
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Color Scheme Legend */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs font-bold">
              <span className="text-slate-500">지표별 범례:</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-400 rounded-sm"></span> 관측값 (회색)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded-sm"></span> AI 추천값 (파란색)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-purple-600 rounded-sm"></span> 담당자 적용값 (보라색)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> 신뢰도 높음 (초록색)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded-sm"></span> 신뢰도 낮음/표본부족 (주황/빨간색)</span>
            </div>

            {/* 10 Technical Items Specification */}
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              
              {/* Item 1 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  전용률 환산식 (계약면적당 임대료)
                </h4>
                <p className="text-slate-600">
                  크롤링 매물의 전용면적당 임대료를 지역 및 권역별 표준 전용률을 적용하여 계약면적당 임대료로 통합 환산합니다.
                </p>
                <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-indigo-900 border border-slate-100">
                  계약면적당 임대료 = 전용면적당 임대료 &times; 지역·권역별 전용률
                </div>
              </div>

              {/* Item 2 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  건물별 중앙값 통합 방식
                </h4>
                <p className="text-slate-600">
                  동일 건물 내 복수의 임대 매물이 존재하는 경우, 극단적 왜곡(Outlier) 방지를 위해 평균 대신 중앙값(Median)으로 단일화합니다.
                </p>
                <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-indigo-900 border border-slate-100">
                  건물별 대표 임대료 = Median &#123; 동일 건물 매물들의 계약면적당 임대료 &#125;
                </div>
              </div>

              {/* Item 3 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                  지역 대표 계약면적 환산 단가 산식 (R<sub>기준</sub>)
                </h4>
                <p className="text-slate-600">
                  전용면적당 호가가 아닌, 알스퀘어 지역 전용률을 곱하여 환산한 <strong>계약면적 환산 단가(원/㎡)</strong> 중앙값을 대표 기준가격으로 채택합니다.
                </p>
                <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-indigo-900 border border-slate-100">
                  R<sub>기준</sub> = 동일 지역 업무시설 계약면적 환산 단가 중앙값 ({summary.baseRegionalRent.toLocaleString()} 원/㎡)
                </div>
              </div>

              {/* Item 4 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                  권역 보정계수 산식 (K<sub>권역</sub>)
                </h4>
                <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-indigo-900 border border-slate-100">
                  K<sub>권역</sub> = 동일 권역 업무시설 중앙값 &divide; 동일 지역 전체 업무시설 중앙값 (관측: {adjConfig.zone.observedFactor.toFixed(3)})
                </div>
              </div>

              {/* Item 5 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">5</span>
                  규모 보정계수 산식 (K<sub>규모</sub>)
                </h4>
                <p className="text-slate-600">
                  동일 권역 내에서 대상 회관 연면적의 &plusmn;50% 범위에 해당되는 건물들의 임대료 중앙값을 비교합니다.
                </p>
                <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-indigo-900 border border-slate-100">
                  K<sub>규모</sub> = 동일 권역·유사 규모 업무시설 중앙값 &divide; 동일 권역 전체 업무시설 중앙값 (관측: {adjConfig.size.observedFactor.toFixed(3)})
                </div>
              </div>

              {/* Item 6 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">6</span>
                  연식 보정계수 산식 (K<sub>연식</sub>)
                </h4>
                <p className="text-slate-600">
                  동일 권역·유사 규모 비교군 중에서 대상 회관 준공연도 &plusmn;10년 범위 건물들의 임대료 중앙값을 비교합니다.
                </p>
                <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-indigo-900 border border-slate-100">
                  K<sub>연식</sub> = 동일 권역·유사 규모·유사 연식 업무시설 중앙값 &divide; 동일 권역·유사 규모 업무시설 중앙값 (관측: {adjConfig.age.observedFactor.toFixed(3)})
                </div>
              </div>

              {/* Item 7 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">7</span>
                  부트스트랩 95% 신뢰구간 검증 원리
                </h4>
                <p className="text-slate-600">
                  각 비교군에서 건물을 복원추출하여 중앙값 차이를 3,000회 반복 계산하고 보정계수의 95% 신뢰구간을 산출합니다.
                </p>
              </div>

              {/* Item 8 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">8</span>
                  관측계수와 AI 추천계수의 차이 채택 기준
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                  <li>95% 신뢰구간에 1.000이 포함되지 않고 표본이 충분하면 관측계수를 추천값으로 채택합니다.</li>
                  <li>95% 신뢰구간에 1.000이 포함되면 차이가 불명확하므로 AI 추천계수는 1.000으로 자동 설정됩니다.</li>
                  <li>비교 건물이 2개 이하이면 AI 추천계수는 1.000으로 하고 "표본 부족"으로 명시합니다.</li>
                </ul>
              </div>

              {/* Item 9 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">9</span>
                  담당자 수기조정값 및 권장범위
                </h4>
                <p className="text-slate-600">
                  담당자가 슬라이더 및 직접 숫자 입력(권장범위: 0.800~1.200, 입력단위: 0.001)으로 최종 적용계수(K<sub>담당자</sub>)를 지정하며, AI 추천값과 다를 경우 사유 기재가 필수입니다.
                </p>
              </div>

              {/* Item 10 */}
              <div className="border border-slate-900 rounded-xl p-4 bg-slate-900 text-white space-y-2">
                <h4 className="font-extrabold text-emerald-400 text-sm flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-emerald-500 text-slate-900 rounded-full flex items-center justify-center text-[10px] font-bold">10</span>
                  최종 임대기준가격 연산 공식
                </h4>
                <div className="bg-slate-800/80 p-3 rounded-lg font-mono text-sm border border-slate-700 space-y-1.5">
                  <div className="text-slate-300 text-xs">R<sub>최종</sub> = R<sub>기준</sub> &times; K<sub>권역담당자</sub> &times; K<sub>규모담당자</sub> &times; K<sub>연식담당자</sub></div>
                  <div className="font-bold text-emerald-400 text-base">
                    = {summary.baseRegionalRent.toLocaleString()} &times; {adjConfig.zone.appliedFactor.toFixed(3)} &times; {adjConfig.size.appliedFactor.toFixed(3)} &times; {adjConfig.age.appliedFactor.toFixed(3)} = {summary.finalAppliedRent.toLocaleString()} 원/㎡
                  </div>
                </div>
              </div>

            </div>

            {/* Footer button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                검증 확인 및 닫기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
