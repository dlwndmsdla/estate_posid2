/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { datasetRepository, valuationRepository } from "../../db/repository";
import { activeBuildingsInfo } from "../../prdDataset";
import { DatasetMetadata } from "../../types/dataset";
import {
  getActualContractStore,
  saveActualContractRent,
  calculateConversionFactor,
} from "../../services/actualContractStore";
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Edit3,
  Save,
  X,
  FileSpreadsheet,
  Calculator,
} from "lucide-react";

interface QuarterComparisonSubViewProps {
  selectedDatasetId: string;
}

const FIXED_BASELINES: Record<string, number> = {
  dangsan: 14000,
  yeongdeungpo: 12700,
  busan: 8570,
  daegu: 5200,
  gwangju: 6200,
};

export function QuarterComparisonSubView({ selectedDatasetId }: QuarterComparisonSubViewProps) {
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [actualRents, setActualRents] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState<string>("");

  const [rows, setRows] = useState<Array<{
    id: string;
    name: string;
    city: string;
    currentRent: number;
    prevRent: number;
    q1_2026: number;
    q4_2025: number;
    q3_2025: number;
    q2_2025: number;
    diffQoQ: string;
    diffYoY: string;
    isUpQoQ: boolean;
  }>>([]);

  useEffect(() => {
    loadComparisonData();
  }, [selectedDatasetId]);

  const loadComparisonData = async () => {
    try {
      const ds = await datasetRepository.getDataset(selectedDatasetId);
      setDataset(ds);

      const calcs = await valuationRepository.getCalculationResultsByDataset(selectedDatasetId);
      const confs = await valuationRepository.listConfirmedValuationsByDataset(selectedDatasetId);

      // Compute previous quarter
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

      const tableRows = [];

      for (const b of activeBuildingsInfo) {
        const conf = confs.find((c) => c.buildingId === b.id);
        const calc = calcs.find((c) => c.buildingId === b.id);
        const currentRent = conf ? conf.finalRent : calc ? calc.finalRent : FIXED_BASELINES[b.id] ?? 10000;

        // Previous quarter baseline
        let prevRent: number | null = null;
        if (prevDs) {
          const prevVal = await valuationRepository.getConfirmedValuation(prevDs.datasetId, b.id);
          if (prevVal) prevRent = prevVal.finalRent;
          else {
            const prevCalc = await valuationRepository.getCalculationResult(prevDs.datasetId, b.id);
            if (prevCalc) prevRent = prevCalc.finalRent;
          }
        }
        if (prevRent === null || (refYear <= 2026 && refQuarter <= 2)) {
          prevRent = FIXED_BASELINES[b.id] ?? 10000;
        }

        const base2026Q1 = FIXED_BASELINES[b.id] ?? 10000;

        const diffNum = currentRent - prevRent;
        const pctQoQ = prevRent > 0 ? ((diffNum / prevRent) * 100).toFixed(1) : "0.0";
        const isUpQoQ = diffNum >= 0;

        const diffYoYNum = currentRent - base2026Q1;
        const pctYoY = base2026Q1 > 0 ? ((diffYoYNum / base2026Q1) * 100).toFixed(1) : "0.0";

        tableRows.push({
          id: b.id,
          name: `${b.name} (${b.city})`,
          city: b.city,
          currentRent,
          prevRent,
          q1_2026: base2026Q1,
          q4_2025: base2026Q1,
          q3_2025: base2026Q1,
          q2_2025: base2026Q1,
          diffQoQ: isUpQoQ ? `+${pctQoQ}%` : `${pctQoQ}%`,
          diffYoY: Number(pctYoY) >= 0 ? `+${pctYoY}%` : `${pctYoY}%`,
          isUpQoQ,
        });
      }

      setRows(tableRows);

      // Load actual contract rents
      const store = getActualContractStore();
      setActualRents(store);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartCellEdit = (bId: string, currentVal: number) => {
    setEditingId(bId);
    setEditInputValue(currentVal.toString());
  };

  const handleSaveCellEdit = (bId: string) => {
    const val = Number(editInputValue.replace(/,/g, ""));
    if (!isNaN(val) && val >= 0) {
      saveActualContractRent(bId, val);
      setActualRents((prev) => ({ ...prev, [bId]: val }));
    }
    setEditingId(null);
  };

  const currYear = dataset?.referenceYear ?? 2026;
  const currQuarter = dataset?.referenceQuarter ?? 2;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
            <Calendar className="w-4 h-4" />
            TIME-SERIES QUARTERLY COMPARISON & CONVERSION FACTOR
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            전분기 실계약가, 임대가격 변환계수($C_{`변환`}$) 및 분기별 추이 비교
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            우체국보험회관 5개 동의 전분기 실계약단가 수동 등록을 통해 임대가격 변환계수를 산출하고, 시계열 단가 추이를 다각도로 분석합니다.
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0">
          현재 데이터셋: {selectedDatasetId} ({currYear}년 {currQuarter}분기)
        </div>
      </div>

      {/* Actual Contract Price & Conversion Factor Table Box */}
      <div className="bg-white rounded-2xl border border-indigo-100 shadow-md overflow-hidden">
        <div className="p-4 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div>
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-300" />
              우체국보험회관 전분기 실계약가 & 임대가격 변환계수($C_{`변환`}$) 상세 분석표
            </span>
            <p className="text-[11px] text-slate-300 mt-0.5">
              산식: 임대가격 변환계수 ($C_{`변환`}$) = 전분기 임대기준가 ÷ 전분기 우리 매물 실계약단가
            </p>
          </div>
          <span className="text-[11px] text-indigo-200 bg-indigo-900/80 px-3 py-1 rounded-lg border border-indigo-500/30 font-mono">
            단위: 원/㎡/월 (계약면적 환산 기준)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">회관명</th>
                <th className="py-3 px-4 text-right">전분기 임대기준가 ($R_{`기준`}$)</th>
                <th className="py-3 px-4 text-right bg-amber-50/80 text-amber-950">
                  전분기 우리매물 실계약단가 (수정가능 ✎)
                </th>
                <th className="py-3 px-4 text-center bg-indigo-50 text-indigo-900">
                  임대가격 변환계수 ($C_{`변환`}$)
                </th>
                <th className="py-3 px-4 text-right font-black text-slate-800">
                  {currYear}년 {currQuarter}분기 임대기준가
                </th>
                <th className="py-3 px-4 text-right bg-emerald-50 text-emerald-950 font-black">
                  {currYear}년 {currQuarter}분기 추정 실계약가
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rows.map((row) => {
                const actualVal = actualRents[row.id] ?? Math.round(row.prevRent * 0.95);
                const { factor, percentage } = calculateConversionFactor(actualVal, row.prevRent);
                const estimatedActual = Math.round(row.currentRent * factor);
                const isEditing = editingId === row.id;

                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-sans">
                      {row.name}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {row.prevRent.toLocaleString()} 원
                    </td>
                    <td className="py-3.5 px-4 text-right bg-amber-50/40">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="text"
                            value={editInputValue}
                            onChange={(e) => setEditInputValue(e.target.value)}
                            className="w-24 px-2 py-1 border border-indigo-500 rounded text-right font-mono font-bold text-xs bg-white text-indigo-950 shadow-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCellEdit(row.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            title="저장"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                            title="취소"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-extrabold text-amber-900 text-sm">
                            {actualVal.toLocaleString()} 원
                          </span>
                          <button
                            onClick={() => handleStartCellEdit(row.id, actualVal)}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition rounded hover:bg-amber-100"
                            title="실계약가 직접 수정"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center bg-indigo-50/60 font-bold">
                      <span className="inline-block bg-indigo-600 text-white font-mono text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                        {factor.toFixed(3)} <span className="text-[10px] text-indigo-200">({percentage})</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {row.currentRent.toLocaleString()} 원
                    </td>
                    <td className="py-3.5 px-4 text-right bg-emerald-50/60 font-black text-emerald-900">
                      {estimatedActual.toLocaleString()} 원
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Time-series Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            회관별 분기별 임대기준가격 비교표 (단위: 원/㎡/월)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">기준: 계약면적 환산 단가</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">회관명</th>
                <th className="py-3 px-4 text-right bg-indigo-50/70 text-indigo-900">
                  {currYear}년 {currQuarter}분기 (현재)
                </th>
                <th className="py-3 px-4 text-right">2026년 1분기 (지정가)</th>
                <th className="py-3 px-4 text-right">2025년 4분기</th>
                <th className="py-3 px-4 text-right">2025년 3분기</th>
                <th className="py-3 px-4 text-right">2025년 2분기</th>
                <th className="py-3 px-4 text-center">전분기 대비 (QoQ)</th>
                <th className="py-3 px-4 text-center">2026년 1분기 대비</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800 font-sans">{row.name}</td>
                  <td className="py-3.5 px-4 text-right font-black text-indigo-800 bg-indigo-50/50">
                    {row.currentRent.toLocaleString()} 원
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-700 font-semibold">{row.q1_2026.toLocaleString()} 원</td>
                  <td className="py-3.5 px-4 text-right text-slate-600">{row.q4_2025.toLocaleString()} 원</td>
                  <td className="py-3.5 px-4 text-right text-slate-600">{row.q3_2025.toLocaleString()} 원</td>
                  <td className="py-3.5 px-4 text-right text-slate-500">{row.q2_2025.toLocaleString()} 원</td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                      row.isUpQoQ ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      {row.isUpQoQ ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {row.diffQoQ}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                    <span className="inline-flex items-center gap-0.5 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      {row.diffYoY}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

