/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Info, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { CalculationResult, ConfirmedValuation, FactorDetail } from "../../types/dataset";
import { valuationRepository } from "../../db/repository";

interface AlertsSubViewProps {
  onNavigate: (main: string, sub: string) => void;
  selectedDatasetId: string;
}

/**
 * 검토 필요 항목.
 *
 * 예전에는 이 목록이 통째로 지어낸 것이었다 — "대구회관 연식 비교군 2건",
 * "서울 권역 관측계수 1.085", "네모 근린생활시설 24%" 가 전부 고정 문구였고,
 * 어떤 분기를 올려도 같은 4건이 떴다. Bootstrap 신뢰구간을 언급했지만 이 앱은
 * Bootstrap 을 돌리지 않는다.
 *
 * 지금은 이번 분기 산정 결과에서 실제로 걸린 것만 만든다:
 *   · 게이트에 걸려 중립화된 보정계수 (표본 5곳 미만 또는 IQR 15% 초과)
 *   · 아직 확정하지 않은 회관
 */
export function AlertsSubView({ onNavigate, selectedDatasetId }: AlertsSubViewProps) {
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedValuation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [c, v] = await Promise.all([
          valuationRepository.getCalculationResultsByDataset(selectedDatasetId),
          valuationRepository.listConfirmedValuationsByDataset(selectedDatasetId),
        ]);
        if (cancelled) return;
        setCalcs(c);
        setConfirmed(v);
      } catch (err) {
        console.error("경고 목록 로드 실패:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDatasetId]);

  const alertsList = useMemo(() => {
    const list: Array<{
      id: string;
      level: string;
      title: string;
      category: string;
      description: string;
      actionText: string;
      targetMain: string;
      targetSub: string;
    }> = [];

    const labels: Array<[keyof CalculationResult, string]> = [
      ["zoneFactorDetail", "권역"],
      ["sizeFactorDetail", "규모"],
      ["ageFactorDetail", "연식"],
    ];

    calcs.forEach((c) => {
      labels.forEach(([key, label]) => {
        const d = c[key] as FactorDetail;
        if (!d || d.isApplied !== false) return;
        list.push({
          id: `${c.buildingId}-${label}`,
          level: "warning",
          title: `${c.buildingName} ${label} 보정계수 중립화 (관측 ${d.observedFactor.toFixed(3)} → 1.000)`,
          category: "게이트 발동",
          description: d.reason,
          actionText: "회관별 산정 근거 확인",
          targetMain: "analysis",
          targetSub: "valuation",
        });
      });
    });

    const unconfirmed = calcs.filter(
      (c) => !confirmed.some((v) => v.buildingId === c.buildingId)
    );
    if (calcs.length > 0 && unconfirmed.length > 0) {
      list.push({
        id: "unconfirmed",
        level: "info",
        title: `미확정 회관 ${unconfirmed.length}곳`,
        category: "확정 상태",
        description: `${unconfirmed.map((c) => c.buildingName).join(", ")} 은(는) 아직 담당자 확정 전입니다. 확정해야 다음 분기 비교 기준이 됩니다.`,
        actionText: "회관별 임대가격 산정으로 이동",
        targetMain: "analysis",
        targetSub: "valuation",
      });
    }

    if (calcs.length > 0 && list.length === 0) {
      list.push({
        id: "ok",
        level: "success",
        title: `회관 ${calcs.length}곳 산정 완료 · 게이트 경고 없음`,
        category: "확정 상태",
        description: "이번 분기 산정에서 표본 부족·흩어짐 게이트에 걸린 항목이 없습니다.",
        actionText: "회관별 임대가격 산정 확인",
        targetMain: "analysis",
        targetSub: "valuation",
      });
    }

    return list;
  }, [calcs, confirmed]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase">
            <ShieldAlert className="w-4 h-4" />
            CRITICAL SYSTEM ALERTS & MONITORING
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            주요 경고, 모니터링 알림 및 검토 필요 항목
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            표본 부족 경고, 보정계수 이상치 검증, 데이터 정합성 주의 항목 모니터링
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alertsList.map((a) => (
          <div
            key={a.id}
            className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              a.level === "warning"
                ? "bg-amber-50/60 border-amber-200 text-amber-950"
                : a.level === "info"
                ? "bg-blue-50/60 border-blue-200 text-blue-950"
                : "bg-emerald-50/60 border-emerald-200 text-emerald-950"
            }`}
          >
            <div className="flex items-start gap-3">
              {a.level === "warning" ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : a.level === "info" ? (
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      a.level === "warning"
                        ? "bg-amber-200/80 text-amber-900"
                        : a.level === "info"
                        ? "bg-blue-200/80 text-blue-900"
                        : "bg-emerald-200/80 text-emerald-900"
                    }`}
                  >
                    {a.category}
                  </span>
                  <h3 className="font-bold text-sm">{a.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{a.description}</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate(a.targetMain, a.targetSub)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm shrink-0 self-start sm:self-auto"
            >
              <span>{a.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
