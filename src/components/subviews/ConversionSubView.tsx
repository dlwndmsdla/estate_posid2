/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Table as TableIcon,
  Building2,
} from "lucide-react";
import {
  DatasetMetadata,
  RawListing,
  RegionalConvertedListing,
  EfficiencyRateTable,
  HallComparisonRow,
} from "../../types/dataset";
import { datasetRepository, listingRepository } from "../../db/repository";
import {
  buildEfficiencyRateTable,
  buildRegionalConvertedListings,
  calculateHallComparison,
  exportEfficiencyComparisonWorkbook,
} from "../../services/rentalCalculationEngine";

export function ConversionSubView() {
  const [activeTab, setActiveTab] = useState<"rsquare-rates" | "converted-listings">("rsquare-rates");
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [rawListings, setRawListings] = useState<RawListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters for Tab 2
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadDatasetData();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      loadListings(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const loadDatasetData = async () => {
    setIsLoading(true);
    try {
      const dsList = await datasetRepository.listDatasets();
      setDatasets(dsList);
      if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].datasetId);
      }
    } catch (e) {
      console.error("Dataset load error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadListings = async (dsId: string) => {
    setIsLoading(true);
    try {
      const raws = await listingRepository.getRawListings(dsId);
      setRawListings(raws);
    } catch (e) {
      console.error("Listings load error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDataset = useMemo(() => {
    return datasets.find((d) => d.datasetId === selectedDatasetId);
  }, [datasets, selectedDatasetId]);

  // Compute Efficiency Rate Table
  const efficiencyTable: EfficiencyRateTable = useMemo(() => {
    return buildEfficiencyRateTable(rawListings, selectedDatasetId || "CURRENT");
  }, [rawListings, selectedDatasetId]);

  // Compute Converted Listings
  const convertedListings: RegionalConvertedListing[] = useMemo(() => {
    return buildRegionalConvertedListings(rawListings, efficiencyTable);
  }, [rawListings, efficiencyTable]);

  // Compute Hall Comparison
  const hallComparisonRows: HallComparisonRow[] = useMemo(() => {
    return calculateHallComparison(efficiencyTable, convertedListings);
  }, [efficiencyTable, convertedListings]);

  // Filter options
  const regions = useMemo(() => {
    const set = new Set<string>();
    convertedListings.forEach((c) => set.add(c.region));
    return Array.from(set);
  }, [convertedListings]);

  const zones = useMemo(() => {
    const set = new Set<string>();
    convertedListings.forEach((c) => {
      if (selectedRegion === "all" || c.region === selectedRegion) {
        set.add(c.zone);
      }
    });
    return Array.from(set);
  }, [convertedListings, selectedRegion]);

  // Filtered converted listings
  const filteredConvertedListings = useMemo(() => {
    return convertedListings.filter((c) => {
      if (selectedSource !== "all" && c.source !== selectedSource) return false;
      if (selectedRegion !== "all" && c.region !== selectedRegion) return false;
      if (selectedZone !== "all" && c.zone !== selectedZone) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = c.listingId.toLowerCase().includes(q);
        const matchBld = (c.buildingName || "").toLowerCase().includes(q);
        const matchAddr = (c.roadAddress || "").toLowerCase().includes(q);
        if (!matchId && !matchBld && !matchAddr) return false;
      }
      return true;
    });
  }, [convertedListings, selectedSource, selectedRegion, selectedZone, searchQuery]);

  // Export Excel workbook handler
  const handleExportWorkbook = () => {
    const year = selectedDataset?.referenceYear || 2026;
    const quarter = selectedDataset?.referenceQuarter || 2;
    const version = selectedDataset?.version || 1;
    exportEfficiencyComparisonWorkbook(
      hallComparisonRows,
      efficiencyTable,
      convertedListings,
      year,
      quarter,
      version
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              RSQUARE EFFICIENCY RATE & CONTRACT RENT CONVERSION ENGINE
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 mt-1">
              전용률 산출 및 계약면적환산 임대가격 산정
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              알스퀘어 전용률표를 기반으로 네모 및 알스퀘어 전체 매물의 전용단가를 계약단가로 자동 환산합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dataset Selector */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs">
              <span className="font-bold text-slate-600 pl-2">분기 데이터셋:</span>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {datasets.map((d) => (
                  <option key={d.datasetId} value={d.datasetId}>
                    {d.referenceYear}년 {d.referenceQuarter}분기 (V{d.version}) [{d.datasetId}]
                  </option>
                ))}
              </select>
            </div>

            {/* Excel Download Button */}
            <button
              onClick={handleExportWorkbook}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>전용률·계약환산 엑셀 다운로드</span>
            </button>
          </div>
        </div>

        {/* Status Notice Banner */}
        {efficiencyTable.isInitialDefaultUsed ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">초기 전용률 기준 적용 중: </span>
              {efficiencyTable.versionNotice ||
                "업로드 파일에 알스퀘어 계약면적이 없어 저장된 초기 전용률 기준을 적용했습니다."}
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-indigo-900">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">업로드 알스퀘어 데이터 기반 실시간 계산 완료: </span>
              총 {rawListings.filter((r) => r.source === "알스퀘어").length}건의 알스퀘어 매물 중 전용률
              산출 조건(20%~95% 범위 내)을 충족하는 표본을 바탕으로 신규 전용률표가 수립되었습니다.
            </div>
          </div>
        )}

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 text-sm font-bold pt-2">
          <button
            onClick={() => setActiveTab("rsquare-rates")}
            className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "rsquare-rates"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. 알스퀘어 전용률표</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-mono">
              {efficiencyTable.rows.length}개 항목
            </span>
          </button>

          <button
            onClick={() => setActiveTab("converted-listings")}
            className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "converted-listings"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>2. 전체 지역매물 계약환산</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono">
              {convertedListings.length}건 환산
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: 알스퀘어 전용률표 */}
      {activeTab === "rsquare-rates" && (
        <div className="space-y-6">
          {/* Priority Hierarchy Explanation */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
              <Info className="w-4 h-4" />
              <span>전용률 적용 원칙 (Priority Hierarchy)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
                  1순위
                </span>
                <h4 className="font-bold text-white text-sm">매물 고유 전용률</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  알스퀘어 매물 중 계약면적이 존재하는 경우, 매물 고유의 전용률 (전용면적 ÷ 계약면적)을 직접
                  사용합니다.
                </p>
              </div>

              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
                  2순위
                </span>
                <h4 className="font-bold text-white text-sm">권역별 중앙값</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  네모 매물 등 계약면적이 없는 경우, 해당 권역 알스퀘어 표본 중앙값 전용률을 적용합니다 (표본 ≥
                  5건).
                </p>
              </div>

              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded font-mono">
                  3순위 (폴백)
                </span>
                <h4 className="font-bold text-white text-sm">지역별/전국 중앙값</h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  권역 표본이 5건 미만인 경우, 해당 광역 지역 중앙값 또는 전국 표준 전용률(62.0%)을 차순위 적용합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Efficiency Table Component */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                지역·권역별 전용률 통계표 (알스퀘어 데이터 기반)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                전체 중앙값: {(efficiencyTable.overallMedian * 100).toFixed(1)}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">구분</th>
                    <th className="p-3">지역</th>
                    <th className="p-3">권역</th>
                    <th className="p-3 text-right">매물수</th>
                    <th className="p-3 text-right">전용률 평균</th>
                    <th className="p-3 text-right bg-indigo-50/50 text-indigo-900 font-extrabold">
                      전용률 중앙값 (50%)
                    </th>
                    <th className="p-3 text-right">25% (Q1)</th>
                    <th className="p-3 text-right">75% (Q3)</th>
                    <th className="p-3">관련 회관</th>
                    <th className="p-3">적용 상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {efficiencyTable.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        row.categoryType === "전체"
                          ? "bg-slate-100/70 font-bold"
                          : row.categoryType === "지역"
                          ? "bg-slate-50/50 font-semibold"
                          : ""
                      }`}
                    >
                      <td className="p-3 font-sans font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            row.categoryType === "전체"
                              ? "bg-slate-800 text-white"
                              : row.categoryType === "지역"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {row.categoryType}
                        </span>
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-800">{row.region}</td>
                      <td className="p-3 font-sans text-slate-700">{row.zone}</td>
                      <td className="p-3 text-right text-slate-600">{row.sampleCount}건</td>
                      <td className="p-3 text-right text-slate-600">
                        {(row.efficiencyMean * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right font-extrabold text-indigo-700 bg-indigo-50/30 text-sm">
                        {(row.efficiencyMedian * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        {(row.quantile25 * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        {(row.quantile75 * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 font-sans">
                        {row.associatedHall && row.associatedHall !== "-" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <Building2 className="w-3 h-3" />
                            {row.associatedHall}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3 font-sans">
                        {row.isFallbackUsed ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium text-[11px] inline-block">
                            ⚠️ {row.fallbackReason || "지역값 적용 (폴백)"}
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium text-[11px] inline-block">
                            ✓ 정상 적용
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hall Comparison Summary Box */}
          <div id="hall-comparison-summary-box" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 id="hall-comparison-summary-title" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                우체국보험회관 4개소 계약단가 환산 비교 (실거래가 vs 전용단가 환산)
              </h3>
              <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                ※ 환산산식 = 매물호가 전용단가 중앙값 × 적용 전용률
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">회관명</th>
                    <th className="p-2.5">권역</th>
                    <th className="p-2.5 text-right">실거래가 (원/㎡)</th>
                    <th className="p-2.5 text-right">전용단가 (원/㎡)</th>
                    <th className="p-2.5 text-right">전체전용률 (62%)</th>
                    <th className="p-2.5 text-right">지역전용률 적용</th>
                    <th className="p-2.5 text-right bg-indigo-50/70 text-indigo-900">권역전용률 적용</th>
                    <th className="p-2.5 text-right bg-slate-200/50 text-slate-900">
                      지역 매물호가 중앙값
                      <span className="block text-[10px] font-normal text-slate-500">(전용호가 × 지역전용률)</span>
                    </th>
                    <th className="p-2.5 text-right bg-indigo-100/70 text-indigo-950 font-extrabold">
                      권역 매물호가 중앙값
                      <span className="block text-[10px] font-normal text-indigo-700">(전용호가 × 권역전용률)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {hallComparisonRows.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-sans font-bold text-slate-800">{h.hallName}</td>
                      <td className="p-2.5 font-sans text-slate-600">{h.zone}</td>
                      <td className="p-2.5 text-right font-medium text-slate-700">
                        {h.realTransactionRentWon.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right text-slate-700">
                        {h.exclusiveRentWon.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right text-slate-600">
                        {h.contractRentByOverallWon.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right text-slate-600">
                        {h.contractRentByRegionWon.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-indigo-700 bg-indigo-50/40">
                        {h.contractRentByZoneWon.toLocaleString()}
                      </td>

                      {/* 지역 매물호가 중앙값 및 산식 */}
                      <td className="p-2.5 text-right bg-slate-50/50">
                        <div className="font-bold text-slate-800 text-sm">
                          {h.regionListingsMedianRentWon.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">원</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {h.regionExclMedianRentWon.toLocaleString()}원 × {(h.regionAppliedRate * 100).toFixed(1)}%
                        </div>
                      </td>

                      {/* 권역 매물호가 중앙값 및 산식 (폴백 표기 포함) */}
                      <td className="p-2.5 text-right bg-indigo-50/30">
                        <div className="font-extrabold text-indigo-900 text-sm">
                          {h.zoneListingsMedianRentWon.toLocaleString()} <span className="text-[11px] font-normal text-indigo-700">원</span>
                        </div>
                        <div className="text-[10px] text-indigo-800/80 font-mono mt-0.5 flex items-center justify-end gap-1">
                          <span>{h.zoneExclMedianRentWon.toLocaleString()}원 × {(h.zoneAppliedRate * 100).toFixed(1)}%</span>
                          {h.isZoneFallback && (
                            <span className="text-[9px] text-amber-700 bg-amber-100 font-sans px-1 rounded font-bold" title="매물 수 부족(5건 미만)으로 지역 전용률 적용">
                              (지역폴백)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 전체 지역매물 계약환산 */}
      {activeTab === "converted-listings" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>필터 검색:</span>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">출처:</span>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">전체 (알스퀘어 + 네모)</option>
                <option value="알스퀘어">알스퀘어</option>
                <option value="네모">네모</option>
              </select>
            </div>

            {/* Region Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">지역:</span>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedZone("all");
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">전체 지역</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">권역:</span>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">전체 권역</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="매물ID, 건물명, 주소 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <div className="text-slate-500 font-mono ml-auto">
              조회 결과: <strong className="text-indigo-700">{filteredConvertedListings.length}</strong> /{" "}
              {convertedListings.length}건
            </div>
          </div>

          {/* Standard 9 Columns Regional Converted Listings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  전체 지역매물 계약단가 자동 환산 결과표 (표준 9개 열)
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                알스퀘어 지역/권역 전용률을 적용하여 네모 및 알스퀘어 호가를 계약면적 기준 단가로 통합 환산
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">1. 출처</th>
                    <th className="p-3">2. 매물번호</th>
                    <th className="p-3">3. 지역</th>
                    <th className="p-3">4. 권역</th>
                    <th className="p-3 text-right">5. 면적당임대료(전용 원/㎡)</th>
                    <th className="p-3 text-right">6. 지역별전용률</th>
                    <th className="p-3 text-right">7. 권역별전용률</th>
                    <th className="p-3 text-right">8. 지역전용률 곱한 값(계약 원/㎡)</th>
                    <th className="p-3 text-right">9. 권역전용률 곱한 값(계약 원/㎡)</th>
                    <th className="p-3 text-right bg-indigo-100/70 text-indigo-900 font-extrabold">
                      10. 실제 적용값(계약 원/㎡)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredConvertedListings.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400 font-sans">
                        검색 조건에 해당되는 환산 매물 데이터가 존재하지 않습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredConvertedListings.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                        <td className="p-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              c.source === "알스퀘어"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {c.source}
                          </span>
                        </td>
                        <td className="p-3 text-slate-800 font-bold">{c.listingId}</td>
                        <td className="p-3 font-sans font-medium text-slate-800">{c.region}</td>
                        <td className="p-3 font-sans text-slate-600">
                          {c.zone}
                          {c.zoneRateFallbackUsed && (
                            <span
                              className="ml-1 text-[10px] text-amber-600 font-sans cursor-help"
                              title={c.zoneRateFallbackReason}
                            >
                              (폴백)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-slate-700">
                          {c.rentPerExclusiveSqmWon.toLocaleString()} 원
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {(c.regionEfficiencyRate * 100).toFixed(1)}%
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {(c.zoneEfficiencyRate * 100).toFixed(1)}%
                        </td>
                        <td className="p-3 text-right text-slate-700 font-medium">
                          {c.rentPerContractSqmByRegionWon.toLocaleString()} 원
                        </td>
                        <td className="p-3 text-right text-slate-700 font-medium">
                          {c.rentPerContractSqmByZoneWon.toLocaleString()} 원
                        </td>
                        <td className="p-3 text-right font-extrabold text-indigo-700 bg-indigo-50/40 text-sm">
                          {c.rentPerContractSqmAppliedWon.toLocaleString()} 원
                          <span
                            className="block text-[10px] font-sans font-medium text-slate-500"
                            title={`적용 전용률 ${(c.appliedEfficiencyRate * 100).toFixed(1)}%`}
                          >
                            {c.appliedRateSource} {(c.appliedEfficiencyRate * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
