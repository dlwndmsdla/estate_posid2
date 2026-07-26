/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { InsuranceBuilding, ValuationConfig } from "../types";
import { Landmark, TrendingUp, Hammer, DollarSign, Calculator, Percent } from "lucide-react";
import { sqmMetersToPyeong } from "../data";

interface AssetValuationProps {
  building: InsuranceBuilding;
  estimatedMonthlyRent: number;
  estimatedDeposit: number;
  totalAdjustmentMultiplier: number; // calculated as 1 + totalAdjustmentPercent/100
  config: ValuationConfig;
  onConfigChange: (newConfig: ValuationConfig) => void;
  onCalculatedValuation: (valInWons: number) => void;
}

export const AssetValuation: React.FC<AssetValuationProps> = ({
  building,
  estimatedMonthlyRent,
  estimatedDeposit,
  totalAdjustmentMultiplier,
  config,
  onConfigChange,
  onCalculatedValuation,
}) => {
  const handleSliderChange = (key: keyof ValuationConfig, val: number) => {
    onConfigChange({
      ...config,
      [key]: val,
    });
  };

  // Convert gross area to pyeong
  const grossAreaPyeong = useMemo(() => {
    return sqmMetersToPyeong(building.grossAreaSqm);
  }, [building.grossAreaSqm]);

  // 1. 수익환원법 (Direct Capitalization Method)
  const incomeCapitalizationValue = useMemo(() => {
    // Annualized rent income (assuming occupancy rate) using SQM directly
    const annualRentIncome = building.grossAreaSqm * estimatedMonthlyRent * 12 * (1 - config.vacancyRate / 100);
    // Interest earning equivalent from deposits (standard 3.5% safe yield) using SQM directly
    const annualDepositEarnings = building.grossAreaSqm * estimatedDeposit * 0.035 * (1 - config.vacancyRate / 100);
    const potentialGrossIncome = annualRentIncome + annualDepositEarnings;
    
    // Operating Expenses (management, cleaning, taxes, insurance etc.)
    const opExpenses = potentialGrossIncome * (config.operatingExpenses / 100);
    
    // Net Operating Income (NOI)
    const netOperatingIncome = potentialGrossIncome - opExpenses;
    
    // Valuation = NOI / Cap Rate
    const valuationInWons = netOperatingIncome / (config.capRate / 100); // 만원 단위
    return {
      noi: netOperatingIncome,
      pgo: potentialGrossIncome,
      opex: opExpenses,
      value: valuationInWons / 100000, // 억 원 단위
    };
  }, [building.grossAreaSqm, estimatedMonthlyRent, estimatedDeposit, config]);

  // 2. 거래사례비교법 (Sales Comparison Method)
  const salesComparisonValue = useMemo(() => {
    // Base transaction rates peer averages per sqm for major district types
    let baseRatePerSqm = 0;
    switch (building.city) {
      case "당산":
      case "영등포":
      case "서울": baseRatePerSqm = 950; break;
      case "부산": baseRatePerSqm = 410; break;
      case "광주": baseRatePerSqm = 350; break;
      case "대구": baseRatePerSqm = 320; break;
      case "대전": baseRatePerSqm = 380; break;
      default: baseRatePerSqm = 400;
    }
    
    // Adjusted by structural weights from custom configurations
    const adjustedRatePerSqm = baseRatePerSqm * totalAdjustmentMultiplier;
    const valuationInWons = adjustedRatePerSqm * building.grossAreaSqm; // 만원 단위
    return {
      ratePerSqm: adjustedRatePerSqm,
      value: valuationInWons / 10000, // 억 원 단위
    };
  }, [building, totalAdjustmentMultiplier]);

  // 3. 원가법 (Cost Method)
  const costApproachValue = useMemo(() => {
    // Land value = Land area * Land price base
    const landValue = building.landAreaSqm * config.landUnitCostPerSqm; // 만원 단위
    
    // Building depreciated cost = Gross area * construction cost * (1 - depreciation rate)
    const baseBuildingCost = building.grossAreaSqm * config.reconstructionUnitCost; // 만원 단위
    const buildingValue = baseBuildingCost * (1 - config.depreciationRate / 100);
    
    const totalValuationInWons = landValue + buildingValue;
    return {
      landVal: landValue / 100000, // 억 원 단위
      buildingVal: buildingValue / 100000, // 억 원 단위
      value: totalValuationInWons / 100000, // 억 원 단위
    };
  }, [building, config]);

  // Blended average (감정평가 시 가치 시산 정산)
  const blendedValue = useMemo(() => {
    return (incomeCapitalizationValue.value + salesComparisonValue.value + costApproachValue.value) / 3;
  }, [incomeCapitalizationValue.value, salesComparisonValue.value, costApproachValue.value]);

  // Callback to pass up to parent for AI reporting safely in a useEffect block
  React.useEffect(() => {
    onCalculatedValuation(blendedValue);
  }, [blendedValue, onCalculatedValuation]);

  const maxVal = Math.max(
    incomeCapitalizationValue.value,
    salesComparisonValue.value,
    costApproachValue.value,
    1
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-sans font-semibold text-slate-800 text-lg flex items-center gap-2">
          <Landmark id="landmark-valuation-icon" className="w-5 h-5 text-indigo-600" />
          공인 3대 감정평가론 적용 복합 자산가치 산출 엔진
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          수익환원법, 거래사례비교법, 원가법 시산 가격의 장단점을 상호 보정하는 학술적 설계에 입각해 공인 가치 판단을 도출합니다.
        </p>
      </div>

      {/* Grid: 3 Methods Bento Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Method 1: 수익환원법 */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <span className="p-1 px-1.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">수익형</span>
              <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                수익환원법 (Income Direct cap)
              </h4>
            </div>
            
            <p className="text-[11px] text-slate-500 my-2">
              순영업소득(NOI)을 인근 빌딩 표준 환원이율과 대조하여 임대 이율 측면 자산가치를 계측합니다.
            </p>

            <div className="space-y-3 pt-1 text-xs">
              {/* NOI Calculation sub-ledger */}
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">총 잠재수입 (연간)</span>
                <span className="font-mono text-slate-700">{(incomeCapitalizationValue.pgo / 10000).toFixed(1)} 억</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">영업경비 (연 {config.operatingExpenses}%)</span>
                <span className="font-mono text-slate-700">{(incomeCapitalizationValue.opex / 10000).toFixed(1)} 억</span>
              </div>
              <div className="flex justify-between font-medium border-t border-slate-200/60 pt-1.5 text-slate-800 text-[11px]">
                <span>순영업소득 (NOI)</span>
                <span className="font-mono text-emerald-700">{(incomeCapitalizationValue.noi / 10000).toFixed(1)} 억 원</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 mt-4">
            <span className="block text-[10px] text-slate-400 font-mono">수익 산출 가격</span>
            <span className="text-lg font-mono font-bold text-slate-800">{incomeCapitalizationValue.value.toFixed(1)} 억 원</span>
          </div>
        </div>

        {/* Method 2: 거래사례비교법 */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <span className="p-1 px-1.5 bg-sky-100 text-sky-800 font-bold text-[10px] rounded">시장형</span>
              <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1">
                <Calculator className="w-4 h-4 text-sky-600" />
                거래사례비교법 (Sales Comp)
              </h4>
            </div>

            <p className="text-[11px] text-slate-500 my-2">
              최근 행정구역 및 금융역세권 지역에서 성사된 타 오피스 빌딩 평당 실거래 매각 가격과 비교합니다.
            </p>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">도시 기준단가 (㎡)</span>
                <span className="font-mono text-slate-700">{(salesComparisonValue.ratePerSqm / totalAdjustmentMultiplier).toFixed(0)} 만원</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">보정 반영단가 (㎡)</span>
                <span className="font-mono text-indigo-600 font-medium">{salesComparisonValue.ratePerSqm.toFixed(0)} 만원</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">소재 권역가 가중치</span>
                <span className="font-mono text-slate-700">{(totalAdjustmentMultiplier).toFixed(2)}x 배율</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 mt-4">
            <span className="block text-[10px] text-slate-400 font-mono">시장 산출 가격</span>
            <span className="text-lg font-mono font-bold text-slate-800">{salesComparisonValue.value.toFixed(1)} 억 원</span>
          </div>
        </div>

        {/* Method 3: 원가법 */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <span className="p-1 px-1.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">조달형</span>
              <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1">
                <Hammer className="w-4 h-4 text-amber-600" />
                원가법 (Cost Restoration)
              </h4>
            </div>

            <p className="text-[11px] text-slate-500 my-2">
              공시지가 기준 토지 가치와, 현시점 재제조 재조달 신축비용에서 감가상각을 원상제외 조산 누계 산정합니다.
            </p>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">토지 공시가치 (대지형)</span>
                <span className="font-mono text-slate-700">{costApproachValue.landVal.toFixed(1)} 억</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">건물 재조달 (감가반영)</span>
                <span className="font-mono text-slate-700">{costApproachValue.buildingVal.toFixed(1)} 억</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">총 경과 감가율</span>
                <span className="font-mono text-red-650 text-red-600 font-medium">-{config.depreciationRate}% 감가</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 mt-4">
            <span className="block text-[10px] text-slate-400 font-mono">원가 산출 가격</span>
            <span className="text-lg font-mono font-bold text-slate-800">{costApproachValue.value.toFixed(1)} 억 원</span>
          </div>
        </div>

      </div>

      {/* Adjusting Financial Sliders & Visual Chart Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Detail Controls */}
        <div className="space-y-4 bg-slate-50/50 rounded-xl p-5 border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
            <Percent id="valuation-control-percent" className="w-4 h-4 text-indigo-600" />
            자산가치 평가 연동 핵심 원수 변수 제어
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cap Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">환원이율 (Cap Rate)</span>
                <span className="font-mono font-bold text-indigo-600">{config.capRate}%</span>
              </div>
              <input 
                type="range" 
                min="30" 
                max="90" 
                step="1"
                value={config.capRate * 10}
                onChange={(e) => handleSliderChange("capRate", parseFloat(e.target.value) / 10)}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="block text-[9px] text-slate-400">이율이 낮을수록 미래 현금의 현재 자산 가치는 승수 증폭됩니다.</span>
            </div>

            {/* Vacancy Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">상시 공실률 목표</span>
                <span className="font-mono font-bold text-slate-800">{config.vacancyRate}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="250" 
                step="5"
                value={config.vacancyRate * 10}
                onChange={(e) => handleSliderChange("vacancyRate", parseFloat(e.target.value) / 10)}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="block text-[9px] text-slate-400">공실 관리는 수익 가격 계산에 직접 반영됩니다.</span>
            </div>

            {/* OpEx Ratio */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">관리운영비 비율 (OpEx)</span>
                <span className="font-mono font-bold text-slate-800">{config.operatingExpenses}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="40" 
                value={config.operatingExpenses}
                onChange={(e) => handleSliderChange("operatingExpenses", parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Public Land Price Base */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">㎡당 토지 공시지가</span>
                <span className="font-mono font-bold text-slate-800">{config.landUnitCostPerSqm.toLocaleString()} 만원</span>
              </div>
              <input 
                type="range" 
                min="200" 
                max="6000" 
                step="50"
                value={config.landUnitCostPerSqm}
                onChange={(e) => handleSliderChange("landUnitCostPerSqm", parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Graphic Valuation Blend */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 border-b border-slate-200/60 pb-2 mb-3.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              자산 평가액 다자비교 시각화 및 가치 합치 (Blended)
            </h4>

            {/* Evaluated Columns Mini Chart */}
            <div className="flex h-24 items-end gap-6 px-4">
              {/* 수익환원 */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-[10px] font-bold text-emerald-700 mb-1 font-mono">{incomeCapitalizationValue.value.toFixed(0)}억</div>
                <div 
                  className="bg-emerald-500 w-full rounded-t-md transition-all duration-300 hover:bg-emerald-600 cursor-pointer"
                  style={{ height: `${(incomeCapitalizationValue.value / maxVal) * 80}px` }}
                ></div>
                <span className="text-[10px] text-slate-500 mt-1">수익형</span>
              </div>

              {/* 거래비교 */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-[10px] font-bold text-sky-700 mb-1 font-mono">{salesComparisonValue.value.toFixed(0)}억</div>
                <div 
                  className="bg-sky-500 w-full rounded-t-md transition-all duration-300 hover:bg-sky-600 cursor-pointer"
                  style={{ height: `${(salesComparisonValue.value / maxVal) * 80}px` }}
                ></div>
                <span className="text-[10px] text-slate-500 mt-1">시장형</span>
              </div>

              {/* 원가법 */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-[10px] font-bold text-amber-700 mb-1 font-mono">{costApproachValue.value.toFixed(0)}억</div>
                <div 
                  className="bg-amber-500 w-full rounded-t-md transition-all duration-300 hover:bg-amber-600 cursor-pointer"
                  style={{ height: `${(costApproachValue.value / maxVal) * 80}px` }}
                ></div>
                <span className="text-[10px] text-slate-500 mt-1">조달형</span>
              </div>
            </div>
          </div>

          {/* Unified Assessment Balance result */}
          <div className="border-t border-slate-200 pt-4 mt-4 flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">복합 산정 최종 통합 감정액 (조산평균)</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[22px] font-mono font-extrabold text-indigo-700">약 {blendedValue.toFixed(1)}</span>
                <span className="text-xs font-bold text-indigo-600">억 원</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 max-w-[180px] leading-relaxed text-right">
              *자산 연면적 <strong>{building.grossAreaSqm.toLocaleString()}㎡</strong> <br />
              평당 자산 가치: <strong>~{(blendedValue * 10000 / sqmMetersToPyeong(building.grossAreaSqm)).toFixed(0).toLocaleString()}</strong> 만원
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
