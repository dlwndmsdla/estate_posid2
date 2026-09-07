/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Building2, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { BuildingMedian, CalculationResult } from "../../types/dataset";
import { listingRepository, valuationRepository } from "../../db/repository";
import { HALL_SPECS } from "../../services/rentalCalculationEngine";

interface ComparableListingsSubViewProps {
  selectedDatasetId: string;
}

/**
 * 회관별 비교 건물 목록.
 *
 * 예전에는 이 화면 전체가 지어낸 값이었다 — "여의도 IFC 타워 2", "당산동 소형
 * 근생빌딩" 같은 건물 5줄과 "Bootstrap 95% 신뢰구간 10,210~11,420 (1,000회
 * 시뮬레이션)" 카드가 상수로 박혀 있었고, 회관을 바꿔도 같은 표가 나왔다.
 * 이 앱은 Bootstrap 을 돌리지 않는다 — 산정은 IQR 게이트로 판정한다.
 *
 * 지금은 업로드한 분기의 건물 중앙값(buildingMedians)과 산정 결과를 그대로 읽는다.
 * 포함/제외 판정도 산정 엔진이 실제로 쓰는 규칙과 같다:
 *   · 권역 비교군 = 회관과 같은 지역·권역, 단가가 있는 건물
 *   · 단가 없음(0·결측)은 중앙값을 낮추므로 엔진이 처음부터 제외한다
 */
export function ComparableListingsSubView({ selectedDatasetId }: ComparableListingsSubViewProps) {
  const [selectedHallId, setSelectedHallId] = useState<string>(HALL_SPECS[0].buildingId);
  const [medians, setMedians] = useState<BuildingMedian[]>([]);
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [m, c] = await Promise.all([
          listingRepository.getBuildingMedians(selectedDatasetId),
          valuationRepository.getCalculationResultsByDataset(selectedDatasetId),
        ]);
        if (cancelled) return;
        setMedians(m);
        setCalcs(c);
      } catch (err) {
        console.error("비교 건물 로드 실패:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDatasetId]);

  const hall = HALL_SPECS.find((h) => h.buildingId === selectedHallId)!;
  const calc = calcs.find((c) => c.buildingId === selectedHallId) || null;

  /** 회관이 속한 지역의 건물 전체. 권역이 같으면 포함, 아니면 제외로 표시한다. */
  const rows = useMemo(() => {
    return medians
      .filter((b) => b.region === hall.region)
      .map((b) => {
        const hasRent = Number.isFinite(b.buildingMedianRent) && b.buildingMedianRent > 0;
        const sameZone = b.zone === hall.zone;
        const included = hasRent && sameZone;
        const reason = !hasRent
          ? "단가 없음 — 중앙값을 낮추므로 산정에서 제외"
          : !sameZone
          ? `다른 권역(${b.zone || "미상"}) — 지역 기준군에는 들어가지만 권역 비교군은 아님`
          : `회관과 같은 권역(${b.zone}) — 권역 비교군 포함`;
        return { ...b, included, reason };
      })
      .sort((a, b) => Number(b.included) - Number(a.included) || b.buildingMedianRent - a.buildingMedianRent);
  }, [medians, hall]);

  const includedCount = rows.filter((r) => r.included).length;
  const zoneDetail = calc?.zoneFactorDetail;

  const won = (n?: number | null) =>
    n === undefined || n === null || !Number.isFinite(n) ? "—" : `${Math.round(n).toLocaleString()}`;

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
            이번 분기에 반입된 건물만 표시합니다. 포함/제외 판정은 산정 엔진이 쓰는 규칙과 같습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">대상 회관 선택:</span>
          <select
            value={selectedHallId}
            onChange={(e) => setSelectedHallId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {HALL_SPECS.map((h) => (
              <option key={h.buildingId} value={h.buildingId}>
                {h.buildingName} ({h.region} · {h.zone})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isLoading && medians.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            <h3 className="font-bold mb-1">이 분기에 반입된 건물이 없습니다</h3>
            <p className="text-xs leading-relaxed">
              예전에는 이 화면이 예시 건물 5건을 실제 비교군처럼 보여줬는데, 근거 없는 값이라
              없앴습니다. <span className="font-bold">1단계 · 자료 반입</span>에서 분기 엑셀을
              올리고 <span className="font-bold">"데이터셋 생성 및 검증 저장"</span>까지 눌러 주세요.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 요약 카드 — 전부 산정 결과에서 읽는다 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400">권역 비교 건물 수</span>
              <span className="text-2xl font-black font-mono text-indigo-900 block">
                {includedCount} 개동
              </span>
              <span className="text-[11px] text-slate-500">
                {hall.region} · {hall.zone}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400">권역 중앙 임대료</span>
              <span className="text-2xl font-black font-mono text-emerald-700 block">
                {won(zoneDetail?.targetGroupMedian)}
              </span>
              <span className="text-[11px] text-slate-500">원/㎡ · 계약면적 기준</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400">지역 기준군</span>
              <span className="text-sm font-black font-mono text-slate-800 block pt-1.5">
                {won(zoneDetail?.baseGroupMedian)} 원/㎡
              </span>
              <span className="text-[11px] text-slate-500">
                {hall.region} 전체 {zoneDetail?.baseGroupCount ?? 0}개동 중앙값
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400">권역 단가 흩어짐 (IQR)</span>
              <span className="text-2xl font-black font-mono text-slate-900 block">
                {zoneDetail?.iqrRatioPercent !== undefined && Number.isFinite(zoneDetail.iqrRatioPercent)
                  ? `${zoneDetail.iqrRatioPercent.toFixed(1)} %`
                  : "—"}
              </span>
              <span className="text-[11px] text-slate-500">
                {zoneDetail?.isApplied ? "15% 이내 → 보정계수 적용" : "기준 초과 → 중립값 1.000"}
              </span>
            </div>
          </div>

          {calc && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">권역 보정계수 산출: </span>
                {zoneDetail?.formulaDescription || "—"}
                {zoneDetail && !zoneDetail.isApplied && (
                  <span className="block mt-1">{zoneDetail.reason}</span>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">비교 건물명</th>
                  <th className="py-3.5 px-4">권역</th>
                  <th className="py-3.5 px-4 text-right">연면적(㎡)</th>
                  <th className="py-3.5 px-4 text-center">준공년도</th>
                  <th className="py-3.5 px-4 text-center">역 거리</th>
                  <th className="py-3.5 px-4 text-center">매물 수</th>
                  <th className="py-3.5 px-4 text-right">중앙 임대료(원/㎡)</th>
                  <th className="py-3.5 px-4 text-center">포함 여부</th>
                  <th className="py-3.5 px-4">포함/제외 사유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {rows.map((row) => (
                  <tr key={row.buildingId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-sans">
                      {row.buildingName || "(빌딩명 없음)"}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-600">{row.zone || "—"}</td>
                    <td className="py-3.5 px-4 text-right">
                      {row.grossArea > 0 ? row.grossArea.toLocaleString() : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.completionYear > 0 ? `${row.completionYear}년` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.subwayDistance > 0 ? `${Math.round(row.subwayDistance)}m` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">{row.validListingCount}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {won(row.buildingMedianRent)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.included ? (
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
        </>
      )}
    </div>
  );
}
