/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { CleanedListing, DatasetMetadata } from "../types/dataset";
import {
  listingRepository,
  datasetRepository,
  valuationRepository,
} from "../db/repository";
import {
  calculateBuildingMedians,
  calculateDatasetValuations,
} from "../services/calculationEngine";
import {
  CheckSquare,
  Search,
  Filter,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building,
  MapPin,
  RefreshCw,
  Layers,
} from "lucide-react";

interface DataValidationViewProps {
  selectedDatasetId: string;
  onCalculationExecuted: (datasetId: string) => void;
}

export function DataValidationView({
  selectedDatasetId,
  onCalculationExecuted,
}: DataValidationViewProps) {
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [cleanedListings, setCleanedListings] = useState<CleanedListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "valid"
    | "invalid"
    | "warning"
    | "EXCLUSIVE_AREA_LE_ZERO"
    | "CONTRACT_AREA_LE_ZERO"
    | "GROSS_FLOOR_AREA_MISSING"
    | "EXCLUSIVE_GREATER_THAN_CONTRACT"
  >("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [selectedDatasetId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const ds = await datasetRepository.getDataset(selectedDatasetId);
      setDataset(ds);
      const listings = await listingRepository.getCleanedListings(selectedDatasetId);
      setCleanedListings(listings);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteCalculation = async () => {
    if (!dataset || cleanedListings.length === 0) return;
    setIsCalculating(true);

    try {
      // 1. Calculate building medians
      const medians = calculateBuildingMedians(selectedDatasetId, cleanedListings);
      await listingRepository.saveBuildingMedians(selectedDatasetId, medians);

      // 2. Calculate valuations & calibration factors
      const calcs = calculateDatasetValuations(selectedDatasetId, medians);
      await valuationRepository.saveCalculationResults(calcs);

      // 3. Update status to 'calculated'
      await datasetRepository.updateDatasetStatus(selectedDatasetId, "calculated");

      alert(`[${selectedDatasetId}] 건물별 중앙값 및 보정계수 산정이 완료되었습니다!`);
      onCalculationExecuted(selectedDatasetId);
    } catch (err: any) {
      alert(`산정 실행 중 오류 발생: ${err?.message || err}`);
    } finally {
      setIsCalculating(false);
    }
  };

  // Metrics computation
  const totalCount = cleanedListings.length;
  const validCount = cleanedListings.filter((l) => l.validation.isValid).length;
  const invalidCount = totalCount - validCount;
  const warningCount = cleanedListings.filter((l) => l.validation.warningCodes.length > 0).length;

  const validForContractConversionCount = cleanedListings.filter(
    (l) => l.eligibility?.validForContractConversion
  ).length;
  const validForRegionalBaseRentCount = cleanedListings.filter(
    (l) => l.eligibility?.validForRegionalBaseRent
  ).length;
  const sizeAdjustmentExcludedCount = cleanedListings.filter(
    (l) => !l.eligibility?.validForSizeAdjustment
  ).length;
  const efficiencyRateSampleExcludedCount = cleanedListings.filter(
    (l) => !l.eligibility?.validForEfficiencyRateSample
  ).length;

  // Specific Error/Warning Counts
  const exAreaErrorCount = cleanedListings.filter((l) =>
    l.validation.errorCodes.includes("EXCLUSIVE_AREA_LE_ZERO")
  ).length;
  const contractAreaErrorCount = cleanedListings.filter((l) =>
    l.validation.warningCodes.includes("CONTRACT_AREA_LE_ZERO")
  ).length;
  const grossAreaMissingCount = cleanedListings.filter((l) =>
    l.validation.warningCodes.includes("GROSS_FLOOR_AREA_MISSING")
  ).length;
  const exclusiveGreaterCount = cleanedListings.filter((l) =>
    l.validation.warningCodes.includes("EXCLUSIVE_GREATER_THAN_CONTRACT")
  ).length;

  // Filter listings
  const filteredListings = cleanedListings.filter((item) => {
    if (statusFilter === "valid" && !item.validation.isValid) return false;
    if (statusFilter === "invalid" && item.validation.isValid) return false;
    if (statusFilter === "warning" && item.validation.warningCodes.length === 0) return false;
    if (
      statusFilter === "EXCLUSIVE_AREA_LE_ZERO" &&
      !item.validation.errorCodes.includes("EXCLUSIVE_AREA_LE_ZERO")
    )
      return false;
    if (
      statusFilter === "CONTRACT_AREA_LE_ZERO" &&
      !item.validation.warningCodes.includes("CONTRACT_AREA_LE_ZERO")
    )
      return false;
    if (
      statusFilter === "GROSS_FLOOR_AREA_MISSING" &&
      !item.validation.warningCodes.includes("GROSS_FLOOR_AREA_MISSING")
    )
      return false;
    if (
      statusFilter === "EXCLUSIVE_GREATER_THAN_CONTRACT" &&
      !item.validation.warningCodes.includes("EXCLUSIVE_GREATER_THAN_CONTRACT")
    )
      return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (item.buildingName || "").toLowerCase().includes(q);
      const matchAddress = (item.address || "").toLowerCase().includes(q);
      const matchId = (item.listingId || "").toLowerCase().includes(q);
      const matchZone = (item.zone || "").toLowerCase().includes(q);
      return matchName || matchAddress || matchId || matchZone;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              DATASET: {selectedDatasetId}
            </span>
            {dataset && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                  dataset.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-800"
                    : dataset.status === "calculated"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                상태: {dataset.status.toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="text-base md:text-lg font-extrabold text-slate-800 mt-1">
            분기 반입 매물 데이터 정합성 검증 및 세부 산정가능 상태 분석
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            치명적 오류(Invalid)와 특정 단계 보정제외(Warning)를 명확히 분리하여 정상 매물의 연면적 누락으로 인한 부당한 전체 제외를 방지합니다.
          </p>
        </div>

        <button
          onClick={handleExecuteCalculation}
          disabled={isCalculating || cleanedListings.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition shrink-0"
        >
          {isCalculating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>산정 및 보정계수 계산 중...</span>
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4" />
              <span>보정계수 및 적정 임대료 산정 실행</span>
            </>
          )}
        </button>
      </div>

      {/* Re-validation Summary Grid (Requirements Item #7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">전체 매물 / Invalid</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black text-slate-800">{totalCount}건</span>
            <span className="text-xs font-bold text-rose-600">({invalidCount}건 Invalid)</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/30 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-amber-800">Warning (주의)</div>
          <div className="text-lg font-black text-amber-700 mt-1">{warningCount}건</div>
          <div className="text-[10px] text-amber-600 font-medium">연면적 누락 등 포함</div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/30 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800">계약환산 가능</div>
          <div className="text-lg font-black text-emerald-700 mt-1">{validForContractConversionCount}건</div>
          <div className="text-[10px] text-emerald-600 font-medium">전용단가 환산 유지</div>
        </div>

        <div className="bg-white border border-blue-200 bg-blue-50/30 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-blue-800">권역 기준가 산정가능</div>
          <div className="text-lg font-black text-blue-700 mt-1">{validForRegionalBaseRentCount}건</div>
          <div className="text-[10px] text-blue-600 font-medium">지역/권역 분석 포함</div>
        </div>

        <div className="bg-white border border-purple-200 bg-purple-50/30 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-purple-800">규모 보정 제외</div>
          <div className="text-lg font-black text-purple-700 mt-1">{sizeAdjustmentExcludedCount}건</div>
          <div className="text-[10px] text-purple-600 font-medium">연면적 미기재 매물</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-600">전용률 표본 제외</div>
          <div className="text-lg font-black text-slate-700 mt-1">{efficiencyRateSampleExcludedCount}건</div>
          <div className="text-[10px] text-slate-500 font-medium">네모 및 미충족 매물</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-600 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" /> 상태 구분 필터:
          </span>

          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            전체 ({totalCount})
          </button>

          <button
            onClick={() => setStatusFilter("valid")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === "valid" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            완전 정상 ({validCount})
          </button>

          <button
            onClick={() => setStatusFilter("warning")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === "warning" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Warning 주의 ({warningCount})
          </button>

          <button
            onClick={() => setStatusFilter("invalid")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === "invalid" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Invalid 오류 ({invalidCount})
          </button>
        </div>

        {/* Detailed Verification Rule Categories (Requirements Item #6) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-600 mr-1">검증 상세 유형:</span>

          <button
            onClick={() => setStatusFilter("EXCLUSIVE_AREA_LE_ZERO")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
              statusFilter === "EXCLUSIVE_AREA_LE_ZERO"
                ? "bg-rose-700 text-white border-rose-700"
                : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
            }`}
          >
            전용면적 오류 ({exAreaErrorCount})
          </button>

          <button
            onClick={() => setStatusFilter("GROSS_FLOOR_AREA_MISSING")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
              statusFilter === "GROSS_FLOOR_AREA_MISSING"
                ? "bg-amber-700 text-white border-amber-700"
                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
            }`}
          >
            연면적 누락 [Warning] ({grossAreaMissingCount})
          </button>

          <button
            onClick={() => setStatusFilter("CONTRACT_AREA_LE_ZERO")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
              statusFilter === "CONTRACT_AREA_LE_ZERO"
                ? "bg-amber-700 text-white border-amber-700"
                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
            }`}
          >
            알스퀘어 계약면적 오류 ({contractAreaErrorCount})
          </button>

          <button
            onClick={() => setStatusFilter("EXCLUSIVE_GREATER_THAN_CONTRACT")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
              statusFilter === "EXCLUSIVE_GREATER_THAN_CONTRACT"
                ? "bg-amber-700 text-white border-amber-700"
                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
            }`}
          >
            전용률 논리 오류 ({exclusiveGreaterCount})
          </button>

          {/* Search Input */}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="건물명, 주소, 매물ID 검색..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Cleaned Listings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center">No</th>
                <th className="px-3.5 py-3">1. 출처 / 매물ID</th>
                <th className="px-3.5 py-3">2. 권역 / 건물명 / 주소</th>
                <th className="px-3.5 py-3 text-center">3. 준공 / 연면적(대장)</th>
                <th className="px-3.5 py-3 text-right">4. 계약면적 / 전용면적</th>
                <th className="px-3.5 py-3 text-center">5. 적용 전용률 및 출처</th>
                <th className="px-3.5 py-3 text-right">6. 월임대료 (만원)</th>
                <th className="px-3.5 py-3 text-right">7. 계약환산 단가</th>
                <th className="px-3.5 py-3 text-center">8. 세부 단계별 산정가능 상태</th>
                <th className="px-3.5 py-3 text-center">9. 검증 결과 및 사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    데이터 로딩 중...
                  </td>
                </tr>
              ) : filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400 font-sans">
                    조건에 해당하는 매물 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredListings.slice(0, 100).map((item, idx) => {
                  const exArea = item.exclusiveAreaSqm ?? item.exclusiveArea ?? 0;
                  const contractArea = item.contractAreaSqm ?? item.leaseArea ?? 0;
                  const grossArea = item.grossFloorAreaSqm ?? item.grossArea ?? 0;
                  const isNemo = item.source === "네모";

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition ${
                        !item.validation.isValid
                          ? "bg-rose-50/20"
                          : item.validation.warningCodes.length > 0
                          ? "bg-amber-50/10"
                          : ""
                      }`}
                    >
                      <td className="px-3.5 py-3 text-center font-mono text-slate-400 font-sans">
                        {idx + 1}
                      </td>

                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            item.source === "알스퀘어"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.source}
                        </span>
                        <div className="font-mono text-[11px] text-slate-600 font-bold mt-0.5">
                          {item.listingId}
                        </div>
                      </td>

                      <td className="px-3.5 py-3">
                        <div className="text-[11px] font-bold text-indigo-600">
                          {item.region} {item.zone}
                        </div>
                        <div className="font-bold text-slate-800">{item.buildingName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {item.roadAddress || item.address}
                        </div>
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        <div className="font-mono font-bold text-slate-800">
                          {item.completionYear || item.builtYear || "-"}년
                        </div>
                        <div className="font-mono text-[11px] mt-0.5">
                          {grossArea > 0 ? (
                            <span className="text-slate-600 font-semibold">{grossArea.toLocaleString()} ㎡</span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-bold text-[10px]">
                              연면적 null
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contract & Exclusive Area */}
                      <td className="px-3.5 py-3 text-right font-mono">
                        <div className="text-slate-500 text-[11px]">
                          계약: {isNemo ? "-" : contractArea > 0 ? `${contractArea.toLocaleString()} ㎡` : "-"}
                        </div>
                        <div className="font-bold text-slate-800">
                          전용: {exArea > 0 ? `${exArea.toLocaleString()} ㎡` : "0 ㎡"}
                        </div>
                      </td>

                      {/* Efficiency Rate & Source */}
                      <td className="px-3.5 py-3 text-center font-mono">
                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                          {(item.efficiencyRate.appliedRate * 100).toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {isNemo
                            ? item.efficiencyRate.sourceName
                            : item.efficiencyRate.sourceType === "listing"
                            ? "고유 전용률"
                            : item.efficiencyRate.sourceName}
                        </div>
                      </td>

                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800">
                        {item.monthlyRent.toLocaleString()} 만원
                      </td>

                      <td className="px-3.5 py-3 text-right font-mono font-extrabold text-indigo-900 bg-indigo-50/20">
                        {item.rentPerContractArea.toLocaleString()} 원/㎡
                      </td>

                      {/* Step-by-Step Eligibility Badges (Requirements Item #4) */}
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex flex-col gap-1 items-center text-[10px] font-sans font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              item.eligibility?.validForContractConversion
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            ✓ 계약환산 가능
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              item.eligibility?.validForSizeAdjustment
                                ? "bg-purple-100 text-purple-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.eligibility?.validForSizeAdjustment
                              ? "✓ 규모보정 포함"
                              : "⚠️ 규모보정 제외"}
                          </span>
                        </div>
                      </td>

                      {/* Validation Errors & Warnings Detail (Requirements Item #6) */}
                      <td className="px-3.5 py-3 text-center">
                        {item.validation.isValid ? (
                          item.validation.warningCodes.length === 0 ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              정상
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[11px]">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Warning
                              </span>
                              <div className="text-[10px] text-amber-700 font-sans max-w-[140px] truncate">
                                {item.validation.warningCodes.join(", ")}
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold text-[11px]">
                              <XCircle className="w-3 h-3" />
                              Invalid (제외)
                            </span>
                            <div className="text-[10px] text-rose-600 font-sans max-w-[140px] truncate">
                              {item.validation.errorCodes.join(", ")}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredListings.length > 100 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-slate-500 text-xs font-medium">
            최상위 100개 항목을 표시 중입니다. (전체 {filteredListings.length}건)
          </div>
        )}
      </div>
    </div>
  );
}
