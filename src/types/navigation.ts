/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, Database, BarChart3, History } from "lucide-react";

export type MainMenuId = "s1" | "s2" | "s3" | "s4" | "ref";

export type SubMenuId =
  // 1단계. 자료 반입 (s1)
  | "upload"
  | "validation"
  | "column-mapping"
  | "datasets"
  // 2단계. 검증·탐색 (s2)
  | "eda"
  | "conversion"
  | "comparables"
  // 3단계. 산정 (s3)
  | "dashboard"
  | "valuation"
  | "adjustment"
  // 4단계. 확정 (s4)
  | "quarterly-history"
  | "change-history"
  | "alerts"
  // 참조 (ref)
  | "formula"
  | "efficiency-rate"
  // Legacy aliases
  | "quarter-comparison";

export interface SubMenuItem {
  id: SubMenuId;
  label: string;
  description?: string;
  group?: string;
}

export interface MainMenuItem {
  id: MainMenuId;
  label: string;
  stepNumber?: number;
  icon: any;
  defaultSubmenu: SubMenuId;
  children: SubMenuItem[];
}

export const mainNavigation: MainMenuItem[] = [
  {
    id: "s1",
    label: "1단계 · 자료 반입",
    stepNumber: 1,
    icon: Database,
    defaultSubmenu: "upload",
    children: [
      { id: "upload", label: "분기 데이터 업로드", description: "외부 부동산 크롤링 Excel 매물 데이터 반입" },
      { id: "validation", label: "원천 데이터 검증", description: "원천 데이터 정합성·전용률 누락 및 오류 검증" },
      { id: "column-mapping", label: "열 매핑 관리", description: "크롤링 Excel 수집 항목과 시스템 표준 열 매핑 설정" },
      { id: "datasets", label: "데이터셋 관리", description: "분기별 데이터셋 버전 이력, 형상 관리 및 보관" },
    ],
  },
  {
    id: "s2",
    label: "2단계 · 검증·탐색",
    stepNumber: 2,
    icon: BarChart3,
    defaultSubmenu: "eda",
    children: [
      { id: "eda", label: "매물 EDA 분포 탐색", description: "지역·권역별 크롤링 매물 분포 및 전용률 특성 탐색" },
      { id: "conversion", label: "전용률·계약환산", description: "알스퀘어 전용률 산출 및 전체 지역매물 계약단가 자동 환산" },
      { id: "comparables", label: "비교매물 상세", description: "회관별 최종 포함·제외 비교 건물 세부 통계" },
    ],
  },
  {
    id: "s3",
    label: "3단계 · 산정",
    stepNumber: 3,
    icon: LayoutDashboard,
    defaultSubmenu: "dashboard",
    children: [
      { id: "dashboard", label: "종합 현황 대시보드", description: "5개 보험회관 주요 산정지표, 총괄 현황 및 회관별 요약" },
      { id: "valuation", label: "회관별 임대가격 산정", description: "우체국보험회관 적정 임대기준가격 모델 산정 및 수기조정" },
      { id: "adjustment", label: "보정계수 검토·조정", description: "AI 추천 보정계수 검토 및 담당자 사유 조정 매트릭스" },
      { id: "quarter-comparison", label: "분기별 비교", description: "분기별 임대기준가격 변동추이 및 시계열 분석" },
    ],
  },
  {
    id: "s4",
    label: "4단계 · 확정",
    stepNumber: 4,
    icon: History,
    defaultSubmenu: "quarterly-history",
    children: [
      { id: "quarterly-history", label: "분기별 확정이력", description: "과거 분기별 반입원천, 보정계수 및 확정가 불변 이력" },
      { id: "alerts", label: "주요 경고 및 검토사항", description: "표본 부족, 보정계수 이상치 및 미확정 회관 모니터링" },
      { id: "change-history", label: "확정 및 감사로그", description: "담당자 최종 승인, 보정치 수치 변경 및 사유 감사 로그" },
    ],
  },
  {
    id: "ref",
    label: "참조 · 산출기준",
    icon: History,
    defaultSubmenu: "formula",
    children: [
      { id: "formula", label: "산출기준 및 공식", description: "임대기준가격 산출 수학적 모델 및 AI 추천 규칙" },
      { id: "efficiency-rate", label: "전용률 기준 관리", description: "지역·권역별 표준 전용률 중앙값 및 적용 우선순위" },
    ],
  },
];
