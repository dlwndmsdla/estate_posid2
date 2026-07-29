/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { DatasetMetadata } from "../types/dataset";
import { MainMenuId, SubMenuId, mainNavigation } from "../types/navigation";
import {
  Calendar,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

interface NavigationHeaderProps {
  activeMainMenu: MainMenuId;
  activeSubMenu: SubMenuId;
  onSelectMenu: (mainId: MainMenuId, subId?: SubMenuId) => void;
  datasets: DatasetMetadata[];
  selectedDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
}

export function NavigationHeader({
  activeMainMenu,
  activeSubMenu,
  onSelectMenu,
  datasets,
  selectedDatasetId,
  onSelectDataset,
}: NavigationHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const selectedDataset = datasets.find((d) => d.datasetId === selectedDatasetId) || datasets[0];
  const currentMainObj = mainNavigation.find((m) => m.id === activeMainMenu) || mainNavigation[0];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      {/* Top Branding & Dataset Selector Ribbon */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* App Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-black text-base text-white shadow-md shrink-0 border border-indigo-400/40">
              우
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white">
                  우체국보험회관 부동산 임대기준가격 대시보드
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full font-mono">
                  OPM-SYSTEM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                우체국금융개발원 자산운영지원팀 • 크롤링 매물 계약단가 환산 및 권역·규모·연식 보정산정
              </p>
            </div>
          </div>

          {/* Right Controls: Active Dataset Selector & Mobile Hamburger */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 p-1.5 rounded-xl shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 pl-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-200 text-[11px] hidden lg:inline">조회 데이터셋:</span>
              </div>
              <div className="relative">
                <select
                  value={selectedDatasetId}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  className="appearance-none bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-1 pr-7 rounded-lg border border-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {datasets.map((d) => (
                    <option key={d.datasetId} value={d.datasetId}>
                      {d.datasetId} ({d.referenceYear}년 {d.referenceQuarter}분기 V{d.version})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {selectedDataset && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                    selectedDataset.status === "confirmed"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : selectedDataset.status === "calculated"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {selectedDataset.status.toUpperCase()}
                </span>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Top Main Categories Navigation Bar (4 Step Tabs + Ref) - Desktop */}
      <nav className="bg-slate-950 border-t border-slate-800 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5 py-1.5">
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeMainMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectMenu(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all relative ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md border border-indigo-400/50 ring-1 ring-indigo-400/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent"
                  }`}
                >
                  {item.stepNumber ? (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black ${
                        isActive ? "bg-white text-indigo-700" : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {item.stepNumber}
                    </span>
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-indigo-400"}`} />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>분기 작업 진행 중: <strong className="text-white font-bold">{currentMainObj.label}</strong></span>
          </div>
        </div>
      </nav>

      {/* Sub-menu Direct Action Navigation Bar Strip (Shows all sub-items under current category) */}
      <div className="bg-slate-900/90 border-t border-slate-800/90 py-1.5 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-400" />
            {currentMainObj.label}:
          </span>

          <div className="flex items-center gap-1.5">
            {currentMainObj.children.map((sub, idx) => {
              const isSubActive = activeSubMenu === sub.id;
              const isFirstInGroup = sub.group && (idx === 0 || currentMainObj.children[idx - 1]?.group !== sub.group);
              return (
                <React.Fragment key={sub.id}>
                  {isFirstInGroup && (
                    <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50 shrink-0 ml-1">
                      {sub.group}
                    </span>
                  )}
                  <button
                    onClick={() => onSelectMenu(activeMainMenu, sub.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSubActive
                        ? "bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-400/50"
                        : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                    }`}
                    title={sub.description}
                  >
                    <span>{sub.label}</span>
                    {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 py-3 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeMainMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectMenu(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold text-left transition ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-300 border border-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">
              {currentMainObj.label} 세부 메뉴
            </span>
            <div className="flex flex-col gap-1.5">
              {currentMainObj.children.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    onSelectMenu(activeMainMenu, sub.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between ${
                    activeSubMenu === sub.id
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold"
                      : "bg-slate-900 text-slate-300 border border-slate-800"
                  }`}
                >
                  <span>{sub.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

