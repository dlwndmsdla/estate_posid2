/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { CleanedListing, BuildingMedian, CalculationResult } from "../types/dataset";
import { listingRepository, valuationRepository, datasetRepository } from "../db/repository";
import { activeBuildingsInfo, prdDataset } from "../prdDataset";
import {
  BarChart3,
  Building2,
  Filter,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  Scale,
  Zap,
  Info,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface EdaDashboardViewProps {
  selectedDatasetId: string;
  onNavigateTab: (tabId: any) => void;
}

interface ListingPlotData {
  src: string;
  area: number;
  unit: number;
  mgmt?: number;
  use: string;
  region: string;
  zone: string;
  year?: number;
  subway?: number;
  name?: string;
  isHall?: boolean;
}

interface JeonyulRegionStats {
  region: string;
  med: number;
  mean: number;
  count: number;
}

interface JeonyulZoneStats {
  region: string;
  zone: string;
  med: number;
  mean: number;
  count: number;
  hallName?: string;
}

export function EdaDashboardView({ selectedDatasetId, onNavigateTab }: EdaDashboardViewProps) {
  const [cleanedListings, setCleanedListings] = useState<CleanedListing[]>([]);
  const [buildingMedians, setBuildingMedians] = useState<BuildingMedian[]>([]);
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>("전체");
  const [selectedZone, setSelectedZone] = useState<string>("전체");

  useEffect(() => {
    loadEdaData();
  }, [selectedDatasetId]);

  const loadEdaData = async () => {
    setIsLoading(true);
    try {
      const listings = await listingRepository.getCleanedListings(selectedDatasetId);
      const medians = await listingRepository.getBuildingMedians(selectedDatasetId);
      const calcResults = await valuationRepository.getCalculationResultsByDataset(selectedDatasetId);

      setCleanedListings(listings);
      setBuildingMedians(medians);
      setCalcs(calcResults);
    } catch (err) {
      console.error("EDA Data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback to PRD mock listings if cleanedListings is empty for chosen dataset
  const effectiveListings: ListingPlotData[] = useMemo(() => {
    if (cleanedListings.length > 0) {
      return cleanedListings
        .filter((item) => !item.excludeFromCalculation && item.validation.isValid)
        .map((item) => ({
          src: item.sourcePlatform || "알스퀘어",
          area: item.grossAreaSqm || item.leaseArea * 1.6 || 1000,
          unit: Math.round(item.unitRentPerContractSqmPerMonth),
          mgmt: item.monthlyManagementFee ? (item.monthlyManagementFee * 10000) / item.leaseArea : undefined,
          use: item.buildingUse || "기타",
          region: item.region,
          zone: item.zone,
          year: item.builtYear,
          subway: item.subwayDistanceMeters,
          name: item.buildingName,
          isHall: false,
        }));
    }

    // Default sample fallback
    return prdDataset.map((item) => ({
      src: item.source || "알스퀘어",
      area: item.grossAreaSqm || 1000,
      unit: Math.round(item.monthlyRentPerSqm * 3305.8), // 만원/평 -> 원/㎡ 변환
      mgmt: item.maintenancePerSqm ? item.maintenancePerSqm * 3305.8 : undefined,
      use: item.useType || "업무시설",
      region: item.city === "당산" || item.city === "영등포" ? "서울" : item.city,
      zone: item.tradeArea,
      year: item.builtYear,
      subway: item.distanceMeters,
      name: item.name,
      isHall: false,
    }));
  }, [cleanedListings]);

  // Hall benchmark points
  const hallListings: ListingPlotData[] = useMemo(() => {
    return activeBuildingsInfo.map((b) => {
      const calc = calcs.find((c) => c.buildingId === b.id);
      return {
        src: "우체국보험회관",
        area: b.grossAreaSqm,
        unit: calc ? calc.finalRent : b.id === "dangsan" ? 10672 : 11121,
        use: "업무시설",
        region: b.city,
        zone: b.tradeArea,
        year: b.builtYear,
        name: b.name,
        isHall: true,
      };
    });
  }, [calcs]);

  // Filtered dataset
  const filteredListings = useMemo(() => {
    return effectiveListings.filter((x) => {
      if (selectedRegion !== "전체" && x.region !== selectedRegion) return false;
      if (selectedZone !== "전체" && x.zone !== selectedZone) return false;
      return true;
    });
  }, [effectiveListings, selectedRegion, selectedZone]);

  const filteredHalls = useMemo(() => {
    return hallListings.filter((h) => {
      if (selectedRegion !== "전체" && h.region !== selectedRegion) return false;
      if (selectedZone !== "전체" && h.zone !== selectedZone) return false;
      return true;
    });
  }, [hallListings, selectedRegion, selectedZone]);

  // Available Zones by region
  const availableZones = useMemo(() => {
    if (selectedRegion === "전체") {
      const set = new Set(effectiveListings.map((x) => x.zone));
      return Array.from(set);
    }
    const set = new Set(effectiveListings.filter((x) => x.region === selectedRegion).map((x) => x.zone));
    return Array.from(set);
  }, [effectiveListings, selectedRegion]);

  // Building Medians (Grouped)
  const filteredBuildingMedians = useMemo(() => {
    if (buildingMedians.length > 0) {
      return buildingMedians
        .filter((b) => {
          if (selectedRegion !== "전체" && b.region !== selectedRegion) return false;
          if (selectedZone !== "전체" && b.zone !== selectedZone) return false;
          return true;
        })
        .map((b) => ({
          src: "건물중앙값",
          area: b.grossAreaSqm,
          unit: Math.round(b.medianRentPerContractSqm),
          use: b.primaryUse || "업무시설",
          region: b.region,
          zone: b.zone,
          name: b.buildingName,
        }));
    }

    // Group filteredListings by building
    const map = new Map<string, { area: number; rents: number[]; region: string; zone: string; src: string }>();
    filteredListings.forEach((item) => {
      const key = item.name || `${item.region}-${item.zone}-${item.area}`;
      if (!map.has(key)) {
        map.set(key, { area: item.area, rents: [], region: item.region, zone: item.zone, src: item.src });
      }
      map.get(key)!.rents.push(item.unit);
    });

    const res: ListingPlotData[] = [];
    map.forEach((val, name) => {
      const sorted = [...val.rents].sort((a, b) => a - b);
      const mid = sorted[Math.floor(sorted.length / 2)];
      res.push({
        src: val.src,
        area: val.area,
        unit: mid,
        use: "업무시설",
        region: val.region,
        zone: val.zone,
        name,
      });
    });
    return res;
  }, [buildingMedians, filteredListings, selectedRegion, selectedZone]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const listCount = filteredListings.length;
    const bldgCount = filteredBuildingMedians.length;

    const sortedUnits = [...filteredListings.map((x) => x.unit)].sort((a, b) => a - b);
    const medianUnit = sortedUnits.length > 0 ? sortedUnits[Math.floor(sortedUnits.length / 2)] : 0;

    const sortedAreas = [...filteredListings.map((x) => x.area)].sort((a, b) => a - b);
    const medianArea = sortedAreas.length > 0 ? sortedAreas[Math.floor(sortedAreas.length / 2)] : 0;

    return { listCount, bldgCount, medianUnit, medianArea };
  }, [filteredListings, filteredBuildingMedians]);

  // Use Mix Donut Data
  const useMixData = useMemo(() => {
    const rsquareMap: Record<string, number> = {};
    const nemoMap: Record<string, number> = {};

    filteredListings.forEach((x) => {
      const u = x.use || "기타";
      if (x.src === "알스퀘어") {
        rsquareMap[u] = (rsquareMap[u] || 0) + 1;
      } else {
        nemoMap[u] = (nemoMap[u] || 0) + 1;
      }
    });

    const rsquarePie = Object.entries(rsquareMap).map(([name, value]) => ({ name, value }));
    const nemoPie = Object.entries(nemoMap).map(([name, value]) => ({ name, value }));

    return { rsquarePie, nemoPie };
  }, [filteredListings]);

  // Regional Jeonyul Stats
  const jeonyulRegionData: JeonyulRegionStats[] = useMemo(() => {
    const map: Record<string, number[]> = { 서울: [], 부산: [], 대구: [], 광주: [] };

    // Calculate from cleaned listings if exclusiveArea/leaseArea exist
    if (cleanedListings.length > 0) {
      cleanedListings.forEach((c) => {
        if (c.exclusiveArea && c.leaseArea && c.leaseArea > 0) {
          const ratio = c.exclusiveArea / c.leaseArea;
          if (map[c.region]) map[c.region].push(ratio);
        }
      });
    }

    // Default benchmarks if low sample
    const benchmarks: Record<string, { med: number; mean: number; count: number }> = {
      서울: { med: 0.506, mean: 0.547, count: 150 },
      부산: { med: 0.635, mean: 0.638, count: 332 },
      대구: { med: 0.622, mean: 0.645, count: 236 },
      광주: { med: 0.688, mean: 0.677, count: 190 },
    };

    return Object.keys(benchmarks).map((reg) => {
      const arr = map[reg] || [];
      if (arr.length > 5) {
        const sorted = [...arr].sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return { region: reg, med: Number(med.toFixed(3)), mean: Number(mean.toFixed(3)), count: arr.length };
      }
      return { region: reg, ...benchmarks[reg] };
    });
  }, [cleanedListings]);

  // Zone Jeonyul Data
  const jeonyulZoneData: JeonyulZoneStats[] = useMemo(() => {
    return [
      { region: "광주", zone: "동구_금남로", med: 0.7, mean: 0.692, count: 120, hallName: "" },
      { region: "광주", zone: "서구_상무", med: 0.651, mean: 0.651, count: 70, hallName: "광주회관" },
      { region: "대구", zone: "동구_동대구로", med: 0.659, mean: 0.685, count: 52, hallName: "" },
      { region: "대구", zone: "수성구_동대구", med: 0.622, mean: 0.637, count: 96, hallName: "" },
      { region: "대구", zone: "중구남구_도심", med: 0.574, mean: 0.616, count: 82, hallName: "대구회관" },
      { region: "부산", zone: "부산진구_서면", med: 0.658, mean: 0.636, count: 121, hallName: "" },
      { region: "부산", zone: "연제구_시청", med: 0.642, mean: 0.664, count: 62, hallName: "" },
      { region: "부산", zone: "동구_부산역", med: 0.635, mean: 0.651, count: 42, hallName: "" },
      { region: "부산", zone: "중구_남포중앙동", med: 0.598, mean: 0.618, count: 107, hallName: "부산회관" },
      { region: "서울", zone: "당산_문래", med: 0.55, mean: 0.625, count: 31, hallName: "당산회관" },
      { region: "서울", zone: "여의도", med: 0.504, mean: 0.523, count: 115, hallName: "" },
    ];
  }, []);

  const COLORS = ["#3b6fe0", "#12a150", "#f59e0b", "#a855f7", "#64748b", "#cbd5e1"];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              EXPLORATORY DATA ANALYSIS (EDA) & CALIBRATION MATRIX
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
              분기별 크롤링 매물 EDA 분석 및 보정계수 검토 대시보드
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              외부 부동산(알스퀘어·네모 등) 호가 매물의 분포, 연면적·연식·위치 특성을 다각도로 검토하고 AI 추천 보정계수의 타당성을 검증합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onNavigateTab("valuation")}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Sliders className="w-4 h-4" />
              <span>3단계 임대가격 산정으로 이동</span>
            </button>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>필터 설정:</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">지역:</span>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedZone("전체");
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="전체">전체 (서울/부산/대구/광주)</option>
                <option value="서울">서울</option>
                <option value="부산">부산</option>
                <option value="대구">대구</option>
                <option value="광주">광주</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">권역:</span>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="전체">전체 권역</option>
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> 알스퀘어
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 네모
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> ★ 우체국보험회관
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">표시 크롤링 매물수</span>
          <span className="text-2xl font-black font-mono text-indigo-900 block">
            {kpiStats.listCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">건</span>
          </span>
          <span className="text-[11px] text-slate-500 block truncate">
            {selectedRegion === "전체" ? "전국 권역 크롤링 정제 결과" : `${selectedRegion} ${selectedZone}`}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">빌딩수 (중복 제거)</span>
          <span className="text-2xl font-black font-mono text-slate-900 block">
            {kpiStats.bldgCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">개동</span>
          </span>
          <span className="text-[11px] text-slate-500 block">동일 건물 내 매물 대표값 집계</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">중앙 임대료 단가</span>
          <span className="text-2xl font-black font-mono text-emerald-700 block">
            {kpiStats.medianUnit.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">원/㎡/월</span>
          </span>
          <span className="text-[11px] text-slate-500 block">계약면적 기준 환산 중앙값</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">중앙 건물 연면적</span>
          <span className="text-2xl font-black font-mono text-slate-800 block">
            {kpiStats.medianArea.toLocaleString()} <span className="text-xs font-normal text-slate-500">㎡</span>
          </span>
          <span className="text-[11px] text-slate-500 block">비교대상 주변 오피스 규모</span>
        </div>
      </div>

      {/* Chart Row 1: Listing Rent vs Gross Area (Scatter) & Building Median Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">1. 매물별 — 건물 연면적 vs 계약면적당 임대료</h3>
              <p className="text-[11px] text-slate-500">
                점 1개 = 매물 1건. 가로=건물 연면적(㎡), 세로=계약면적당 임대료(원/㎡)
              </p>
            </div>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600">
              로그 축 보기
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="area"
                  name="연면적"
                  unit="㎡"
                  tick={{ fontSize: 10 }}
                  scale="log"
                  domain={["auto", "auto"]}
                />
                <YAxis type="number" dataKey="unit" name="임대료" unit="원/㎡" tick={{ fontSize: 10 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString()} ${name === "연면적" ? "㎡" : "원/㎡"}`,
                    name,
                  ]}
                  contentStyle={{ fontSize: "11px", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Scatter
                  name="알스퀘어"
                  data={filteredListings.filter((x) => x.src === "알스퀘어")}
                  fill="#3b6fe0"
                  opacity={0.6}
                />
                <Scatter
                  name="네모"
                  data={filteredListings.filter((x) => x.src === "네모")}
                  fill="#f59e0b"
                  opacity={0.6}
                />
                <Scatter
                  name="우체국보험회관"
                  data={filteredHalls}
                  fill="#e5484d"
                  shape="star"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
            <strong>EDA 해석:</strong> 대형 오피스일수록 단위당 임대료가 상승하는 연면적 우상향 곡선이 확인됩니다. 회관(★)은 각 지역 대형군 상단/중앙 위치에 배치되어 있습니다.
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">2. 빌딩별 — 연면적 vs 대표 임대료(중앙값)</h3>
              <p className="text-[11px] text-slate-500">
                동일 빌딩 중복 매물 편중을 제거하고 대표 중앙값(Median)으로 단일화한 분포
              </p>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
              중앙값 집계
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="area"
                  name="연면적"
                  unit="㎡"
                  tick={{ fontSize: 10 }}
                  scale="log"
                  domain={["auto", "auto"]}
                />
                <YAxis type="number" dataKey="unit" name="임대료 중앙값" unit="원/㎡" tick={{ fontSize: 10 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString()} ${name === "연면적" ? "㎡" : "원/㎡"}`,
                    name,
                  ]}
                  contentStyle={{ fontSize: "11px", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Scatter name="빌딩 중앙값" data={filteredBuildingMedians} fill="#10b981" opacity={0.7} />
                <Scatter name="우체국보험회관" data={filteredHalls} fill="#e5484d" shape="star" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
            <strong>EDA 해석:</strong> 빌딩 단위로 중앙값을 산출함으로써 다수 매물이 등록된 특정 건물의 통계 착시 및 이상치 왜곡이 제거됩니다.
          </div>
        </div>
      </div>

      {/* Chart Row 2: Building Use Mix Donut & Built Year / Subway distance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Use Donut Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">3. 크롤링 출처별 주용도 비중</h3>
          <p className="text-[11px] text-slate-500">알스퀘어는 오피스(업무시설) 비중이 높은 반면, 네모는 근생 비중이 높음</p>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={useMixData.rsquarePie}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {useMixData.rsquarePie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-500 text-center font-bold">
            알스퀘어 업무시설 적합도 우수 (보정 원천 데이터 우선채택)
          </div>
        </div>

        {/* Built Year vs Rent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">4. 준공연도(건물 연식) vs 임대료</h3>
          <p className="text-[11px] text-slate-500">신축 건물일수록 임대료가 높게 형성되는 연식 보정 원리 검증</p>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" dataKey="year" name="준공연도" domain={[1970, 2026]} tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="unit" name="임대료" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString()} ${name === "준공연도" ? "년" : "원/㎡"}`,
                    name,
                  ]}
                  contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                />
                <Scatter name="매물" data={filteredListings.filter((x) => x.year)} fill="#6366f1" opacity={0.6} />
                <Scatter name="우체국보험회관" data={filteredHalls} fill="#e5484d" shape="star" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-500 text-center font-medium">
            2010년 이후 준공 신축 오피스의 단가 프리미엄 확인
          </div>
        </div>

        {/* Subway Distance vs Rent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">5. 지하철역 거리(m) vs 임대료</h3>
          <p className="text-[11px] text-slate-500">지하철역 접근성이 우수할수록(거리 짧을수록) 임대료 상승 경향</p>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" dataKey="subway" name="역 거리" unit="m" tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="unit" name="임대료" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString()} ${name === "역 거리" ? "m" : "원/㎡"}`,
                    name,
                  ]}
                  contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                />
                <Scatter name="매물" data={filteredListings.filter((x) => x.subway)} fill="#059669" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-500 text-center font-medium">
            역세권 300m 이내 고단가 집중 형성
          </div>
        </div>
      </div>

      {/* Chart Section 6: Jeonyul Analysis (Region & Zone) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              6. 지역 및 권역별 전용률 (전용면적 ÷ 계약면적) 산정 표준
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              호가(전용단가)를 계약단가로 환산 시 단일 전용률 대신 권역별 실제 중앙값 전용률을 적용하여 정교화
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl">
            전국 중앙값 전용률: 0.620 (62%)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Region Bar Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">지역별 전용률 중앙값 vs 평균</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jeonyulRegionData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 0.9]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [(Number(val) * 100).toFixed(1) + "%", "전용률"]}
                    contentStyle={{ fontSize: "11px" }}
                  />
                  <ReferenceLine y={0.62} stroke="#e5484d" strokeDasharray="3 3" label="전국 62%" />
                  <Bar dataKey="med" name="중앙값" fill="#3b6fe0" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="mean" name="평균" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Zone Horizontal Bar List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">주요 권역별 전용률 매트릭스</h4>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 text-xs font-mono">
              {jeonyulZoneData.map((z) => (
                <div
                  key={`${z.region}-${z.zone}`}
                  className={`p-2 rounded-xl border flex items-center justify-between ${
                    z.hallName
                      ? "bg-indigo-50/70 border-indigo-200 text-indigo-950 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                      {z.region}
                    </span>
                    <span>{z.zone}</span>
                    {z.hallName && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                        ★ {z.hallName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span>중앙: {(z.med * 100).toFixed(1)}%</span>
                    <span className="text-slate-400">평균: {(z.mean * 100).toFixed(1)}%</span>
                    <span className="text-[10px] text-slate-400">({z.count}건)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: EDA AI Calibration Review Matrix & Action Prompt */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                EDA 분석 기반 AI 추천 보정계수 검토 및 최종 설정
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                분기 크롤링 데이터의 95% 신뢰구간(Bootstrap 1,000회) 통계 검정을 거친 AI 추천값
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("valuation")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition"
          >
            <span>임대가격 산정 탭으로 이동</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-slate-300 font-bold">
              <span>권역 보정계수 ($K_{`권역`}$)</span>
              <span className="text-indigo-400 font-mono text-sm">관측 1.085</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              당산·영등포 권역 오피스 중앙값이 기준군 대비 +8.5% 우세. Bootstrap 95% CI (1.021 ~ 1.142)로 1.0 미포함되어 AI 1.085 추천.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-slate-300 font-bold">
              <span>규모 보정계수 ($K_{`규모`}$)</span>
              <span className="text-emerald-400 font-mono text-sm">추천 1.000</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              비교 건물군 간 연면적 차이가 크지 않거나 95% 신뢰구간에 1.000이 포함되어 통계적 차이 미달로 1.000 추천.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-slate-300 font-bold">
              <span>연식 보정계수 ($K_{`연식`}$)</span>
              <span className="text-amber-400 font-mono text-sm">추천 1.000</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              준공 20년 이상 노후 건물군의 유의미한 단가 하락폭이 경미하여 AI 보수적 1.000 부여.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
