/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Table, Check, Save, RotateCcw, FileSpreadsheet, ArrowRight } from "lucide-react";

export function ColumnMappingSubView() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("rsquare");

  const standardColumns = [
    { key: "buildingName", label: "건물명", required: true, mappedExcel: "건물명 / 오피스명" },
    { key: "region", label: "지역(시·도)", required: true, mappedExcel: "지역 / 시도" },
    { key: "zone", label: "권역(상권)", required: true, mappedExcel: "권역 / 세부상권" },
    { key: "grossAreaSqm", label: "건물 연면적(㎡)", required: false, mappedExcel: "연면적(㎡)" },
    { key: "leaseArea", label: "임대면적(㎡)", required: true, mappedExcel: "계약면적 / 임대면적" },
    { key: "exclusiveArea", label: "전용면적(㎡)", required: false, mappedExcel: "전용면적(㎡)" },
    { key: "monthlyRent", label: "월임대료(만원)", required: true, mappedExcel: "월세 / 임대료(만원)" },
    { key: "monthlyManagementFee", label: "월관리비(만원)", required: false, mappedExcel: "관리비(만원)" },
    { key: "builtYear", label: "준공연도", required: false, mappedExcel: "준공년도 / 사용승인일" },
    { key: "buildingUse", label: "주용도", required: false, mappedExcel: "주용도 / 건축물용도" },
    { key: "subwayDistanceMeters", label: "지하철역 거리(m)", required: false, mappedExcel: "역거리(m)" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
            <Table className="w-4 h-4" />
            EXCEL COLUMN MAPPING TEMPLATES
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
            크롤링 Excel 수집 열과 시스템 표준 스키마 매핑 관리
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            외부 부동산 플랫폼(알스퀘어, 네모 등)의 다종 Excel 양식을 표준 시스템 스키마로 자동 매핑하는 매핑 템플릿 관리
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition">
            <Save className="w-3.5 h-3.5" />
            <span>매핑 템플릿 저장</span>
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">저장된 템플릿 불러오기:</span>
          <div className="flex gap-2">
            {[
              { id: "rsquare", label: "알스퀘어 표준 양식 (추천)" },
              { id: "nemo", label: "네모 매물 수집 양식" },
              { id: "custom", label: "사용자 지정 Custom" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition border ${
                  selectedTemplate === t.id
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          매핑 상태: 11개 필드 중 11개 매핑 완료
        </span>
      </div>

      {/* Mapping Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">시스템 표준 필드 (Key)</th>
              <th className="py-3.5 px-4">필수 여부</th>
              <th className="py-3.5 px-4 text-center">매핑 방향</th>
              <th className="py-3.5 px-4">업로드 Excel 열 이름 (Header)</th>
              <th className="py-3.5 px-4 text-center">매핑 상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {standardColumns.map((col) => (
              <tr key={col.key} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4 font-bold text-slate-800 font-sans">
                  {col.label} <span className="text-slate-400 font-mono text-[10px]">({col.key})</span>
                </td>
                <td className="py-3.5 px-4">
                  {col.required ? (
                    <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200 font-sans">
                      필수 (Required)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded font-sans">
                      선택 (Optional)
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center text-slate-400">
                  <ArrowRight className="w-4 h-4 mx-auto text-indigo-500" />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    defaultValue={col.mappedExcel}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold w-full max-w-xs text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] font-sans">
                    <Check className="w-3.5 h-3.5" />
                    매핑됨
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
