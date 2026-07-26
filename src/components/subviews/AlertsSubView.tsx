/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertTriangle, Info, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";

interface AlertsSubViewProps {
  onNavigate: (main: string, sub: string) => void;
}

export function AlertsSubView({ onNavigate }: AlertsSubViewProps) {
  const alertsList = [
    {
      id: "alt-1",
      level: "warning",
      title: "대구회관 연식 비교군 표본 수 소수 (2건)",
      category: "표본 부족",
      description: "대구 권역 준공 25년 이상 대형 오피스 크롤링 매물이 2건으로 적어 Bootstrap 95% 신뢰구간폭이 다소 넓게 형성되었습니다.",
      actionText: "매물 EDA 분석에서 분포 확인",
      targetMain: "analysis",
      targetSub: "eda",
    },
    {
      id: "alt-2",
      level: "info",
      title: "서울 권역 관측계수 AI 추천치 (1.085)",
      category: "보정계수 산정",
      description: "당산·영등포 권역 오피스 중앙 임대단가가 서울 전체 평균 대비 +8.5% 우세함에 따라 AI 관측계수가 1.085로 계산되었습니다.",
      actionText: "보정계수 검토 및 조정",
      targetMain: "analysis",
      targetSub: "adjustment",
    },
    {
      id: "alt-3",
      level: "warning",
      title: "네모 매물 중 근린생활시설 비중 24% 포함 검증",
      category: "데이터 정합성",
      description: "네모 플랫폼 수집 매물 중 일부 근생 용도가 포함되어 오피스 업무시설 필터링을 통해 자동 배제되었습니다.",
      actionText: "데이터 검증 상세표 확인",
      targetMain: "data",
      targetSub: "validation",
    },
    {
      id: "alt-4",
      level: "success",
      title: "5개 우체국보험회관 적정가격 산정 완료",
      category: "확정 상태",
      description: "2026년 2분기 V1 데이터셋 기준 5개 회관의 적정 임대기준가격 모델 계산이 완료되었습니다.",
      actionText: "회관별 임대가격 산정 확인",
      targetMain: "analysis",
      targetSub: "valuation",
    },
  ];

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
