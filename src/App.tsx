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
import { QuarterlyHistoryView } from "./components/QuarterlyHistoryView";
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
  const [activeMainMenu, setActiveMainMenu] = useState<MainMenuId>("s3");
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

  const legacyMap: Record<string, [MainMenuId, SubMenuId]> = {
    // Step 1
    upload: ["s1", "upload"],
    validation: ["s1", "validation"],
    "column-mapping": ["s1", "column-mapping"],
    datasets: ["s1", "datasets"],
    // Step 2
    eda: ["s2", "eda"],
    conversion: ["s2", "conversion"],
    comparables: ["s2", "comparables"],
    // Step 3
    dashboard: ["s3", "dashboard"],
    "building-summary": ["s3", "dashboard"],
    valuation: ["s3", "valuation"],
    calculation: ["s3", "valuation"],
    adjustment: ["s3", "adjustment"],
    calibration: ["s3", "adjustment"],
    "quarter-comparison": ["s3", "quarter-comparison"],
    // Step 4
    "quarterly-history": ["s4", "quarterly-history"],
    history: ["s4", "quarterly-history"],
    alerts: ["s4", "alerts"],
    "change-history": ["s4", "change-history"],
    // Reference
    formula: ["ref", "formula"],
    formulas: ["ref", "formula"],
    "efficiency-rate": ["ref", "efficiency-rate"],
    // Legacy Main aliases
    overview: ["s3", "dashboard"],
    data: ["s1", "upload"],
  };

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

    if (legacyMap[mainOrSubId]) {
      const [m, s] = legacyMap[mainOrSubId];
      setActiveMainMenu(m);
      setActiveSubMenu(s);
      window.location.hash = `#${m}/${s}`;
    }
  };

  const handleSubMenuSelect = (sId: SubMenuId) => {
    // Find parent main menu for sub menu if needed
    const parentMain = mainNavigation.find((m) => m.children.some((c) => c.id === sId));
    const targetMain = parentMain ? parentMain.id : activeMainMenu;
    setActiveMainMenu(targetMain);
    setActiveSubMenu(sId);
    window.location.hash = `#${targetMain}/${sId}`;
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

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 font-sans text-slate-900">
      {/* Navigation Header (4 Top Steps + Ref) */}
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

        {/* Unified Sub Navigation Bar */}
        <SubNavigation
          activeMainMenu={activeMainMenu}
          activeSubMenu={activeSubMenu}
          onSelectSubMenu={handleSubMenuSelect}
        />

        {/* Sub-view Content Body */}
        <div className="min-w-0 space-y-4">
          {/* Sub-view Renderer directly based on activeSubMenu */}
          {activeSubMenu === "upload" && (
            <UploadDatasetView
              existingDatasets={datasets}
              onUploadSuccess={async (newId) => {
                await refreshDatasets(newId);
                handleNavigate("s1", "validation");
              }}
            />
          )}

          {activeSubMenu === "validation" && (
            <DataValidationView
              selectedDatasetId={selectedDatasetId}
              onCalculationExecuted={async (dsId) => {
                await refreshDatasets(dsId);
                handleNavigate("s3", "valuation");
              }}
            />
          )}

          {activeSubMenu === "column-mapping" && <ColumnMappingSubView />}

          {activeSubMenu === "eda" && (
            <EdaDashboardView
              selectedDatasetId={selectedDatasetId}
              onNavigateTab={(target) => {
                handleNavigate(target);
              }}
            />
          )}

          {activeSubMenu === "conversion" && <ConversionSubView />}
          {activeSubMenu === "comparables" && <ComparableListingsSubView />}

          {activeSubMenu === "dashboard" && (
            <OverallDashboardView
              selectedDatasetId={selectedDatasetId}
              onNavigateTab={handleNavigate}
            />
          )}

          {activeSubMenu === "valuation" && (
            <BuildingCalculationView
              selectedDatasetId={selectedDatasetId}
              onValuationConfirmed={async (dsId) => {
                await refreshDatasets(dsId);
                handleNavigate("s4", "quarterly-history");
              }}
            />
          )}

          {activeSubMenu === "quarter-comparison" && (
            <QuarterComparisonSubView selectedDatasetId={selectedDatasetId} />
          )}

          {activeSubMenu === "quarterly-history" && <QuarterlyHistoryView />}

          {activeSubMenu === "alerts" && (
            <AlertsSubView onNavigate={(m, s) => handleNavigate(m, s)} />
          )}

          {activeSubMenu === "change-history" && <AuditLogSubView />}
          {activeSubMenu === "formula" && <FormulasView />}
          {activeSubMenu === "efficiency-rate" && <EfficiencyRateSubView />}
        </div>
      </main>
    </div>
  );
}
