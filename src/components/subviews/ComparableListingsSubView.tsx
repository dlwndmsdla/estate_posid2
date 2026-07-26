/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Building2, Search, CheckCircle2, XCircle, Info, Filter } from "lucide-react";

export function ComparableListingsSubView() {
  const [selectedHall, setSelectedHall] = useState<string>("당산회관");

  const comparablesData = [
    { name: "당산 SK V1센터 A동", area: 38200, year: 2018, eff: "55.0%", subway: "280m", rent: 11200, status: "포함", reason: "동일 권역 300m 이내 대형 오피스 군" },
    { name: "영등포 타임스퀘어 T1", area: 85000, year: 2009, eff: "52.0%", subway: "350m", rent: 11800, status: "포함", reason: "동일 영등포 상권 대형 오피스 기준" },
    { name: "문래 하이테크시티 1동", area: 42000, year: 2012, eff: "54.5%", subway: "400m", rent: 10400, status: "포함", reason: "비교군 정상 포함" },
    { name: "여의도 IFC 타워 2", area: 120000, year: 2012, eff: "50.4%", subway: "150m", rent: 18500, status: "제외", reason: "CBD/YBD 프라임급 특수 이상치 단가 제외" },
    { name: "당산동 소형 근생빌딩", area: 1200, year: 1995, eff: "68.0%", subway: "600m", rent: 6200, status: "제외", reason: "연면적 3,000㎡ 미만 소형 근생 배제" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
            <Building2 className="w-4 h-4" />
            FINAL COMPARABLE BUILDINGS & DETAILED STATISTICS
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            회관별 최종 포함·제외 비교 건물 세부 통계 및 사유
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            우체국보험회관 적정가격 모델 산정에 반영된 비교 오피스 건물별 연면적, 연식, 전용률, 중앙 임대료 및 포함/제외 판정 사유
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">대상 회관 선택:</span>
          <select
            value={selectedHall}
            onChange={(e) => setSelectedHall(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="당산회관">당산회관 (서울)</option>
            <option value="영등포회관">영등포회관 (서울)</option>
            <option value="부산회관">부산회관 (부산)</option>
            <option value="대구회관">대구회관 (대구)</option>
            <option value="광주회관">광주회관 (광주)</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400">최종 비교 표본 수</span>
          <span className="text-2xl font-black font-mono text-indigo-900 block">31 개동</span>
          <span className="text-[11px] text-slate-500">당산·영등포 권역 정제 표본</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400">비교군 중앙 임대료</span>
          <span className="text-2xl font-black font-mono text-emerald-700 block">10,800 원/㎡</span>
          <span className="text-[11px] text-slate-500">계약면적 환산 기준</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Bootstrap 95% 신뢰구간</span>
          <span className="text-sm font-black font-mono text-slate-800 block">10,210 ~ 11,420</span>
          <span className="text-[11px] text-slate-500">1,000회 시뮬레이션 결과</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400">평균 전용률</span>
          <span className="text-2xl font-black font-mono text-slate-900 block">55.0 %</span>
          <span className="text-[11px] text-slate-500">당산·문래 권역 중앙값</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">비교 건물명</th>
              <th className="py-3.5 px-4 text-right">연면적(㎡)</th>
              <th className="py-3.5 px-4 text-center">준공년도</th>
              <th className="py-3.5 px-4 text-center">전용률</th>
              <th className="py-3.5 px-4 text-center">역 거리</th>
              <th className="py-3.5 px-4 text-right">중앙 임대료(원/㎡)</th>
              <th className="py-3.5 px-4 text-center">포함 여부</th>
              <th className="py-3.5 px-4">포함/제외 사유</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {comparablesData.map((row) => (
              <tr key={row.name} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4 font-bold text-slate-800 font-sans">{row.name}</td>
                <td className="py-3.5 px-4 text-right">{row.area.toLocaleString()}</td>
                <td className="py-3.5 px-4 text-center">{row.year}년</td>
                <td className="py-3.5 px-4 text-center">{row.eff}</td>
                <td className="py-3.5 px-4 text-center">{row.subway}</td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                  {row.rent.toLocaleString()}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {row.status === "포함" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-sans">
                      <CheckCircle2 className="w-3 h-3" /> 포함
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-sans">
                      <XCircle className="w-3 h-3" /> 제외
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-500 font-sans text-[11px]">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
