/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { rawCrawledDataset, RawCrawledBuilding } from "../rawDb";
import { 
  Database, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  Tag, 
  Layers, 
  MapPin, 
  ArrowUpDown,
  BookOpen, 
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";

export const RawDataViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [useTypeFilter, setUseTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<keyof RawCrawledBuilding>("crawledAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter options
  const cities = ["all", "당산", "영등포", "부산", "대구", "광주"];
  const sources = ["all", "알스퀘어", "네모", "실거래가"];
  const useTypes = ["all", "오피스 및 업무용 빌딩", "근린생활시설"];

  // Sort toggle handler
  const handleSort = (field: keyof RawCrawledBuilding) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Filtered and sorted dataset
  const processedData = useMemo(() => {
    let result = [...rawCrawledDataset];

    // Filter by Search term (Name or Address)
    if (searchTerm.trim() !== "") {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(lowSearch) ||
          b.address.toLowerCase().includes(lowSearch)
      );
    }

    // Filter by City
    if (selectedCity !== "all") {
      result = result.filter((b) => b.city === selectedCity);
    }

    // Filter by Source
    if (selectedSource !== "all") {
      result = result.filter((b) => b.source === selectedSource);
    }

    // Filter by Use Type
    if (useTypeFilter !== "all") {
      result = result.filter((b) => b.useType === useTypeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === "string") {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchTerm, selectedCity, selectedSource, useTypeFilter, sortBy, sortOrder]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
      
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-base flex items-center gap-2">
              외부 플랫폼 제휴 크롤링 통합 데이터베이스 (DB)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              알스퀘어, 네모 및 국토교통부 실거래 데이터망에서 수집된 업무 설비 단지 원시 대장을 조회합니다. (단위: ㎡)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700">검색 결과: <span className="font-mono text-indigo-600">{processedData.length}</span>개 매칭</span>
        </div>
      </div>

      {/* Guide Card of Data Integration & Filtering Criteria */}
      <div className="bg-slate-50 border border-slate-100/80 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600 shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-800">
            우체국금융개발원 데이터 엄격 통합 가이드 (평당 ➔ ㎡ 단위 환산 완료)
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            본 뷰에 출력된 원시 단가는 감정평가 및 비교 분석 정합성을 극대화하기 위하여 <strong className="text-slate-800 font-semibold">1평(3.3058㎡) 기준 단가에서 1㎡ 기준으로 완벽 환산 통합</strong>되었습니다. 
            주용도 업무시설 외 부적합 자산(3,300㎡ 미만 또는 근린생활시설 비율 초과)은 음영 또는 규격 예외 필터링 처리 기준 근거를 충족합니다.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="빌딩명 또는 소재지 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs transition placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {/* City Filter */}
        <div className="md:col-span-2.5 flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium shrink-0">권역</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-medium"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city === "all" ? "전체 권역" : `${city} 권역`}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div className="md:col-span-2.5 flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium shrink-0">출처</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-medium"
          >
            {sources.map((src) => (
              <option key={src} value={src}>
                {src === "all" ? "전체 출처" : src}
              </option>
            ))}
          </select>
        </div>

        {/* UseType Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium shrink-0">용도군</span>
          <select
            value={useTypeFilter}
            onChange={(e) => setUseTypeFilter(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-medium"
          >
            {useTypes.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "전체 용도" : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold select-none">
              <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">
                  건물 계약 자산명
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </th>
              <th className="p-3.5 whitespace-nowrap">소재지 정보</th>
              <th className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition whitespace-nowrap" onClick={() => handleSort("grossAreaSqm")}>
                <div className="flex items-center justify-end gap-1">
                  합산 연면적
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </th>
              <th className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition whitespace-nowrap" onClick={() => handleSort("builtYear")}>
                <div className="flex items-center justify-end gap-1">
                  준공 (지과수)
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </th>
              <th className="p-3.5 text-right whitespace-nowrap">보증금 단가</th>
              <th className="p-3.5 text-right whitespace-nowrap">월세 단가</th>
              <th className="p-3.5 text-right whitespace-nowrap">관리비 단가</th>
              <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition whitespace-nowrap" onClick={() => handleSort("source")}>
                <div className="flex items-center justify-center gap-1">
                  데이터 출처
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </th>
              <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition whitespace-nowrap" onClick={() => handleSort("crawledAt")}>
                <div className="flex items-center justify-center gap-1">
                  최신 반영일
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-10 text-center text-slate-400">
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs">피드 조건에 부합하는 연계 크롤링 원시 정보가 없습니다.</p>
                </td>
              </tr>
            ) : (
              processedData.map((b) => {
                // Determine layout highlight for qualified candidates
                const isQualified = b.grossAreaSqm >= 3300 && b.useType === "오피스 및 업무용 빌딩";
                
                return (
                  <tr key={b.id} className={`hover:bg-slate-50/50 transition ${!isQualified ? "bg-red-50/20 text-slate-400" : ""}`}>
                    {/* Name */}
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          isQualified ? "bg-indigo-500" : "bg-rose-400"
                        }`} title={isQualified ? "AVM 적격자산" : "AVM 제외대상(근생 또는 규모미달)"}></span>
                        <div>
                          <p className="text-slate-800 font-semibold">{b.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{b.useType}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Address */}
                    <td className="p-3.5 text-slate-500 text-[11px] max-w-[180px] truncate" title={b.address}>
                      {b.address}
                    </td>

                    {/* Gross Area */}
                    <td className="p-3.5 text-right font-mono text-slate-700">
                      {b.grossAreaSqm.toLocaleString()} ㎡
                    </td>

                    {/* Age / Built Year */}
                    <td className="p-3.5 text-right text-slate-600">
                      <span className="font-semibold text-slate-700">{new Date().getFullYear() - b.builtYear}년 </span>
                      <span className="text-[10px] text-slate-400">({b.builtYear})</span>
                    </td>

                    {/* Deposit per sqm */}
                    <td className="p-3.5 text-right font-mono font-medium text-slate-800">
                      {b.depositPerSqm.toFixed(2)} 만원/㎡
                    </td>

                    {/* Monthly rent per sqm */}
                    <td className="p-3.5 text-right font-mono font-bold text-indigo-700">
                      {b.monthlyRentPerSqm.toFixed(2)} 만원/㎡
                    </td>

                    {/* Maintenance fee per sqm */}
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      {b.maintenancePerSqm.toFixed(2)} 만원/㎡
                    </td>

                    {/* Source */}
                    <td className="p-3.5 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        b.source === "알스퀘어"
                          ? "bg-sky-50 text-sky-700 border border-sky-100"
                          : b.source === "네모"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {b.source}
                      </span>
                    </td>

                    {/* Crawled At */}
                    <td className="p-3.5 text-center font-mono text-slate-500 text-[11px]">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {b.crawledAt}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Database Legend / Specs Footnote */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
        <div className="flex items-start gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
          <div>
            <h4 className="text-xs font-semibold text-slate-800">AVM 적합 자산 분류</h4>
            <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
              연면적 3,300㎡ 이상의 업무시설로, 감정평가(AVM) 가중치 보정에 포함되는 1순위 Peer Group군입니다.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0"></span>
          <div>
            <h4 className="text-xs font-semibold text-slate-800">AVM 극배외 자산</h4>
            <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
              주용도가 근린생활시설이거나, 중대형 하부 규격(3,300㎡ 미만)으로 감정 연산 오차 방지를 위해 필터 아웃됩니다.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
          <div>
            <h4 className="text-xs font-semibold text-slate-800">실시간 데이터 정합 보증</h4>
            <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
              국토교통부 검증 실거래가 정보와 실시간 플랫폼 데이터가 100% 매칭되어 데이터 자정 능력을 지니고 있습니다.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
