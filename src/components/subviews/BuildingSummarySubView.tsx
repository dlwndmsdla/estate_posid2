/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { HALLS } from "../../services/halls";
import { datasetRepository, valuationRepository } from "../../db/repository";
import { CalculationResult, ConfirmedValuation, DatasetMetadata } from "../../types/dataset";
import {
  getActualContractStore,
  saveActualContractRent,
  saveBatchActualContractRents,
  calculateConversionFactor,
  DEFAULT_PREV_BASELINES,
} from "../../services/actualContractStore";
import {
  Building2,
  CheckCircle2,
  TrendingUp,
  ArrowDownRight,
  Edit3,
  Calculator,
  Save,
  X,
  FileText,
} from "lucide-react";

interface BuildingSummarySubViewProps {
  selectedDatasetId: string;
}

// 지정 임대기준가는 actualContractStore 가 유일한 출처다.
const FIXED_BASELINES_2026Q1 = DEFAULT_PREV_BASELINES;

export function BuildingSummarySubView({ selectedDatasetId }: BuildingSummarySubViewProps) {
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [confirmedList, setConfirmedList] = useState<ConfirmedValuation[]>([]);
  const [prevQuarterRents, setPrevQuarterRents] = useState<Record<string, number>>({});
  const [actualRents, setActualRents] = useState<Record<string, number>>({});
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);

  // Modal State for Batch Editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, number>>({});

  // Single Inline Editing State
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [singleValueInput, setSingleValueInput] = useState<string>("");

  useEffect(() => {
    loadSummaryData();
  }, [selectedDatasetId]);

  const loadSummaryData = async () => {
    try {
      const ds = await datasetRepository.getDataset(selectedDatasetId);
      setDataset(ds);

      const currentCalcs = await valuationRepository.getCalculationResultsByDataset(selectedDatasetId);
      setCalcs(currentCalcs);

      const currentConfirmed = await valuationRepository.listConfirmedValuationsByDataset(selectedDatasetId);
      setConfirmedList(currentConfirmed);

      // Load previous quarter rents
      const refYear = ds?.referenceYear ?? 2026;
      const refQuarter = ds?.referenceQuarter ?? 2;
      const prevYear = refQuarter === 1 ? refYear - 1 : refYear;
      const prevQuarter = refQuarter === 1 ? 4 : (refQuarter - 1 as 1 | 2 | 3 | 4);

      const allDs = await datasetRepository.listDatasets();
      const prevDs = allDs.find(
        (d) => d.referenceYear === prevYear && d.referenceQuarter === prevQuarter && d.status === "confirmed"
      ) || allDs.find(
        (d) => d.referenceYear === prevYear && d.referenceQuarter === prevQuarter
      );

      const prevMap: Record<string, number> = {};

      for (const b of HALLS) {
        let rent: number | null = null;
        if (prevDs) {
          const prevVal = await valuationRepository.getConfirmedValuation(prevDs.datasetId, b.buildingId);
          if (prevVal) rent = prevVal.finalRent;
          else {
            const prevCalc = await valuationRepository.getCalculationResult(prevDs.datasetId, b.buildingId);
            if (prevCalc) rent = prevCalc.finalRent;
          }
        }
        if (rent === null || (refYear <= 2026 && refQuarter <= 2)) {
          rent = FIXED_BASELINES_2026Q1[b.buildingId] ?? 0;
        }
        prevMap[b.buildingId] = rent;
      }

      setPrevQuarterRents(prevMap);

      // Load Actual Contract Rents Store
      const store = getActualContractStore();
      setActualRents(store);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenBatchModal = () => {
    setEditForm({ ...actualRents });
    setIsEditModalOpen(true);
  };

  const handleSaveBatchModal = () => {
    saveBatchActualContractRents(editForm);
    setActualRents(editForm);
    setIsEditModalOpen(false);
  };

  const handleStartInlineEdit = (buildingId: string, currentVal: number) => {
    setEditingBuildingId(buildingId);
    setSingleValueInput(currentVal.toString());
  };

  const handleSaveInlineEdit = (buildingId: string) => {
    const num = Number(singleValueInput.replace(/,/g, ""));
    if (!isNaN(num) && num >= 0) {
      saveActualContractRent(buildingId, num);
      setActualRents((prev) => ({ ...prev, [buildingId]: num }));
    }
    setEditingBuildingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded font-mono font-bold">
            DATASET: {selectedDatasetId} ({dataset ? `${dataset.referenceYear}년 ${dataset.referenceQuarter}분기` : "2026년 2분기"})
          </span>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            우체국보험회관 5개동 개별 종합 현황 및 산정 요약
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            크롤링 매물(주변건물) 정규화 단가 기반 AI 추천 임대기준가, 우리 매물 실계약단가 등록 및 임대가격 변환계수($C_{`변환`}$) 산출
          </p>
        </div>

        <button
          onClick={handleOpenBatchModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>전분기 우리매물 실계약단가 일괄 입력/수정</span>
        </button>
      </div>

      {/* Feature Guidance Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              SPECIAL FEATURE
            </span>
            <h3 className="text-sm md:text-base font-extrabold text-white flex items-center gap-1.5">
              <span>우리 매물 실계약단가 및 임대가격 변환계수 ($C_{`변환`}$) 관리</span>
            </h3>
          </div>
          <span className="text-xs text-indigo-300 font-mono font-semibold bg-indigo-900/60 px-3 py-1 rounded-lg border border-indigo-500/30">
            산식: 임대가격 변환계수 ($C_{`변환`}$) = 전분기 임대기준가 ÷ 전분기 실계약단가
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          💡 외부 업로드 매물 데이터는 주변 건물들의 호가 매물이므로 당사 건물(우체국보험회관) 정보는 포함되지 않습니다.
          아래에서 <strong>전분기 우리 매물 실계약단가</strong>를 직접 수동 입력하면, 전분기 임대기준가 대비 <strong>실계약 변환계수($C_{`변환`}$)</strong>를 산출하여 이번 분기 임대기준가 기반 <strong>추정 실계약단가</strong>까지 일괄 파악할 수 있습니다.
        </p>
      </div>

      {/* Building Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {HALLS.map((b) => {
          const calc = calcs.find((c) => c.buildingId === b.buildingId);
          const conf = confirmedList.find((c) => c.buildingId === b.buildingId);

          const baseRent = calc ? calc.baseRegionalRent : FIXED_BASELINES_2026Q1[b.buildingId] ?? 0;
          const aiRent = calc ? calc.recommendedRent : baseRent;
          const finalRent = conf ? conf.finalRent : calc ? calc.finalRent : aiRent;

          const prevRent = prevQuarterRents[b.buildingId] ?? FIXED_BASELINES_2026Q1[b.buildingId] ?? 0;
          const actualRent = actualRents[b.buildingId] ?? Math.round(prevRent * 0.95);

          const { factor, percentage } = calculateConversionFactor(actualRent, prevRent);
          const estimatedCurrentActualRent = Math.round(finalRent * factor);

          const diff = finalRent - prevRent;
          const pct = prevRent > 0 ? ((diff / prevRent) * 100).toFixed(1) : "0.0";
          const isUp = diff >= 0;

          const isInlineEditing = editingBuildingId === b.buildingId;

          return (
            <div key={b.buildingId} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full font-mono">
                    {b.shortName} • {b.tradeArea}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {conf ? "확정 완료" : "계산 완료"}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  {b.buildingName}
                </h3>

                <p className="text-[11px] text-slate-500 leading-relaxed border-b border-slate-100 pb-2">
                  {b.roadAddress} • 준공 {b.builtYear}년 • 연면적 {b.grossArea.toLocaleString()}㎡ • 전용률 {b.efficiencyRate}%
                </p>
              </div>

              {/* Our Building Actual Contract Rent & Conversion Factor Section */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                  <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    우리 매물 실계약 분석
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">전분기 기준</span>
                </div>

                {/* 전분기 임대기준가 */}
                <div className="flex justify-between items-center text-slate-600 font-mono">
                  <span>전분기 임대기준가:</span>
                  <span className="font-bold text-slate-700">{prevRent.toLocaleString()} 원/㎡</span>
                </div>

                {/* 전분기 실계약단가 (Editable) */}
                <div className="flex justify-between items-center text-slate-800 font-mono">
                  <span className="font-semibold text-slate-700">전분기 실계약단가:</span>
                  {isInlineEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={singleValueInput}
                        onChange={(e) => setSingleValueInput(e.target.value)}
                        className="w-24 px-2 py-0.5 border border-indigo-500 rounded text-right font-mono text-xs font-bold bg-white text-indigo-900"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveInlineEdit(b.buildingId)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        title="저장"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingBuildingId(null)}
                        className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                        title="취소"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <strong className="text-indigo-900 font-black text-sm">{actualRent.toLocaleString()} 원/㎡</strong>
                      <button
                        onClick={() => handleStartInlineEdit(b.buildingId, actualRent)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition rounded hover:bg-slate-200/60"
                        title="실계약단가 수정"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 임대가격 변환계수 (Factor) */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-700">임대가격 변환계수 ($C_{`변환`}$):</span>
                  <span className="bg-indigo-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded-lg shadow-xs">
                    {factor.toFixed(3)} <span className="text-[10px] text-indigo-200 font-normal">({percentage})</span>
                  </span>
                </div>
              </div>

              {/* Current Quarter Rent Summary */}
              <div className="space-y-2 text-xs font-mono pt-1">
                <div className="flex justify-between items-center text-slate-600">
                  <span>AI 추천 적정가 (기준계약단가):</span>
                  <span className="font-bold text-indigo-600">{aiRent.toLocaleString()} 원/㎡</span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1.5 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-bold text-[11px] text-indigo-200">현재분기 확정/산정가</span>
                    <span className="text-base font-black text-white">{finalRent.toLocaleString()} 원/㎡</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] border-t border-slate-800 pt-1 text-slate-400">
                    <span>변환계수 적용 추정 실계약가:</span>
                    <span className="text-amber-300 font-bold font-mono">{estimatedCurrentActualRent.toLocaleString()} 원/㎡</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="font-sans font-medium text-slate-400">전분기 대비 기준가 변동:</span>
                  <span className={`font-bold flex items-center gap-0.5 ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                    {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {isUp ? `+${pct}%` : `${pct}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">전분기 우리 매물 실계약단가 일괄 입력</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              우체국보험회관 5개 동의 전분기 실계약단가(원/㎡/월)를 입력해주세요. 입력된 금액은 전분기 임대기준가와 비교하여 <strong>임대가격 변환계수 (C = 실계약단가 ÷ 임대기준가)</strong> 자동 산출에 사용됩니다.
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {HALLS.map((b) => {
                const prevRent = prevQuarterRents[b.buildingId] ?? FIXED_BASELINES_2026Q1[b.buildingId] ?? 0;
                const currentVal = editForm[b.buildingId] ?? Math.round(prevRent * 0.95);
                const { factor, percentage } = calculateConversionFactor(currentVal, prevRent);

                return (
                  <div key={b.buildingId} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{b.buildingName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        전분기 임대기준가: {prevRent.toLocaleString()}원
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <input
                          type="number"
                          value={currentVal}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm((prev) => ({ ...prev, [b.buildingId]: val }));
                          }}
                          className="w-28 px-2.5 py-1.5 border border-indigo-300 focus:border-indigo-600 rounded-lg text-right font-mono font-bold text-xs bg-white text-indigo-950"
                        />
                        <span className="text-[10px] text-indigo-600 font-mono font-bold block mt-0.5">
                          $C_{`변환`}$: {factor.toFixed(3)} ({percentage})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                취소
              </button>
              <button
                onClick={handleSaveBatchModal}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>일괄 저장 및 변환계수 업데이트</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

