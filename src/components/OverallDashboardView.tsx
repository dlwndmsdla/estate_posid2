/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { DatasetMetadata, CalculationResult } from "../types/dataset";
import { datasetRepository, valuationRepository } from "../db/repository";
import { activeBuildingsInfo } from "../prdDataset";
import {
  Building2,
  TrendingUp,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  TrendingDown,
  Info,
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
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectedBuildingSpec = activeBuildingsInfo.find((b) => b.id === selectedBldgId) || activeBuildingsInfo[0];

  // Benchmark Rents per building
  const buildingRents: Record<string, { rent: number; prevRent: number; changePct: number }> = {
    dangsan: { rent: 12258, prevRent: 13063, changePct: -6.2 },
    yeongdeungpo: { rent: 12258, prevRent: 12724, changePct: -3.7 },
    busan: { rent: 9406, prevRent: 8772, changePct: 7.2 },
    daegu: { rent: 9757, prevRent: 8457, changePct: 15.4 },
    gwangju: { rent: 7739, prevRent: 7035, changePct: 10.0 },
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 4-Step Process Pipeline Stepper Strip */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 rounded-full font-mono">
              OPM WORKFLOW
            </span>
            <h2 className="text-sm font-extrabold text-white">
              2026년 2분기 임대기준가격 산정 4단계 파이프라인
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            대상 분기: <strong>2026 2Q</strong> • 기준일: <strong>2026-07-28</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Step 1 */}
          <button
            onClick={() => onNavigateTab("s1", "upload")}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition text-left group"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono font-black text-emerald-400">1단계 · 자료 반입</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">완료</span>
            </div>
            <p className="text-xs font-bold text-slate-200">1,117건 크롤링 매물 반입</p>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 group-hover:text-indigo-300 transition">
              <span>반입·열매핑 관리</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </button>

          {/* Step 2 */}
          <button
            onClick={() => onNavigateTab("s2", "eda")}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition text-left group"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono font-black text-indigo-300">2단계 · 검증·탐색</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">완료</span>
            </div>
            <p className="text-xs font-bold text-slate-200">1,106건 유효 매물 정합성</p>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 group-hover:text-indigo-300 transition">
              <span>EDA 및 전용률 탐색</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </button>

          {/* Step 3 */}
          <button
            onClick={() => onNavigateTab("s3", "valuation")}
            className="p-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-400/50 shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono font-black text-white">3단계 · 산정</span>
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono font-bold">진행 중</span>
            </div>
            <p className="text-xs font-bold text-white">5개 회관 임대기준가 산정</p>
            <p className="text-[11px] text-indigo-200 mt-0.5 flex items-center gap-1 group-hover:text-white transition">
              <span>보정계수 및 산정 이동</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </button>

          {/* Step 4 */}
          <button
            onClick={() => onNavigateTab("s4", "quarterly-history")}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition text-left group"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono font-black text-slate-400">4단계 · 확정</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-mono">대기</span>
            </div>
            <p className="text-xs font-bold text-slate-200">결과 확정 및 이력 저장</p>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 group-hover:text-indigo-300 transition">
              <span>확정 및 감사로그</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">조회 분기 데이터셋</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black font-mono text-indigo-700">{selectedDatasetId}</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">
              CONFIRMED
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block truncate">
            {dataset ? `${dataset.referenceYear}년 ${dataset.referenceQuarter}분기 V${dataset.version}` : "2026년 2분기"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">반입 크롤링 매물</span>
          <span className="text-xl font-black font-mono text-slate-900 block">
            1,117 <small className="text-xs text-slate-500 font-sans">건</small>
          </span>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            유효 1,106건 • 354개 건물동
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">회관 평균 임대기준가</span>
          <span className="text-xl font-black font-mono text-indigo-900 block">
            10,284 <small className="text-xs text-slate-500 font-sans">원/㎡·월</small>
          </span>
          <span className="text-[11px] text-indigo-600 font-bold block">
            전국 5개 회관 산정 평균
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">주요 검토/경고 항목</span>
          <span className="text-xl font-black font-mono text-amber-600 block">
            4 <small className="text-xs text-slate-500 font-sans">건</small>
          </span>
          <span className="text-[11px] text-amber-700 font-medium block truncate">
            전환율 단일값 및 결측 4건 확인
          </span>
        </div>
      </div>

      {/* Main 5 Insurance Buildings Rents Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded font-mono">
                결론
              </span>
              <h3 className="text-base font-bold text-slate-900">
                우체국보험회관 적정 임대기준가격 현황
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              카드를 선택하면 회관 세부 스펙 및 보정계수 산정 내역을 확인하실 수 있습니다.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("s3", "valuation")}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition self-start sm:self-auto border border-indigo-200/80"
          >
            <span>3단계 회관별 산정 상세보기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5 Building Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {activeBuildingsInfo.map((b) => {
            const isSelected = b.id === selectedBldgId;
            const rData = buildingRents[b.id] || { rent: 10000, prevRent: 10000, changePct: 0 };

            return (
              <button
                key={b.id}
                onClick={() => setSelectedBldgId(b.id)}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/50"
                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/80 text-slate-800"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        isSelected ? "bg-indigo-500/30 text-indigo-200" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}
                    >
                      {b.city}
                    </span>
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-400" : "text-slate-400"}`} />
                  </div>
                  <h4 className="font-bold text-xs">{b.name}</h4>
                  <p className={`text-[10px] mt-0.5 truncate ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                    {b.tradeArea}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200/40 font-mono">
                  <span className={`text-[10px] block ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                    추정 임대기준가
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="font-extrabold text-sm">{rData.rent.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400">원/㎡·월</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className={isSelected ? "text-slate-400" : "text-slate-500"}>전분기대비</span>
                    <span className={`font-bold ${rData.changePct >= 0 ? "text-emerald-500" : "text-amber-400"}`}>
                      {rData.changePct >= 0 ? `+${rData.changePct}%` : `${rData.changePct}%`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Building Details Strip */}
        {selectedBuildingSpec && (
          <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 space-y-2 text-xs text-indigo-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold">
              <span className="flex items-center gap-2 text-indigo-900 text-sm">
                <Building2 className="w-4 h-4 text-indigo-600" />
                {selectedBuildingSpec.name} ({selectedBuildingSpec.city}) 상세 스펙 및 산정 요약
              </span>
              <button
                onClick={() => onNavigateTab("s3", "valuation")}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>이 회관 세부 보정 내역 보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-[11px]">
              <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                <span className="text-slate-500 block">권역 위치</span>
                <strong className="text-slate-800 font-bold">{selectedBuildingSpec.tradeArea}</strong>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                <span className="text-slate-500 block">연면적 / 준공연도</span>
                <strong className="text-slate-800 font-bold">
                  {selectedBuildingSpec.grossAreaSqm.toLocaleString()}㎡ ({selectedBuildingSpec.builtYear}년)
                </strong>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                <span className="text-slate-500 block">적용 전용률</span>
                <strong className="text-slate-800 font-bold">
                  {selectedBuildingSpec.efficiencyRate}% (계약단가 환산 적용)
                </strong>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                <span className="text-slate-500 block">2026 2Q 산정 기준가</span>
                <strong className="text-indigo-700 font-extrabold font-mono">
                  {(buildingRents[selectedBldgId]?.rent || 10000).toLocaleString()} 원/㎡·월
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Warnings & Check List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded font-mono">
              근거
            </span>
            <h3 className="text-base font-bold text-slate-900">
              주요 경고 및 검토사항 (4건)
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab("s4", "alerts")}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
          >
            <span>전체 주요 경고 보기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3 w-20">구분</th>
                <th className="py-2.5 px-3">검토 항목 및 세부 내용</th>
                <th className="py-2.5 px-3 text-right w-20">건수</th>
                <th className="py-2.5 px-3 w-48">필요 자료 및 조치 사항</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3">
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px]">
                    경고
                  </span>
                </td>
                <td className="py-3 px-3">
                  <strong className="text-slate-800 block text-xs">전월세전환율 전국 단일값 적용 (5.6%)</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    부산·대구·광주 오피스 개별 전환율 공표치 부재로 전국 단일값 5.6% 적용 중 (민감도 5%~7% 테스트 시 단가 변동률 2% 내외로 안정적)
                  </p>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">3건</td>
                <td className="py-3 px-3 text-slate-600 text-[11px]">
                  부동산원 R-ONE 지방 오피스 전환율 확보
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3">
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px]">
                    경고
                  </span>
                </td>
                <td className="py-3 px-3">
                  <strong className="text-slate-800 block text-xs">주변역·거리 컬럼 위치 스왑 데이터</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    지방 알스퀘어 시트 내 주변역 컬럼에 거리 숫자, 거리 컬럼에 역명이 입력된 행 존재 (타입 검사로 자동 교정)
                  </p>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">755건</td>
                <td className="py-3 px-3 text-slate-600 text-[11px]">
                  크롤러 파서 매핑 자동 교정 완료
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3">
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px]">
                    경고
                  </span>
                </td>
                <td className="py-3 px-3">
                  <strong className="text-slate-800 block text-xs">분석 조건 제외 매물 행</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    전세·매매 거래 조건 등으로 인해 전체 1,117건 중 11건이 월세 산정 대상에서 정상 제외
                  </p>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">11건</td>
                <td className="py-3 px-3 text-slate-600 text-[11px]">
                  제외 사유 투명 표기 (숨김 없음)
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3">
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px]">
                    경고
                  </span>
                </td>
                <td className="py-3 px-3">
                  <strong className="text-slate-800 block text-xs">빌딩명 결측 및 주소/좌표 기반 건물동 그룹핑</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    빌딩명 존재하는 매물 123건 / 도로명주소 + GPS 좌표 기준으로 유효 건물 354개동 클러스터링
                  </p>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">994건</td>
                <td className="py-3 px-3 text-slate-600 text-[11px]">
                  건축물대장 주소 조인 강화
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarterly Rent Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded font-mono">
              추이
            </span>
            <h3 className="text-base font-bold text-slate-900">
              회관별 분기별 임대기준가격 비교
            </h3>
          </div>
          <span className="text-xs text-slate-500">단위: 원/㎡·월 (계약면적 기준)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3">회관명</th>
                <th className="py-2.5 px-3">권역 위치</th>
                <th className="py-2.5 px-3 text-right">직전 분기 (2026 1Q)</th>
                <th className="py-2.5 px-3 text-right">이번 분기 (2026 2Q)</th>
                <th className="py-2.5 px-3 text-right">전분기 대비 변동</th>
                <th className="py-2.5 px-3 text-right">현재 적용가 대비</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeBuildingsInfo.map((b) => {
                const r = buildingRents[b.id] || { rent: 10000, prevRent: 10000, changePct: 0 };
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-slate-900">{b.name}</td>
                    <td className="py-3 px-3 text-slate-500">{b.tradeArea}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {r.prevRent.toLocaleString()} 원
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-indigo-700">
                      {r.rent.toLocaleString()} 원
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={r.changePct >= 0 ? "text-emerald-600" : "text-amber-600"}>
                        {r.changePct >= 0 ? `+${r.changePct}%` : `${r.changePct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {b.id === "dangsan" ? "-18.3%" : b.id === "yeongdeungpo" ? "-3.5%" : b.id === "busan" ? "+9.8%" : b.id === "daegu" ? "+87.6%" : "+24.8%"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

