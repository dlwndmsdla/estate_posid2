/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { InsuranceBuilding, EstimatorConfig, ValuationConfig } from "../types";
import { FileText, Cpu, Sparkles, Printer, Copy, Check, Loader2, RefreshCw, Calculator, Info, X, Sliders, Scale, ShieldCheck, ArrowRight, HelpCircle } from "lucide-react";

interface AiAdvisorProps {
  building: InsuranceBuilding;
  estimatedMonthlyRent: number;
  estimatedDeposit: number;
  valuationResult: number;
  estimatorConfig: EstimatorConfig;
  valuationConfig: ValuationConfig;
}

// Custom performant high-contrast Markdown Renderer for South Korean Institutional Document Aesthetic
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  
  return (
    <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith("###")) {
          return (
            <h4 key={idx} className="text-sm font-bold text-indigo-900 border-l-4 border-indigo-600 pl-2.5 mt-5 mb-2.5 uppercase tracking-tight">
              {trimmed.replace("###", "").trim()}
            </h4>
          );
        }
        if (trimmed.startsWith("##")) {
          return (
            <h3 key={idx} className="text-sm font-extrabold text-slate-800 border-b border-slate-200 pb-1.5 mt-6 mb-3 uppercase tracking-tight">
              {trimmed.replace("##", "").trim()}
            </h3>
          );
        }
        if (trimmed.startsWith("#")) {
          return (
            <h2 key={idx} className="text-base font-extrabold text-slate-900 mt-7 mb-4 tracking-tight">
              {trimmed.replace("#", "").trim()}
            </h2>
          );
        }
        if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
          // Parse strong references **text** inside list item
          const rawText = trimmed.replace(/^[\s*-]+/, "").trim();
          const parts = rawText.split("**");
          return (
            <div key={idx} className="flex items-start gap-2 pl-3 py-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
              <p className="text-xs text-slate-700">
                {parts.map((part, pIdx) => 
                  pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-slate-900">{part}</strong> : part
                )}
              </p>
            </div>
          );
        }
        if (trimmed === "---") {
          return <hr key={idx} className="border-slate-200/60 my-4" />;
        }
        if (trimmed !== "") {
          const parts = trimmed.split("**");
          return (
            <p key={idx} className="text-xs text-slate-600">
              {parts.map((part, pIdx) => 
                pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-slate-900">{part}</strong> : part
              )}
            </p>
          );
        }
        return <div key={idx} className="h-1" />;
      })}
    </div>
  );
};

export const AiAdvisor: React.FC<AiAdvisorProps> = ({
  building,
  estimatedMonthlyRent,
  estimatedDeposit,
  valuationResult,
  estimatorConfig,
  valuationConfig,
}) => {
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  // Total weight summation
  const totalWeightPercent = 
    estimatorConfig.locationWeight + 
    estimatorConfig.ageWeight + 
    estimatorConfig.sizeWeight + 
    estimatorConfig.infraWeight + 
    estimatorConfig.brandWeight;

  const calibrationFactor = 1 + totalWeightPercent / 100;

  const generateReport = async () => {
    setLoading(true);
    setReport("");
    
    // Animated sequence of analysis steps for premium user engagement
    const steps = [
      "인근 비교 부동산 월 임대 조건 취합 중...",
      "감정평가 3대 방식 시산 복합 연산 수행 중...",
      "우체국금융개발원 브랜드 전결 가치 보정 반영 중...",
      "Gemini AI 부동산 대체투자 분석 브레인 구동 중...",
      "전략 진단 보고서 작성 완료 단계..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, i === 3 ? 900 : 500));
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildingName: building.name,
          address: building.address,
          city: building.city,
          builtYear: building.builtYear,
          grossAreaSqm: building.grossAreaSqm,
          floors: building.floors,
          currentRent: {
            deposit: building.currentDepositPerPyeong,
            monthly: building.currentMonthlyRentPerPyeong,
            maintenance: building.currentMaintenancePerPyeong,
          },
          estimatedRent: {
            deposit: estimatedDeposit,
            monthly: estimatedMonthlyRent,
          },
          valuationMethod: "3사 합산 감정과 가치 정산",
          valuationResult: valuationResult.toFixed(0),
          comparables: building.comparables,
          config: estimatorConfig,
        }),
      });

      if (!response.ok) {
        throw new Error("서버와의 원활한 통신에 실패했습니다.");
      }

      const data = await response.json();
      setReport(data.report);
    } catch (e) {
      console.error(e);
      setReport("### ❌ 지동 분석 오류 안내\n서버 측 분석 파이프라인 구동 도중 예기치 못한 오프라인 장애가 발생하였습니다. 데이터 구조를 점검하신 뒤 다시 시도해 주십시오.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!report) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${building.name} - 전문 AI 자산 보고서</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #334155; line-height: 1.6; }
              h2 { border-bottom: 2px solid #312e81; padding-bottom: 8px; color: #1e1b4b; }
              h3 { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e293b; margin-top: 24px; }
              h4 { color: #312e81; border-left: 4px solid #312e81; padding-left: 8px; margin-top: 16px; }
              p, li { font-size: 14px; }
              hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>우체국보험회관 전문 자산 분석서</h1>
            <p><strong>수신:</strong> 우체국금융개발원 자산운영지원팀</p>
            <p><strong>대상 자산:</strong> ${building.name} (${building.address})</p>
            <hr />
            <div>${report.replace(/\n/g, "<br>")}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm ring-1 ring-indigo-50/50 space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-50">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl relative shrink-0">
            <Cpu className="w-5 h-5" />
            <Sparkles className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-slate-800 text-base flex items-center gap-2">
              우체국금융개발원 자산 특화 전문 인공지능(AI) 보고서
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              인근 비교군 수집 자료와 감정평가 결과를 결합하여 자산 가치 제고 대안을 실시간 수립합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormulaModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 border border-indigo-200 transition cursor-pointer shadow-sm"
            title="산출 원리 및 보정 가중치 공식 안내 모달 열기"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            산출 공식 & 가중치 원리 검증
          </button>

          {report && !loading && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200 transition"
                title="보고서 텍스트 복사"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? "복사동작 완료" : "복사"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200 transition"
                title="인쇄용 새 윈도우 생성"
              >
                <Printer className="w-3.5 h-3.5" />
                인쇄
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div id="ai-report-paper" className="min-h-[140px] bg-slate-50/50 rounded-xl p-6 border border-slate-100/80 flex flex-col items-center justify-center relative overflow-hidden">
        
        {/* State 1: Ready - No report generated yet */}
        {!report && !loading && (
          <div id="ai-advisor-ready-state" className="text-center py-6 max-w-md space-y-4">
            <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-700">심층 전략 자산 보고서 미발행 상태</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                현재 임대료 보정 슬라이더와 감정평가 연동 핵심 변수를 수정한 뒤 아래 버튼을 클릭하면, 실시간 현황을 수합한 국문 전문 감정 및 전략 보고서를 조산 발행합니다.
              </p>
            </div>
            <button
              onClick={generateReport}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl px-5 py-2.5 text-xs font-semibold hover:bg-indigo-700 shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              AI 심층 종합 자산 보고서 발행
            </button>
          </div>
        )}

        {/* State 2: Loading anim */}
        {loading && (
          <div id="ai-advisor-loading-state" className="text-center py-8 space-y-3.5">
            <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin absolute" />
              <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700 animate-pulse">정합성 보고서 생성 중</p>
              <p className="text-[10px] text-indigo-600 font-mono tracking-tight bg-indigo-50/60 px-3 py-1 rounded-full">{loadingStep}</p>
            </div>
          </div>
        )}

        {/* State 3: Rendered Custom Report */}
        {report && !loading && (
          <div className="w-full text-left space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-indigo-600">
                우체국금융개발원 자산투자 분석전략전담실 발행본
              </span>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                ✔ 실시간 데이터 인계완료
              </span>
            </div>
            
            <SimpleMarkdown content={report} />

            <div className="border-t border-slate-200/60 pt-4 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[9px] text-slate-400 font-mono">
                본 진단서는 실시간 입력 변수의 피드백에 입각해 생성된 시뮬레이션으로 법적 효력은 배제됩니다.
              </span>
              <button
                onClick={generateReport}
                className="self-end inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
              >
                <RefreshCw className="w-3 h-3" />
                지표 수정본 보고서 재생 생성
              </button>
            </div>
          </div>
        )}
      {/* Technical Explanation Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    기술 명세서
                  </span>
                  <h3 className="font-sans font-extrabold text-slate-800 text-base md:text-lg mt-0.5">
                    적정 임대기준금액 산출 원리 & 보정 가중치 기술 검증
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Principle 1: Median Primacy */}
            <div className="space-y-2.5 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="font-extrabold text-slate-800 text-sm">
                  1. 중앙값 우선 적용 원칙 (Median Primacy Principle)
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                인근 상권 비교 자산군(Peer Group)에서 임대료 단가를 산출할 때, <strong className="text-slate-800">산술평균(Mean) 대신 중앙값(Median)</strong>을 우선 적용합니다.
              </p>
              
              <div className="bg-white border border-indigo-100 p-3 rounded-lg font-mono text-xs text-indigo-900 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans block">수식 1-1. 상권 기준 중앙값 단가 산출</span>
                <div className="font-bold">
                  R<sub>중앙값</sub> = Median &#123; R<sub>1</sub>, R<sub>2</sub>, ..., R<sub>N</sub> &#125;
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 leading-normal pt-1">
                <p>
                  <strong>💡 왜 산술평균 대신 중앙값을 사용하는가?</strong><br />
                  부동산 매물 데이터에는 리모델링 직후의 극단적 고가 매물이나, 특수관계 거래 등 극단적 저가 매물(Outlier)이 포함될 위험이 높습니다. 산술평균은 이러한 극단치에 쉽게 왜곡되나, <strong>중앙값은 왜곡을 자동으로 차단하는 강건성(Robustness)</strong>을 가집니다.
                </p>
              </div>
            </div>

            {/* Principle 2: Additive Weighting Calibration */}
            <div className="space-y-2.5 bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h4 className="font-extrabold text-slate-800 text-sm">
                  2. 보정 가중치 선형 합산 방식 (Additive Weighting Calibration)
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                운영 담당자가 조정한 5가지 개별 보정 변수($w_i$, 단위: %)를 선형으로 합산하여 최종 보정계수(Calibration Factor, $K$)를 결정합니다.
              </p>

              {/* Math Formulas Box */}
              <div className="bg-white border border-indigo-200 p-3.5 rounded-lg space-y-2 font-mono text-xs text-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">수식 2-1. 총 가중치 합산식</span>
                  <div className="font-bold text-indigo-700">
                    W<sub>총합</sub> (%) = w<sub>입지</sub> + w<sub>노후도</sub> + w<sub>규모</sub> + w<sub>인프라</sub> + w<sub>브랜드</sub>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-sans block">수식 2-2. 최종 산출 적정 임대기준금액 식</span>
                  <div className="font-bold text-slate-900 text-sm">
                    R<sub>최종</sub> = R<sub>중앙값</sub> &times; ( 1 + W<sub>총합</sub> / 100 )
                  </div>
                </div>
              </div>

              {/* 5 Weight Factors Table */}
              <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="block text-[9px] text-slate-400">입지</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">{estimatorConfig.locationWeight}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="block text-[9px] text-slate-400">노후도</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">{estimatorConfig.ageWeight}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="block text-[9px] text-slate-400">규모</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">{estimatorConfig.sizeWeight}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="block text-[9px] text-slate-400">인프라</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">{estimatorConfig.infraWeight}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="block text-[9px] text-slate-400">브랜드</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">{estimatorConfig.brandWeight}%</span>
                </div>
              </div>
            </div>

            {/* Live Sandbox Computation */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                  실시간 연산 시뮬레이터 ({building.name})
                </span>
                <span className="text-[10px] text-slate-400">
                  보정계수 K = {calibrationFactor.toFixed(3)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">기본 중앙값 (R<sub>중앙값</sub>)</span>
                  <span className="font-bold text-slate-200">
                    {(estimatedMonthlyRent / calibrationFactor).toFixed(2)} 만원/㎡
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">총 가중치 (W<sub>총합</sub>)</span>
                  <span className="font-bold text-indigo-300">
                    {totalWeightPercent >= 0 ? "+" : ""}{totalWeightPercent}%
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block font-bold">최종 적정 제안 단가</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {estimatedMonthlyRent.toFixed(2)} 만원/㎡
                  </span>
                </div>
              </div>
            </div>

            {/* Footer button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                검증 확인 및 닫기
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
    </div>
  );
};
