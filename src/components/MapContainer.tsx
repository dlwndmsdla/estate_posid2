/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { InsuranceBuilding } from "../types";
import { MapPin, Building2, Eye } from "lucide-react";

interface MapContainerProps {
  buildings: InsuranceBuilding[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  buildings,
  selectedId,
  onSelect,
}) => {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-full flex flex-col justify-between">
      <div>
        <h3 className="font-sans font-semibold text-slate-800 text-lg flex items-center gap-2">
          <MapPin id="map-pin-icon" className="w-5 h-5 text-indigo-600" />
          전국 자산 지리적 분포
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          지도의 위치 포인트 또는 우측 리스트를 클릭하여 정밀 수치 분석을 시작하세요.
        </p>
      </div>

      {/* Styled Interactive Digital Map representing South Korea */}
      <div id="interactive-map-area" className="relative flex-1 min-h-[300px] bg-slate-50/50 rounded-xl my-4 border border-slate-100 overflow-hidden flex items-center justify-center">
        {/* Abstract futuristic topographic grid visualizer */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Visual outline mockup representing the South Korean peninsula */}
        <svg className="w-64 h-80 text-slate-200/80 transform translate-x-2" viewBox="0 0 200 260" fill="currentColor">
          {/* Main Peninsula Body (Stylized Geometric Representation) */}
          <path d="M 60,30 C 55,50 48,70 52,90 C 54,105 65,115 58,130 C 50,145 35,160 38,180 C 42,202 58,210 65,225 C 72,240 85,250 100,245 C 115,240 120,225 125,210 C 132,192 145,178 140,155 C 135,132 145,115 130,95 C 120,80 115,62 105,50 C 95,38 85,25 70,20 Z" className="fill-slate-100 stroke-slate-200 stroke-2" />
          {/* Jeju Island */}
          <ellipse cx="65" cy="245" rx="15" ry="7" className="fill-slate-100 stroke-slate-200 stroke-2" />
          {/* Ulleungdo & Dokdo */}
          <circle cx="170" cy="110" r="4" className="fill-slate-100 stroke-slate-200 stroke-1" />
          <circle cx="185" cy="115" r="2" className="fill-slate-100 stroke-slate-200 stroke-1" />
        </svg>

        {/* Dynamic network connection paths between insurance buildings to show structural responsibility */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="100 100 800 800">
          {selectedId && (
            <g className="opacity-30">
              {buildings.map((b) => {
                const isSelected = b.id === selectedId;
                if (isSelected) return null;
                const activeB = buildings.find(item => item.id === selectedId);
                if (!activeB) return null;
                return (
                  <line 
                    key={`line-${b.id}`}
                    x1={`${activeB.coordinates.x}%`} 
                    y1={`${activeB.coordinates.y}%`} 
                    x2={`${b.coordinates.x}%`} 
                    y2={`${b.coordinates.y}%`}
                    className="stroke-indigo-400 stroke-1 stroke-dasharray-[4_4]" 
                    style={{ strokeDasharray: "4,4" }}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* City Pins on Map */}
        {buildings.map((building) => {
          const isSelected = building.id === selectedId;
          return (
            <button
              key={building.id}
              onClick={() => onSelect(building.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 pointer-events-auto"
              style={{ left: `${building.coordinates.x}%`, top: `${building.coordinates.y}%` }}
              title={building.name}
            >
              {/* Outer pulsing ring */}
              <span className={`absolute -inset-2.5 rounded-full ${isSelected ? "bg-indigo-500/30 animate-ping" : "bg-slate-400/0 group-hover:bg-slate-400/20"} transition-all duration-300`}></span>
              
              {/* Pin design */}
              <div className={`relative flex items-center justify-center w-6 h-6 rounded-full border shadow-md transition-all duration-300 ${
                isSelected 
                  ? "bg-indigo-600 border-indigo-400 scale-125 text-white z-10" 
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 scale-100"
              }`}>
                <Building2 id={`pin-building-icon-${building.id}`} className="w-3.5 h-3.5" />
              </div>

              {/* Label tooltips tooltip */}
              <div className={`absolute left-1/2 -translate-x-1/2 bottom-8 whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-medium tracking-tight border transition-all duration-300 ${
                isSelected 
                  ? "bg-slate-900 border-slate-950 text-white translate-y-0 opacity-100 scale-100 shadow-md" 
                  : "bg-white border-slate-200 text-slate-700 opacity-60 group-hover:opacity-100 group-hover:translate-y-[-2px] group-hover:scale-100 shadow-sm"
              }`}>
                {building.city}회관
              </div>
            </button>
          );
        })}
      </div>

      {/* Overview stats & index reference */}
      <div className="border-t border-slate-100 pt-4">
        <h4 className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">자산 신속 선택 리스트</h4>
        <div className="mt-2.5 space-y-1.5" id="asset-quick-select-list">
          {buildings.map((b) => {
            const isSelected = b.id === selectedId;
            return (
              <button
                key={b.id}
                onClick={() => onSelect(b.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? "bg-indigo-50/50 border-indigo-200/80 text-slate-800"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-indigo-600" : "bg-slate-300"}`}></span>
                  <span className="text-xs font-semibold">{b.city}회관</span>
                  <span className="text-[10px] text-slate-400 font-mono tracking-tight">{b.builtYear}년 준공</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {b.occupancyRate}% 임대
                  </span>
                  <Eye className="w-3 h-3 text-slate-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
