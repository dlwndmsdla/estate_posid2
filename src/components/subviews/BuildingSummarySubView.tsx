/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { activeBuildingsInfo } from "../../prdDataset";
import { datasetRepository, valuationRepository } from "../../db/repository";
import { CalculationResult, ConfirmedValuation, DatasetMetadata } from "../../types/dataset";
import { Building2, CheckCircle2, TrendingUp, ArrowDownRight } from "lucide-react";

interface BuildingSummarySubViewProps {
  selectedDatasetId: string;
}

const FIXED_BASELINES_2026Q1: Record<string, number> = {
  dangsan: 14000,
  yeongdeungpo: 12700,
  busan: 8570,
  daegu: 5200,
  gwangju: 6200,
};

export function BuildingSummarySubView({ selectedDatasetId }: BuildingSummarySubViewProps) {
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [confirmedList, setConfirmedList] = useState<ConfirmedValuation[]>([]);
  const [prevQuarterRents, setPrevQuarterRents] = useState<Record<string, number>>({});
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);

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

      for (const b of activeBuildingsInfo) {
        let rent: number | null = null;
        if (prevDs) {
          const prevVal = await valuationRepository.getConfirmedValuation(prevDs.datasetId, b.id);
          if (prevVal) rent = prevVal.finalRent;
          else {
            const prevCalc = await valuationRepository.getCalculationResult(prevDs.datasetId, b.id);
            if (prevCalc) rent = prevCalc.finalRent;
          }
        }
        if (rent === null || (refYear <= 2026 && refQuarter <= 2)) {
          rent = FIXED_BASELINES_2026Q1[b.id] ?? 10000;
        }
        prevMap[b.id] = rent;
      }

      setPrevQuarterRents(prevMap);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded font-mono font-bold">
            DATASET: {selectedDatasetId} ({dataset ? `${dataset.referenceYear}년 ${dataset.referenceQuarter}분기` : "2026년 2분기"})
          </span>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            우체국보험회관 5개동 개별 종합 현황 및 산정 요약
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            당산, 영등포, 부산, 대구, 광주 회관별 스펙, 계약면적 환산 단가 기준 AI 추천 임대가격, 담당자 최종 확정가 및 전분기 대비 비교
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeBuildingsInfo.map((b) => {
          const calc = calcs.find((c) => c.buildingId === b.id);
          const conf = confirmedList.find((c) => c.buildingId === b.id);

          const baseRent = calc ? calc.baseRegionalRent : FIXED_BASELINES_2026Q1[b.id] ?? 10000;
          const aiRent = calc ? calc.recommendedRent : baseRent;
          const finalRent = conf ? conf.finalRent : calc ? calc.finalRent : aiRent;
          const currentContract = calc ? calc.currentContractRent : Math.round(finalRent * 0.95);

          const prevRent = prevQuarterRents[b.id] ?? FIXED_BASELINES_2026Q1[b.id] ?? 10000;
          const diff = finalRent - prevRent;
          const pct = prevRent > 0 ? ((diff / prevRent) * 100).toFixed(1) : "0.0";
          const isUp = diff >= 0;

          return (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full font-mono">
                    {b.city} • {b.tradeArea}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {conf ? "확정 완료" : "계산 완료"}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  {b.name}
                </h3>

                <p className="text-[11px] text-slate-500 leading-relaxed border-b border-slate-100 pb-2">
                  {b.address} • 준공 {b.builtYear}년 • 연면적 {b.grossAreaSqm.toLocaleString()}㎡ • 전용률 {b.efficiencyRate}%
                </p>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-500">
                  <span>지역 대표 계약환산단가 ($R_{`기준`}$):</span>
                  <span className="font-bold">{baseRent.toLocaleString()} 원/㎡</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>AI 추천 적정가 (계약단가):</span>
                  <span className="font-bold text-indigo-600">{aiRent.toLocaleString()} 원/㎡</span>
                </div>

                <div className="flex justify-between items-center text-slate-500">
                  <span>현재 계약가격:</span>
                  <span>{currentContract.toLocaleString()} 원/㎡</span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center mt-2 shadow-inner">
                  <span className="font-sans font-bold text-[11px] text-indigo-200">최종 산정가격</span>
                  <span className="text-base font-black text-white">{finalRent.toLocaleString()} 원/㎡</span>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="font-sans font-medium text-slate-400">전분기 대비 변동:</span>
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
    </div>
  );
}
