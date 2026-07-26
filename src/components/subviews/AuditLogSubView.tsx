/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { History, UserCheck, Edit3, ShieldCheck } from "lucide-react";

export function AuditLogSubView() {
  const auditLogs = [
    {
      id: "log-101",
      timestamp: "2026-07-25 14:20:11",
      target: "2026년 2분기 V1 • 서울 당산회관",
      item: "권역 담당자 적용계수",
      beforeVal: "1.000",
      afterVal: "1.085",
      reason: "당산·영등포 권역 최근 거래호가 중앙값 프리미엄 반영 (AI 추천값 동일 수용)",
      author: "김자산 (자산운영지원팀 / 과장)",
      version: "V1.1",
    },
    {
      id: "log-102",
      timestamp: "2026-07-25 10:15:40",
      target: "2026년 2분기 V1 • 부산회관",
      item: "최종 산정 임대가격 확정",
      beforeVal: "미확정 (6,600 원/㎡)",
      afterVal: "확정 (6,850 원/㎡)",
      reason: "부산 서면·중구 권역 오피스 시장 호가 인상분 반영 최종 승인",
      author: "박팀장 (자산운영지원팀 / 팀장)",
      version: "V1.0",
    },
    {
      id: "log-103",
      timestamp: "2026-04-12 16:05:22",
      target: "2026년 1분기 V2 • 대구회관",
      item: "규모 담당자 적용계수",
      beforeVal: "1.050",
      afterVal: "1.000",
      reason: "대구 도심권역 대형빌딩 표본 부족에 따른 AI 추천 표준계수(1.000) 원복",
      author: "이심사 (자산운영지원팀 / 대리)",
      version: "V2.0",
    },
  ];

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
          <span className="text-[11px] text-slate-500 font-mono">총 3건 등록됨</span>
        </div>

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
