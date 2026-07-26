/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { datasetRepository, valuationRepository } from "../../db/repository";
import { activeBuildingsInfo } from "../../prdDataset";
import { DatasetMetadata } from "../../types/dataset";
import { Calendar, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

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
  const [rows, setRows] = useState<Array<{
    id: string;
    name: string;
    currentRent: number;
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
          currentRent,
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
    } catch (err) {
      console.error(err);
    }
  };

  const currYear = dataset?.referenceYear ?? 2026;
  const currQuarter = dataset?.referenceQuarter ?? 2;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
            <Calendar className="w-4 h-4" />
            TIME-SERIES QUARTERLY COMPARISON
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            시계열 전 분기 및 과거 분기 대비 임대가격 추이 비교
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            분기별 업로드 데이터 반영에 따른 회관별 산정단가 변화율(QoQ, YoY) 분석
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold">
          현재 데이터셋: {selectedDatasetId} ({currYear}년 {currQuarter}분기)
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-xs font-bold text-slate-700">회관별 분기별 임대기준가격 비교표 (단위: 원/㎡/월)</span>
          <span className="text-[11px] text-slate-500 font-mono">기준: 계약면적 환산 단가</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">회관명</th>
                <th className="py-3 px-4 text-right bg-indigo-50/70 text-indigo-900">
                  {currYear}년 {currQuarter}분기 (현재 조회)
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
