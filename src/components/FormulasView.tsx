/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, Calculator, Sparkles, CheckCircle2, ShieldCheck, Scale } from "lucide-react";

export function FormulasView() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
          <BookOpen className="w-4 h-4" />
          SYSTEM CALCULATION PRINCIPLES & MATHEMATICAL FORMULAS
        </div>
        <h2 className="text-lg md:text-xl font-extrabold text-slate-800">
          우체국보험회관 적정 임대기준가격 산출기준 및 보정 공식 명세
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          본 명세서는 외부 크롤링 매물 데이터를 기반으로 분기별 임대기준가격을 산출하고 보정계수를 도출하는 수학적 모델 및 알고리즘 기준을 규정합니다.
        </p>
      </div>

      {/* Principles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Card 1: Efficiency & Conversion */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            1. 면적 변환 및 계약면적당 임대료 단가산출
          </h3>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
            <p className="font-bold text-indigo-900">계약면적당 임대료 (원/㎡/월)</p>
            <p className="text-slate-600">= (월임대료 × 10,000) ÷ 임대면적(㎡)</p>
          </div>
          <p className="text-slate-600 leading-relaxed">
            매물 고유 전용률이 존재하는 경우 해당 비율을 적용하며, 전용률 누락 시 권역 중앙값 전용률을 적용하여 전용면적당 임대료를 계약면적당 단가로 표준화합니다.
          </p>
        </div>

        {/* Card 2: Building Median Aggregation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            2. 건물별 중앙값(Median) 대표값 통합
          </h3>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
            <p className="font-bold text-emerald-900">건물별 대표 임대료</p>
            <p className="text-slate-600">= Median(동일 건물 매물 계약면적당 임대료)</p>
          </div>
          <p className="text-slate-600 leading-relaxed">
            동일 건물에 복수의 매물이 존재할 경우 산정 오류 및 편향을 방지하기 위해 평균(Mean)이 아닌 중앙값(Median)으로 통합하여 대표값을 도출합니다.
          </p>
        </div>

        {/* Card 3: Calibration Factors */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            3. 순차적 좁혀가기(Sequential Narrowing) 보정계수 산출 방식
          </h3>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1.5">
            <p className="font-bold text-indigo-900">① 권역보정계수 = 권역 중앙값 ÷ 지역 전체 중앙값</p>
            <p className="font-bold text-emerald-900">② 규모보정계수 = 유사규모(대·중·소) 중앙값 ÷ 권역 중앙값</p>
            <p className="font-bold text-amber-900">③ 연식보정계수 = 유사연식(±5년)·유사규모 중앙값 ÷ 유사규모 중앙값</p>
            <p className="font-bold text-slate-900 pt-1 border-t border-slate-200">
              최종 임대기준가 = 지역 기준가 × ①권역보정 × ②규모보정 × ③연식보정
            </p>
          </div>
          <p className="text-slate-600 leading-relaxed">
            지역 기준가에서 시작하여 권역 ➔ 규모 ➔ 연식 순으로 비교 대상을 단계를 거쳐 순차적으로 좁혀가며 가격 변화율을 도출합니다. 각 계수의 분모는 바로 앞 단계의 대표 중앙값을 사용합니다.
          </p>
        </div>

        {/* Card 4: AI Recommendation Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            4. 통계 검증(비교 표본 수 및 IQR 안정성) 및 AI 추천 원칙
          </h3>
          <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
            <li><strong>추천 적용 조건:</strong> 비교 건물 수 최소 조건과 IQR 안정성 조건(IQR/중앙값 ≤ 25%)을 모두 만족하는 경우 관측 보정계수를 추천 보정계수로 적용</li>
            <li><strong>중립값 적용 조건:</strong> 비교군 건물 수가 부족하거나 IQR 산산도가 커 통계적 안정성을 만족하지 못하는 경우 중립값 1.000 적용</li>
            <li><strong>담당자 재량:</strong> 담당자 적용 보정계수는 추천 보정계수를 기본값으로 하여 정성적 시장 사유에 따라 조정 가능</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
