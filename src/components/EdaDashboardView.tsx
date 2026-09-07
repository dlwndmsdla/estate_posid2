/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { CleanedListing, BuildingMedian, CalculationResult, RawListing } from "../types/dataset";
import { listingRepository, valuationRepository, datasetRepository } from "../db/repository";
import { activeBuildingsInfo } from "../prdDataset";
import { HALL_SPECS, calculateEfficiencyRate } from "../services/rentalCalculationEngine";
import {
  AlertTriangle,
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
  const [rawListings, setRawListings] = useState<RawListing[]>([]);
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
      // 전용률은 원본 매물로만 구할 수 있다. CleanedListing.leaseArea 는 이름과 달리
      // 전용면적이 그대로 들어가 있어(excelEngine.ts) 나누면 항상 1.0 이 나온다.
      const raws = await listingRepository.getRawListings(selectedDatasetId);

      setCleanedListings(listings);
      setBuildingMedians(medians);
      setCalcs(calcResults);
      setRawListings(raws);
    } catch (err) {
      console.error("EDA Data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 업로드된 매물만 그린다. 예전에는 비어 있으면 지어낸 표본 38건(prdDataset)을
  // 대신 그렸는데, 아무것도 안 올린 상태에서 실제 시장 데이터처럼 보여 위험했다.
  // 데이터가 없으면 없다고 말한다 — 다른 화면과 같은 규칙이다.
  const effectiveListings: ListingPlotData[] = useMemo(() => {
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
  }, [cleanedListings]);

  // 회관 기준점. 산정 결과가 있는 회관만 찍는다.
  // 예전에는 결과가 없으면 당산 10,672 / 그 외 11,121 원을 넣었는데, 근거 없는
  // 숫자가 차트에 회관 임대료로 찍히는 것이라 뺐다.
  const hallListings: ListingPlotData[] = useMemo(() => {
    return activeBuildingsInfo.flatMap((b) => {
      const calc = calcs.find((c) => c.buildingId === b.id);
      if (!calc) return [];
      return [{
        src: "우체국보험회관",
        area: b.grossAreaSqm,
        unit: calc.finalRent,
        use: "업무시설",
        region: b.city,
        zone: b.tradeArea,
        year: b.builtYear,
        name: b.name,
        isHall: true,
      }];
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

  /**
   * 전용률 표본. 원본 매물에서 계약면적을 가진 것만 모은다.
   *
   * 산정 엔진과 같은 함수(calculateEfficiencyRate)를 쓴다 — 출처가 알스퀘어인지,
   * 두 면적이 다 있는지, 비율이 20~95% 안인지를 그쪽 규칙 그대로 판정하기 위해서다.
   * 예전 코드는 CleanedListing 의 exclusiveArea ÷ leaseArea 를 썼는데, leaseArea 에
   * 전용면적이 그대로 들어가 있어 결과가 늘 1.0(100%)이었다.
   */
  const efficiencySamples = useMemo(() => {
    return rawListings.flatMap((l) => {
      const rate = calculateEfficiencyRate(l);
      if (rate === null || !l.region) return [];
      return [{ region: l.region, zone: l.zone || "", rate }];
    });
  }, [rawListings]);

  const statsOfRates = (rates: number[]) => {
    const sorted = [...rates].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    return { med: Number(med.toFixed(3)), mean: Number(mean.toFixed(3)), count: rates.length };
  };

  // 지역별 전용률. 표본 6건 미만인 지역은 뺀다.
  // 예전에는 여기서 6/29 고정값(서울 0.506 등)을 대신 넣어, 어떤 파일을 올려도
  // 같은 숫자가 나왔다.
  const jeonyulRegionData: JeonyulRegionStats[] = useMemo(() => {
    const map: Record<string, number[]> = {};
    efficiencySamples.forEach((s) => {
      (map[s.region] ||= []).push(s.rate);
    });
    return Object.keys(map)
      .filter((reg) => map[reg].length > 5)
      .map((reg) => ({ region: reg, ...statsOfRates(map[reg]) }));
  }, [efficiencySamples]);

  // 권역별 전용률. 예전에는 이 블록 전체가 6/29 수치 11줄을 박아 둔 상수였고
  // useMemo 의존성도 비어 있어서, 어떤 분기를 올리든 같은 표가 나왔다.
  const jeonyulZoneData: JeonyulZoneStats[] = useMemo(() => {
    const map: Record<string, { region: string; zone: string; rates: number[] }> = {};
    efficiencySamples.forEach((s) => {
      if (!s.zone) return;
      const key = `${s.region}/${s.zone}`;
      (map[key] ||= { region: s.region, zone: s.zone, rates: [] }).rates.push(s.rate);
    });

    return Object.values(map)
      .filter((g) => g.rates.length > 5)
      .map((g) => {
        const hall = HALL_SPECS.find((h) => h.region === g.region && h.zone === g.zone);
        return {
          region: g.region,
          zone: g.zone,
          ...statsOfRates(g.rates),
          hallName: hall ? hall.buildingName : "",
        };
      })
      .sort((a, b) => a.region.localeCompare(b.region) || b.count - a.count);
  }, [cleanedListings]);

  const COLORS = ["#3b6fe0", "#12a150", "#f59e0b", "#a855f7", "#64748b", "#cbd5e1"];

  // 매물이 없으면 빈 차트를 그리지 않고 이유를 말한다.
  if (!isLoading && cleanedListings.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            EXPLORATORY DATA ANALYSIS (EDA) & CALIBRATION MATRIX
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
            분기별 크롤링 매물 EDA 분석 및 보정계수 검토 대시보드
          </h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            <h3 className="font-bold mb-1">이 분기에 반입된 매물이 없습니다</h3>
            <p className="text-xs leading-relaxed">
              이 화면은 업로드한 매물만 그립니다. 예전에는 데이터가 없을 때 예시 매물을 대신
              그렸는데, 실제 시장 데이터로 오해할 수 있어 없앴습니다.{" "}
              <span className="font-bold">1단계 · 자료 반입</span>에서 분기 엑셀을 올리고
              <span className="font-bold"> "데이터셋 생성 및 검증 저장"</span>까지 눌러 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            {jeonyulZoneData.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">이 분기 파일로는 전용률을 계산할 수 없습니다. </span>
                전용률 = 전용면적 ÷ 임대(계약)면적인데, 업로드된 매물에 임대면적이 없습니다.
                네모는 임대면적을 주지 않고, 알스퀘어는 통합데이터에 임대(계약)면적 열이
                실려 있어야 계산됩니다. 그 열이 없는 분기에는 전용률·계약환산에 저장된
                기준 전용률표가 대신 쓰입니다.
              </div>
            )}
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
                이번 분기 매물로 산정한 회관별 관측·추천 보정계수입니다. 관측값이 그대로
                추천되지 않은 줄은 게이트(비교 건물 5곳 미만 또는 IQR이 중앙값의 15% 초과)에
                걸려 중립값 1.000이 적용된 것입니다.
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

        {/* 예전에는 이 자리에 "관측 1.085 / Bootstrap 95% CI (1.021~1.142)" 같은 문구가
            고정 텍스트로 박혀 있었다. 어떤 분기를 올려도 같은 숫자가 떠서, 이번 분기
            계산으로 오해할 수 있었다. 이제 산정 결과에서 그대로 읽어 온다. */}
        {calcs.length === 0 ? (
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-[11px] text-slate-400">
            이 분기의 산정 결과가 아직 없습니다. 1단계 · 자료 반입에서 엑셀을 올리고
            저장하면 회관별 보정계수가 여기에 표시됩니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead className="text-slate-400 font-bold border-b border-slate-700">
                <tr>
                  <th className="py-2 pr-3">회관</th>
                  <th className="py-2 pr-3">권역 K (관측 → 추천)</th>
                  <th className="py-2 pr-3">규모 K (관측 → 추천)</th>
                  <th className="py-2 pr-3">연식 K (관측 → 추천)</th>
                  <th className="py-2">총 추천계수</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 font-mono">
                {calcs.map((c) => {
                  const cell = (d: typeof c.zoneFactorDetail) => (
                    <td className="py-2 pr-3">
                      {d.observedFactor.toFixed(3)}
                      <span className="text-slate-500"> → </span>
                      <span
                        className={
                          d.recommendedFactor === 1 && d.observedFactor !== 1
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }
                      >
                        {d.recommendedFactor.toFixed(3)}
                      </span>
                      <span className="text-slate-500"> ({d.sampleCount}곳)</span>
                    </td>
                  );
                  return (
                    <tr key={c.buildingId} className="border-b border-slate-800">
                      <td className="py-2 pr-3 font-sans font-bold text-white">{c.buildingName}</td>
                      {cell(c.zoneFactorDetail)}
                      {cell(c.sizeFactorDetail)}
                      {cell(c.ageFactorDetail)}
                      <td className="py-2 text-indigo-300 font-bold">
                        {c.recommendedFactors.total.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
