/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { CalculationResult, DatasetMetadata } from "../types/dataset";
import { valuationRepository, datasetRepository } from "../db/repository";
import { Sliders, Building2, CheckCircle2, RotateCcw, Info } from "lucide-react";

interface CalibrationFactorsViewProps {
  selectedDatasetId: string;
}

export function CalibrationFactorsView({ selectedDatasetId }: CalibrationFactorsViewProps) {
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadFactors();
  }, [selectedDatasetId]);

  const loadFactors = async () => {
    setIsLoading(true);
    try {
      const results = await valuationRepository.getCalculationResultsByDataset(selectedDatasetId);
      setCalcs(results);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
            DATASET: {selectedDatasetId}
          </span>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            우체국보험회관 보정계수 멀티빌딩 통합 검토 매트릭스
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold">
              <tr>
                <th className="px-4 py-3.5">회관명 / 권역</th>
                <th className="px-4 py-3.5 text-right">지역 기준가 ($R_{`기준`}$)</th>
                <th className="px-4 py-3.5 text-center">권역 보정계수 ($K_{`권역`}$)</th>
                <th className="px-4 py-3.5 text-center">규모 보정계수 ($K_{`규모`}$)</th>
                <th className="px-4 py-3.5 text-center">연식 보정계수 ($K_{`연식`}$)</th>
                <th className="px-4 py-3.5 text-center">종합 보정계수 ($K_{`종합`}$)</th>
                <th className="px-4 py-3.5 text-right">최종 임대기준가 ($R_{`최종`}$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    로딩 중...
                  </td>
                </tr>
              ) : calcs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    산정을 실행한 데이터셋이 없습니다. 매물 파일을 업로드한 뒤
                    산정을 실행하면 이 표가 채워집니다.
                  </td>
                </tr>
              ) : (
                calcs.map((item) => (
                  <tr key={item.buildingId} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{item.buildingName}</div>
                      <div className="text-[11px] text-slate-400">{item.region} • {item.zone}</div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                      {item.baseRegionalRent.toLocaleString()} 원/㎡
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {item.appliedFactors.zone.toFixed(3)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {item.appliedFactors.size.toFixed(3)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono">
                      <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {item.appliedFactors.age.toFixed(3)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono font-black text-slate-900">
                      {item.appliedFactors.total.toFixed(3)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-black text-indigo-900 text-sm">
                      {item.finalRent.toLocaleString()} 원/㎡
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDA Formula Principles Notice Card */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 text-xs text-indigo-950 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
          <Info className="w-4 h-4 text-indigo-600" />
          지역 기준가 및 AI 보정계수 EDA 자동 산출 공식 원리
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
          <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
            <div className="font-bold text-slate-800">1. 지역 기준가 ($R_{`기준`}$)</div>
            <p className="text-slate-600">EDA 자동 추출 지역 매물호가 중앙값</p>
            <div className="font-mono text-indigo-700 pt-1 border-t border-slate-100">
              서울: 14,406 | 부산: 8,926<br />
              대구: 9,001 | 광주: 7,485
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
            <div className="font-bold text-indigo-900">2. ① 권역 보정계수 ($K_{`권역`}$)</div>
            <p className="text-slate-600">권역 매물호가 중앙값 ÷ 지역 매물호가 중앙값</p>
            <div className="font-mono text-indigo-700 pt-1 border-t border-slate-100">
              예: 12,543 / 14,406 = 0.870
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
            <div className="font-bold text-emerald-900">3. ② 규모 보정계수 ($K_{`규모`}$)</div>
            <p className="text-slate-600">동일 규모 평균 ÷ 지역 평균</p>
            <div className="font-mono text-emerald-700 pt-1 border-t border-slate-100">
              예: 13,245 / 15,919 = 0.832
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
            <div className="font-bold text-amber-900">4. ③ 연식 보정계수 ($K_{`연식`}$)</div>
            <p className="text-slate-600">동일 연식 평균 ÷ 지역 평균</p>
            <div className="font-mono text-amber-700 pt-1 border-t border-slate-100">
              예: 8,383 / 9,253 = 0.906
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
