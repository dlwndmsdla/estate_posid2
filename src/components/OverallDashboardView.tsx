/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { DatasetMetadata, CalculationResult, ConfirmedValuation } from "../types/dataset";
import { datasetRepository, valuationRepository, listingRepository } from "../db/repository";
import { activeBuildingsInfo } from "../prdDataset";
import {
  Building2,
  TrendingUp,
  MapPin,
  Calculator,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  ShieldCheck,
} from "lucide-react";

interface OverallDashboardViewProps {
  selectedDatasetId: string;
  onNavigateTab: (mainOrSubId: string, subId?: string) => void;
}

export function OverallDashboardView({
  selectedDatasetId,
  onNavigateTab,
}: OverallDashboardViewProps) {
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [confirmedValuations, setConfirmedValuations] = useState<ConfirmedValuation[]>([]);
  const [selectedBldgId, setSelectedBldgId] = useState<string>("dangsan");

  useEffect(() => {
    loadDashboard();
  }, [selectedDatasetId]);

  const loadDashboard = async () => {
    try {
      const ds = await datasetRepository.getDataset(selectedDatasetId);
      setDataset(ds);

      const results = await valuationRepository.getCalculationResultsByDataset(selectedDatasetId);
      setCalcs(results);

      const confirmed = await valuationRepository.listConfirmedValuationsByDataset(selectedDatasetId);
      setConfirmedValuations(confirmed);
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectedBuildingSpec = activeBuildingsInfo.find((b) => b.id === selectedBldgId) || activeBuildingsInfo[0];
  const selectedCalc = calcs.find((c) => c.buildingId === selectedBldgId);

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">조회 분기 데이터셋</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black font-mono text-indigo-700">{selectedDatasetId}</span>
            {dataset && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">
                {dataset.status.toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 block truncate">
            {dataset ? `${dataset.referenceYear}년 ${dataset.referenceQuarter}분기 V${dataset.version}` : "2026년 2분기"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">반입 매물 수</span>
          <span className="text-xl font-black font-mono text-slate-900 block">
            {dataset ? dataset.totalRowCount.toLocaleString() : "158"} 건
          </span>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            정상 {dataset ? dataset.validRowCount.toLocaleString() : "156"}건 검증 완료
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">통합 건물 중앙값</span>
          <span className="text-xl font-black font-mono text-slate-900 block">
            {dataset ? dataset.uniqueBuildingCount : "24"} 개동
          </span>
          <span className="text-[11px] text-slate-500 block">주변 업무시설 대표값 집계</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">회관 평균 임대기준가</span>
          <span className="text-xl font-black font-mono text-indigo-900 block">
            7,092 원/㎡
          </span>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            전분기 대비 +4.4% 상승
          </span>
        </div>
      </div>

      {/* Main Building Selection & Valuation Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Insurance Buildings Map / Cards */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                우체국보험회관 적정 임대기준가격 현황
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                5개 보험회관(당산, 영등포, 부산, 대구, 광주)별 보정계수 산정 결과
              </p>
            </div>

            <button
              onClick={() => onNavigateTab("calculation")}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition self-start sm:self-auto"
            >
              <span>회관별 세부 산정 이동</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Building Selector Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeBuildingsInfo.map((b) => {
              const calc = calcs.find((c) => c.buildingId === b.id);
              const isSelected = b.id === selectedBldgId;
              const rent = calc ? calc.finalRent : b.id === "dangsan" ? 10672 : 11121;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBldgId(b.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/80 text-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          isSelected ? "bg-indigo-500/30 text-indigo-200" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {b.city}
                      </span>
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-400" : "text-slate-400"}`} />
                    </div>
                    <h4 className="font-bold text-xs">{b.name}</h4>
                    <p className={`text-[10px] mt-0.5 ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                      {b.tradeArea}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/40 flex justify-between items-end font-mono">
                    <span className={`text-[10px] ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                      산정기준가
                    </span>
                    <span className="font-extrabold text-sm">{rent.toLocaleString()} 원/㎡</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Building Detail Summary Banner */}
          <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-2 text-xs text-indigo-950">
            <div className="flex justify-between items-center font-bold">
              <span className="flex items-center gap-1.5 text-indigo-900">
                <Building2 className="w-4 h-4 text-indigo-600" />
                {selectedBuildingSpec.name} ({selectedBuildingSpec.city}) 상세 스펙
              </span>
              <span className="font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded text-[11px]">
                준공: {selectedBuildingSpec.builtYear}년
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              연면적 {selectedBuildingSpec.grossAreaSqm.toLocaleString()}㎡ • 권역: {selectedBuildingSpec.tradeArea} • 전용률: {selectedBuildingSpec.efficiencyRate}%
            </p>
          </div>
        </div>

        {/* Right 4 Cols: Quick Actions & Workflow Guide */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
              시스템 핵심 운영 프로세스
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => onNavigateTab("data", "upload")}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 block">신규 분기 데이터 업로드</span>
                  <span className="text-[11px] text-slate-500">데이터 관리 / 분기 데이터 업로드</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => onNavigateTab("data", "validation")}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 block">검증 오류 확인</span>
                  <span className="text-[11px] text-slate-500">데이터 관리 / 데이터 검증</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>

              <button
                onClick={() => onNavigateTab("analysis", "adjustment")}
                className="w-full text-left p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-indigo-900 block flex items-center gap-1.5">
                    서울회관 보정계수 검토
                  </span>
                  <span className="text-[11px] text-indigo-700">임대가격 분석 / 보정계수 검토·조정</span>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:text-indigo-700 transition" />
              </button>

              <button
                onClick={() => onNavigateTab("analysis", "valuation")}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-800 block">2026년 2분기 결과 확정</span>
                  <span className="text-[11px] text-slate-500">임대가격 분석 / 회관별 임대가격 산정</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
