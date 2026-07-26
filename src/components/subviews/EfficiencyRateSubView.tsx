/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Layers, ShieldCheck, CheckCircle2, ListOrdered, Scale } from "lucide-react";

export function EfficiencyRateSubView() {
  const regionalRates = [
    { region: "서울", med: "50.6%", mean: "54.7%", sample: "150건", desc: "CBD/YBD/GBD 주요 오피스 평균 전용률" },
    { region: "부산", med: "63.5%", mean: "63.8%", sample: "332건", desc: "서면·중구·시청 오피스 평균 전용률" },
    { region: "대구", med: "62.2%", mean: "64.5%", sample: "236건", desc: "동대구·도심권 오피스 평균 전용률" },
    { region: "광주", med: "68.8%", mean: "67.7%", sample: "190건", desc: "상무·금남로 오피스 평균 전용률" },
  ];

  const zoneRates = [
    { zone: "서울 여의도(YBD)", rate: "50.4%", hall: "-" },
    { zone: "서울 당산·문래", rate: "55.0%", hall: "당산회관 (55.0%)" },
    { zone: "부산 중구·남포", rate: "59.8%", hall: "부산회관 (60.0%)" },
    { zone: "부산진구 서면", rate: "65.8%", hall: "-" },
    { zone: "대구 중구·도심", rate: "57.4%", hall: "대구회관 (60.0%)" },
    { zone: "대구 수성구", rate: "62.2%", hall: "-" },
    { zone: "광주 서구 상무", rate: "65.1%", hall: "광주회관 (68.0%)" },
    { zone: "광주 동구 금남로", rate: "70.0%", hall: "-" },
  ];

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
          전국 통합 중앙값: 62.0%
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
              전용면적이 누락된 경우, 동일 세부 상권/권역(예: 당산·문래 55.0%)의 전용률 중앙값을 보정 적용.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
              3순위 (기본값)
            </span>
            <h4 className="font-bold text-white text-sm">지역/전국 중앙값</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              권역 표본이 미달인 경우 해당 시·도 광역 지역 중앙값 또는 전국 표준 전용률(62.0%)을 차순위 적용.
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
                  <span className="text-slate-500 text-[11px]">{r.desc}</span>
                </div>

                <div className="text-right font-mono">
                  <span className="text-base font-black text-indigo-700 block">{r.med}</span>
                  <span className="text-[10px] text-slate-400">평균 {r.mean} ({r.sample})</span>
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
                <span className="font-extrabold text-indigo-700 text-sm">{z.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
