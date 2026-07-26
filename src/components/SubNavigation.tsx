/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MainMenuId, SubMenuId, mainNavigation } from "../types/navigation";
import { ChevronRight, Home } from "lucide-react";

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
  layoutType = "horizontal",
}: SubNavigationProps) {
  const currentMain = mainNavigation.find((m) => m.id === activeMainMenu) || mainNavigation[0];
  const currentSub = currentMain.children.find((s) => s.id === activeSubMenu) || currentMain.children[0];

  if (layoutType === "sidebar") {
    return (
      <aside className="w-full lg:w-64 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm shrink-0 self-start space-y-2">
        <div className="px-3 py-2 border-b border-slate-100 mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {currentMain.label} 세부 메뉴
          </span>
          <h3 className="text-xs font-extrabold text-slate-800">{currentMain.label}</h3>
        </div>

        <nav className="space-y-1">
          {currentMain.children.map((sub) => {
            const isActive = activeSubMenu === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => onSelectSubMenu(sub.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <span>{sub.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />}
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm mb-6">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
        {currentMain.children.map((sub) => {
          const isActive = activeSubMenu === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onSelectSubMenu(sub.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {sub.label}
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
    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 font-medium">
      <span className="flex items-center gap-1 text-slate-400">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>홈</span>
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      <span className="text-slate-600 font-semibold">{currentMain.label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      <span className="text-indigo-600 font-extrabold">{currentSub.label}</span>
    </div>
  );
}
