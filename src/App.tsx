/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { DatasetMetadata } from "./types/dataset";
import { MainMenuId, SubMenuId, mainNavigation } from "./types/navigation";
import { seedInitialDatabaseIfEmpty } from "./db/idb";
import { datasetRepository } from "./db/repository";

// Components
import { NavigationHeader } from "./components/NavigationHeader";
import { SubNavigation, BreadcrumbBar } from "./components/SubNavigation";

// Views
import { OverallDashboardView } from "./components/OverallDashboardView";
import { EdaDashboardView } from "./components/EdaDashboardView";
import { UploadDatasetView } from "./components/UploadDatasetView";
import { DataValidationView } from "./components/DataValidationView";
import { BuildingCalculationView } from "./components/BuildingCalculationView";
import { CalibrationFactorsView } from "./components/CalibrationFactorsView";
import { QuarterlyHistoryView } from "./components/QuarterlyHistoryView";
import { DatasetManagementView } from "./components/DatasetManagementView";
import { FormulasView } from "./components/FormulasView";

// SubViews
import { BuildingSummarySubView } from "./components/subviews/BuildingSummarySubView";
import { QuarterComparisonSubView } from "./components/subviews/QuarterComparisonSubView";
import { AlertsSubView } from "./components/subviews/AlertsSubView";
import { ColumnMappingSubView } from "./components/subviews/ColumnMappingSubView";
import { ComparableListingsSubView } from "./components/subviews/ComparableListingsSubView";
import { AuditLogSubView } from "./components/subviews/AuditLogSubView";
import { EfficiencyRateSubView } from "./components/subviews/EfficiencyRateSubView";
import { ConversionSubView } from "./components/subviews/ConversionSubView";

export default function App() {
  const [activeMainMenu, setActiveMainMenu] = useState<MainMenuId>("overview");
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuId>("dashboard");
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("2026-Q2-V1");
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize App and parse Hash
  useEffect(() => {
    initApp();

    const handleHashChange = () => {
      parseAndApplyHash();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const parseAndApplyHash = () => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const parts = hash.split("/");
    if (parts.length === 2) {
      const mainCandidate = parts[0] as MainMenuId;
      const subCandidate = parts[1] as SubMenuId;
      const mainObj = mainNavigation.find((m) => m.id === mainCandidate);
      if (mainObj) {
        const subObj = mainObj.children.find((s) => s.id === subCandidate);
        setActiveMainMenu(mainCandidate);
        setActiveSubMenu(subObj ? subCandidate : mainObj.defaultSubmenu);
        return;
      }
    }

    // Single token fallback resolution
    const legacyMap: Record<string, [MainMenuId, SubMenuId]> = {
      dashboard: ["overview", "dashboard"],
      "building-summary": ["overview", "building-summary"],
      "quarter-comparison": ["overview", "quarter-comparison"],
      alerts: ["overview", "alerts"],
      upload: ["data", "upload"],
      validation: ["data", "validation"],
      datasets: ["data", "datasets"],
      "column-mapping": ["data", "column-mapping"],
      eda: ["analysis", "eda"],
      conversion: ["analysis", "conversion"],
      valuation: ["analysis", "valuation"],
      calculation: ["analysis", "valuation"],
      calibration: ["analysis", "adjustment"],
      adjustment: ["analysis", "adjustment"],
      comparables: ["analysis", "comparables"],
      history: ["history", "quarterly-history"],
      "quarterly-history": ["history", "quarterly-history"],
      "change-history": ["history", "change-history"],
      formula: ["history", "formula"],
      formulas: ["history", "formula"],
      "efficiency-rate": ["history", "efficiency-rate"],
    };

    if (legacyMap[hash]) {
      const [m, s] = legacyMap[hash];
      setActiveMainMenu(m);
      setActiveSubMenu(s);
    }
  };

  const initApp = async () => {
    setIsInitializing(true);
    try {
      await seedInitialDatabaseIfEmpty();
      const dsList = await datasetRepository.listDatasets();
      setDatasets(dsList);
      if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].datasetId);
      }
      parseAndApplyHash();
    } catch (err: any) {
      console.error("App init error:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshDatasets = async (targetDatasetId?: string) => {
    const dsList = await datasetRepository.listDatasets();
    setDatasets(dsList);
    if (targetDatasetId) {
      setSelectedDatasetId(targetDatasetId);
    }
  };

  // Main menu or legacy navigation handler
  const handleNavigate = (mainOrSubId: string, subId?: string) => {
    if (subId) {
      // (mainId, subId) form
      const m = mainOrSubId as MainMenuId;
      const s = subId as SubMenuId;
      setActiveMainMenu(m);
      setActiveSubMenu(s);
      window.location.hash = `#${m}/${s}`;
      return;
    }

    // Check if mainOrSubId is a MainMenuId
    const mainMatch = mainNavigation.find((m) => m.id === mainOrSubId);
    if (mainMatch) {
      setActiveMainMenu(mainMatch.id);
      setActiveSubMenu(mainMatch.defaultSubmenu);
      window.location.hash = `#${mainMatch.id}/${mainMatch.defaultSubmenu}`;
      return;
    }

    // Check legacy single token
    const legacyMap: Record<string, [MainMenuId, SubMenuId]> = {
      dashboard: ["overview", "dashboard"],
      "building-summary": ["overview", "building-summary"],
      "quarter-comparison": ["overview", "quarter-comparison"],
      alerts: ["overview", "alerts"],
      upload: ["data", "upload"],
      validation: ["data", "validation"],
      datasets: ["data", "datasets"],
      "column-mapping": ["data", "column-mapping"],
      eda: ["analysis", "eda"],
      conversion: ["analysis", "conversion"],
      valuation: ["analysis", "valuation"],
      calculation: ["analysis", "valuation"],
      calibration: ["analysis", "adjustment"],
      adjustment: ["analysis", "adjustment"],
      comparables: ["analysis", "comparables"],
      history: ["history", "quarterly-history"],
      "quarterly-history": ["history", "quarterly-history"],
      "change-history": ["history", "change-history"],
      formula: ["history", "formula"],
      formulas: ["history", "formula"],
      "efficiency-rate": ["history", "efficiency-rate"],
    };

    if (legacyMap[mainOrSubId]) {
      const [m, s] = legacyMap[mainOrSubId];
      setActiveMainMenu(m);
      setActiveSubMenu(s);
      window.location.hash = `#${m}/${s}`;
    }
  };

  const handleSubMenuSelect = (sId: SubMenuId) => {
    setActiveSubMenu(sId);
    window.location.hash = `#${activeMainMenu}/${sId}`;
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-300">
            우체국보험회관 부동산 임대기준가격 대시보드 로딩 중...
          </p>
        </div>
      </div>
    );
  }

  // Determine sub navigation style for current main category
  const isSidebarLayout = activeMainMenu === "data" || activeMainMenu === "history";

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 font-sans text-slate-900">
      {/* Navigation Header (4 Top Main Menus) */}
      <NavigationHeader
        activeMainMenu={activeMainMenu}
        activeSubMenu={activeSubMenu}
        onSelectMenu={(m, s) => handleNavigate(m, s)}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={setSelectedDatasetId}
      />

      {/* Main Container Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-6">
        {/* Breadcrumbs */}
        <BreadcrumbBar activeMainMenu={activeMainMenu} activeSubMenu={activeSubMenu} />

        {/* Content Layout with Sub-navigation */}
        <div className={`flex flex-col ${isSidebarLayout ? "lg:flex-row gap-6" : "space-y-4"}`}>
          {/* Sub Navigation Bar */}
          <SubNavigation
            activeMainMenu={activeMainMenu}
            activeSubMenu={activeSubMenu}
            onSelectSubMenu={handleSubMenuSelect}
            layoutType={isSidebarLayout ? "sidebar" : "horizontal"}
          />

          {/* Sub-view Content Body */}
          <div className="flex-1 min-w-0">
            {/* 1. 종합 현황 (overview) */}
            {activeMainMenu === "overview" && (
              <>
                {activeSubMenu === "dashboard" && (
                  <OverallDashboardView
                    selectedDatasetId={selectedDatasetId}
                    onNavigateTab={handleNavigate}
                  />
                )}
                {activeSubMenu === "building-summary" && (
                  <BuildingSummarySubView selectedDatasetId={selectedDatasetId} />
                )}
                {activeSubMenu === "quarter-comparison" && (
                  <QuarterComparisonSubView selectedDatasetId={selectedDatasetId} />
                )}
                {activeSubMenu === "alerts" && (
                  <AlertsSubView onNavigate={(m, s) => handleNavigate(m, s)} />
                )}
              </>
            )}

            {/* 2. 데이터 관리 (data) */}
            {activeMainMenu === "data" && (
              <>
                {activeSubMenu === "upload" && (
                  <UploadDatasetView
                    existingDatasets={datasets}
                    onUploadSuccess={async (newId) => {
                      await refreshDatasets(newId);
                      handleNavigate("data", "validation");
                    }}
                  />
                )}
                {activeSubMenu === "validation" && (
                  <DataValidationView
                    selectedDatasetId={selectedDatasetId}
                    onCalculationExecuted={async (dsId) => {
                      await refreshDatasets(dsId);
                      handleNavigate("analysis", "valuation");
                    }}
                  />
                )}
                {activeSubMenu === "datasets" && <DatasetManagementView />}
                {activeSubMenu === "column-mapping" && <ColumnMappingSubView />}
              </>
            )}

            {/* 3. 임대가격 분석 (analysis) */}
            {activeMainMenu === "analysis" && (
              <>
                {activeSubMenu === "eda" && (
                  <EdaDashboardView
                    selectedDatasetId={selectedDatasetId}
                    onNavigateTab={(target) => {
                      if (target === "calibration" || target === "adjustment") {
                        handleNavigate("analysis", "adjustment");
                      } else {
                        handleNavigate(target);
                      }
                    }}
                  />
                )}
                {activeSubMenu === "conversion" && <ConversionSubView />}
                {activeSubMenu === "valuation" && (
                  <BuildingCalculationView
                    selectedDatasetId={selectedDatasetId}
                    onValuationConfirmed={async (dsId) => {
                      await refreshDatasets(dsId);
                    }}
                  />
                )}
                {activeSubMenu === "adjustment" && (
                  <CalibrationFactorsView selectedDatasetId={selectedDatasetId} />
                )}
                {activeSubMenu === "comparables" && <ComparableListingsSubView />}
              </>
            )}

            {/* 4. 이력·기준 관리 (history) */}
            {activeMainMenu === "history" && (
              <>
                {activeSubMenu === "quarterly-history" && <QuarterlyHistoryView />}
                {activeSubMenu === "change-history" && <AuditLogSubView />}
                {activeSubMenu === "formula" && <FormulasView />}
                {activeSubMenu === "efficiency-rate" && <EfficiencyRateSubView />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
