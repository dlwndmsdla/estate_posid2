/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MainMenuId, SubMenuId, mainNavigation } from "../types/navigation";
import { ChevronRight, Home, Check, Sparkles } from "lucide-react";

interface SubNavigationProps {
  activeMainMenu: MainMenuId;
  activeSubMenu: SubMenuId;
  onSelectSubMenu: (subMenuId: SubMenuId) => void;
  layoutType?: "horizontal" | "sidebar";
}

export function SubNavigation({
  activeMainMenu,
  activeSubMenu,
  onSelectSubMenu,
}: SubNavigationProps) {
  const currentMain = mainNavigation.find((m) => m.id === activeMainMenu) || mainNavigation[0];
  const currentSub = currentMain.children.find((s) => s.id === activeSubMenu) || currentMain.children[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm mb-6 space-y-3">
      {/* Category Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 font-mono">
            {currentMain.label}
          </span>
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>{currentSub.label}</span>
          </h2>
        </div>
        {currentSub.description && (
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{currentSub.description}</span>
          </p>
        )}
      </div>

      {/* Sub Menu Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
        {currentMain.children.map((sub) => {
          const isActive = activeSubMenu === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onSelectSubMenu(sub.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-500"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              {isActive && <Check className="w-3.5 h-3.5 text-indigo-200 shrink-0" />}
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BreadcrumbBar({
  activeMainMenu,
  activeSubMenu,
}: {
  activeMainMenu: MainMenuId;
  activeSubMenu: SubMenuId;
}) {
  const currentMain = mainNavigation.find((m) => m.id === activeMainMenu) || mainNavigation[0];
  const currentSub = currentMain.children.find((s) => s.id === activeSubMenu) || currentMain.children[0];

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 font-medium bg-white/60 px-3 py-1.5 rounded-xl border border-slate-200/60 w-fit">
      <span className="flex items-center gap-1 text-slate-400">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>대시보드</span>
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      <span className="text-slate-600 font-bold">{currentMain.label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
        {currentSub.label}
      </span>
    </div>
  );
}

