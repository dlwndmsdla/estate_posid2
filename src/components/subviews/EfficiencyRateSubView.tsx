/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Layers, ShieldCheck, CheckCircle2, ListOrdered, Scale } from "lucide-react";
import {
  HALL_SPECS,
  INITIAL_DEFAULT_EFFICIENCY_RATES as BASE,
} from "../../services/rentalCalculationEngine";

/**
 * 참조 화면이므로 "저장된 기준 전용률표"를 보여주는 것이 맞다. 다만 예전에는 그
 * 숫자를 손으로 옮겨 적어 둬서, 엔진의 표가 바뀌어도 이 화면은 옛 값 그대로였다.
 * 이제 INITIAL_DEFAULT_EFFICIENCY_RATES 에서 직접 읽는다 — 사본을 두지 않는다.
 */
export function EfficiencyRateSubView() {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const regionalRates = Object.entries(BASE.regions).map(([region, r]) => ({
    region,
    med: pct(r.median),
    sample: `${r.sampleCount}건`,
  }));

  const zoneRates = Object.entries(BASE.zones).map(([key, z]) => {
    const [region, zone] = key.split("/");
    const hall = HALL_SPECS.find((h) => h.region === region && h.zone === zone);
    return {
      zone: `${region} ${zone}`,
      rate: pct(z.median),
      sample: z.sampleCount,
      fallbackUsed: z.fallbackUsed === true,
      hall: hall ? hall.buildingName : "-",
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
            <Layers className="w-4 h-4" />
            REGIONAL EFFICIENCY RATE (JEONYUL) STANDARDS
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            지역 및 권역별 표준 전용률(전용면적 ÷ 계약면적) 기준 관리
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            크롤링 호가 매물의 전용단가를 계약단가로 정확히 환산하기 위한 지역·권역별 중앙값 전용률 체계
          </p>
        </div>

        <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl">
          전국 통합 중앙값: {pct(BASE.overall.median)} (표본 {BASE.overall.sampleCount}건)
        </span>
      </div>

      {/* Application Priority Rules */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
          <ListOrdered className="w-4 h-4" />
          <span>전용률 산정 적용 우선순위 (Priority Hierarchy)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
              1순위 (최우선)
            </span>
            <h4 className="font-bold text-white text-sm">매물 고유 전용률</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              크롤링 원천 데이터에 계약면적과 전용면적이 모두 존재하는 경우, 해당 매물 고유의 실제 전용률을 직접 적용.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
              2순위 (권역 표준)
            </span>
            <h4 className="font-bold text-white text-sm">권역별 중앙값 전용률</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              임대(계약)면적이 없어 매물 고유 전용률을 못 구하는 경우(네모 전부), 같은 권역의 전용률 중앙값을 대신 적용.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
              3순위 (기본값)
            </span>
            <h4 className="font-bold text-white text-sm">지역/전국 중앙값</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              권역 표본이 5건 미만이면 해당 시·도 광역 지역 중앙값을, 그것도 없으면 전국 표준
              전용률({pct(BASE.overall.median)})을 차순위 적용.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Rates */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">1. 광역 시·도별 전용률 중앙값</h3>
          <div className="divide-y divide-slate-100">
            {regionalRates.map((r) => (
              <div key={r.region} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 block text-sm">{r.region}</span>
                  <span className="text-slate-500 text-[11px]">알스퀘어 표본 중앙값</span>
                </div>

                <div className="text-right font-mono">
                  <span className="text-base font-black text-indigo-700 block">{r.med}</span>
                  <span className="text-[10px] text-slate-400">표본 {r.sample}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Rates */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">2. 세부 권역별 전용률 세부 매트릭스</h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 text-xs font-mono">
            {zoneRates.map((z) => (
              <div
                key={z.zone}
                className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 font-sans">{z.zone}</span>
                  {z.hall !== "-" && (
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold font-sans">
                      ★ {z.hall}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {z.fallbackUsed && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold font-sans">
                      표본 부족 → 지역값
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-sans">{z.sample}건</span>
                  <span className="font-extrabold text-indigo-700 text-sm">{z.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
