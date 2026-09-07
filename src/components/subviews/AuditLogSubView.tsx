/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { History, UserCheck, Edit3, ShieldCheck, AlertTriangle } from "lucide-react";
import { ConfirmedValuation, DatasetMetadata } from "../../types/dataset";
import { datasetRepository, valuationRepository } from "../../db/repository";
import { HALL_SPECS } from "../../services/rentalCalculationEngine";

/**
 * 확정 이력.
 *
 * 예전에는 이 화면이 "김자산 (자산운영지원팀 / 과장)", "박팀장 (팀장)" 이라는
 * 있지도 않은 결재자와 시각·전후값을 지어내 보여줬다. 감사 로그가 허위면
 * 화면 중에서 가장 위험하다 — 실제 결재가 있었던 것처럼 읽히기 때문이다.
 *
 * 지금은 담당자가 4단계에서 실제로 누른 확정 기록(ConfirmedValuation)만 읽는다.
 * 기록이 없으면 없다고 적는다.
 */
export function AuditLogSubView() {
  const [logs, setLogs] = useState<Array<ConfirmedValuation & { quarterLabel: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const datasets: DatasetMetadata[] = await datasetRepository.listDatasets();
        const all: Array<ConfirmedValuation & { quarterLabel: string }> = [];
        for (const ds of datasets) {
          const confirmed = await valuationRepository.listConfirmedValuationsByDataset(ds.datasetId);
          confirmed.forEach((c) =>
            all.push({
              ...c,
              quarterLabel: `${ds.referenceYear}년 ${ds.referenceQuarter}분기 · ${ds.datasetId}`,
            })
          );
        }
        all.sort((a, b) => (a.confirmedAt < b.confirmedAt ? 1 : -1));
        if (!cancelled) setLogs(all);
      } catch (err) {
        console.error("확정 이력 로드 실패:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hallName = (buildingId: string) =>
    HALL_SPECS.find((h) => h.buildingId === buildingId)?.buildingName || buildingId;

  const won = (n: number) => `${Math.round(n).toLocaleString()} 원/㎡`;

  const auditLogs = logs.map((c) => {
    const changed =
      c.appliedTotalFactor !== c.recommendedTotalFactor
        ? "담당자가 추천 보정계수를 조정함"
        : "추천 보정계수 원안 수용";
    return {
      id: `${c.datasetId}-${c.buildingId}`,
      timestamp: c.confirmedAt ? c.confirmedAt.replace("T", " ").slice(0, 19) : "—",
      target: `${c.quarterLabel} • ${hallName(c.buildingId)}`,
      item: changed,
      beforeVal: `추천 ${c.recommendedTotalFactor.toFixed(3)} (${won(c.recommendedRent)})`,
      afterVal: `적용 ${c.appliedTotalFactor.toFixed(3)} (${won(c.finalRent)})`,
      reason: c.adjustmentReason || "(사유 미기재)",
      author: c.confirmedBy || "(작성자 미기재)",
      version: c.datasetId,
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
            <History className="w-4 h-4" />
            CONFIRMED & MODIFICATION AUDIT LOGS
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            담당자 최종 확정 및 보정계수 수정 이력 (감사 로그)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            우체국보험회관 임대기준가격 모델 산정 시 변경된 계수, 변경 사유, 담당 승인자 및 타임스탬프 이력 관리
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-xs font-bold text-slate-700">담당자 확정 및 수치 수정 감사 로그</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {isLoading ? "불러오는 중…" : `총 ${auditLogs.length}건 등록됨`}
          </span>
        </div>

        {!isLoading && auditLogs.length === 0 && (
          <div className="p-6 flex items-start gap-3 text-sm text-amber-900 bg-amber-50">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold mb-1">확정된 이력이 없습니다</h3>
              <p className="text-xs leading-relaxed">
                이 화면은 담당자가 <span className="font-bold">3단계 · 회관별 임대가격 산정</span>에서
                실제로 확정한 기록만 보여줍니다. 예전에는 예시 결재 이력 3건을 실제처럼 보여줬는데,
                있지도 않은 승인자와 시각이 적혀 있어 없앴습니다.
              </p>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-5 hover:bg-slate-50/80 transition space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded">
                    {log.version}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{log.target}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">변경 항목</span>
                  <span className="font-bold text-slate-800">{log.item}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">변경 전 → 변경 후</span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 line-through">{log.beforeVal}</span>
                    <span>→</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {log.afterVal}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">승인 담당자</span>
                  <span className="font-bold text-slate-700 font-sans">{log.author}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-700 block text-[11px]">조정/확정 사유:</span>
                <p className="leading-relaxed">{log.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
