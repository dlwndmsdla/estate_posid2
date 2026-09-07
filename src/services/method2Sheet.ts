/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import {
  Method2Candidate,
  Method2HallRow,
  Method2SheetData,
  Method2TierRow,
} from "../types/dataset";

export const METHOD2_RESULT_SHEET = "방법2_유사군매칭";
export const METHOD2_CANDIDATE_SHEET = "방법2_비교건물";

/** 이 시트들이 다루는 티어 3구성. 엑셀 열 이름이 "[티어] 항목" 꼴이라 접두로 쓴다. */
const TIERS = ["T1", "T1+T2(기본15)", "Top-30전체"];

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[,\s원]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

/**
 * 열 이름으로 값을 꺼낸다. 엑셀 헤더가 조금 바뀌어도 버티도록 부분일치를 허용하되,
 * 완전일치를 먼저 본다 — "방법2 범위(하한)"과 "방법2 범위(상한)"처럼 접두가 같은 열이 있어서다.
 */
function pick(row: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (name in row) return row[name];
  }
  const keys = Object.keys(row);
  for (const name of names) {
    const hit = keys.find((k) => k.includes(name));
    if (hit) return row[hit];
  }
  return undefined;
}

function readTier(row: Record<string, unknown>, tier: string): Method2TierRow {
  const at = (label: string) => pick(row, `[${tier}] ${label}`);
  return {
    tier,
    sampleCount: toNumber(at("표본수")) ?? 0,
    askMedianWon: toNumber(at("호가 중앙값(전용)")),
    byNationalRateWon: toNumber(at("전국전용률 적용")),
    byRegionRateWon: toNumber(at("지역전용률 적용")),
    byZoneRateWon: toNumber(at("권역전용률 적용")),
    byCalibrationWon: toNumber(at("보정계수(기존)")),
  };
}

function readHall(row: Record<string, unknown>): Method2HallRow {
  return {
    hallName: toText(pick(row, "회관")),
    region: toText(pick(row, "지역")),
    zone: toText(pick(row, "권역")),
    grossAreaSqm: toNumber(pick(row, "연면적(㎡)")),
    completionYear: toNumber(pick(row, "준공연도")),

    currentRentWon: toNumber(pick(row, "현행 임대료")),
    realTransactionRentWon: toNumber(pick(row, "실거래 임대료(기준선, 2025.4Q)", "실거래 임대료")),
    realTransactionNote: toText(pick(row, "실거래 비고")),
    roneZoneAverageWon: toNumber(pick(row, "방법4 R-ONE 권역평균")),
    roneZoneLabel: toText(pick(row, "R-ONE 권역(매칭)")),
    method1CascadeWon: toNumber(pick(row, "방법1 캐스케이드")),

    tiers: TIERS.map((t) => readTier(row, t)),
    nationalRate: toNumber(pick(row, "적용 전용률(전국)")),
    regionRate: toNumber(pick(row, "적용 전용률(지역)")),
    zoneRate: toNumber(pick(row, "적용 전용률(권역)")),
    zoneRateSource: toText(pick(row, "권역 전용률 출처")),
    calibrationFactor: toNumber(pick(row, "보정계수(v6 실측기반)")),

    method2RepresentativeWon: toNumber(pick(row, "방법2 대표값")),
    method2LowWon: toNumber(pick(row, "방법2 범위(하한)")),
    method2HighWon: toNumber(pick(row, "방법2 범위(상한)")),

    measuredAreaRatio: toText(pick(row, "[품질] 기본15 중 연면적 실측")),
    regionAreaCoverage: toText(pick(row, "[품질] 지역 표본 연면적 커버리지")),
  };
}

function readCandidate(row: Record<string, unknown>): Method2Candidate {
  return {
    hallName: toText(pick(row, "회관")),
    rank: toNumber(pick(row, "순위")) ?? 0,
    inDefault15: toText(pick(row, "기본15포함")) !== "",
    tier: toText(pick(row, "티어")),
    similarity: toNumber(pick(row, "유사도")),
    buildingName: toText(pick(row, "빌딩명")),
    address: toText(pick(row, "주소")),
    zone: toText(pick(row, "권역")),
    grossAreaSqm: toNumber(pick(row, "연면적(㎡)")),
    areaSource: toText(pick(row, "연면적 출처")),
    buildingAgeYears: toNumber(pick(row, "건물연령(년)")),
    askRentPerExclusiveSqmWon: toNumber(pick(row, "호가 단가")),
  };
}

/**
 * 업로드된 워크북에서 방법2 시트 2장을 읽는다.
 *
 * 시트가 없으면 null을 돌려준다 — 2026-10-01 이전에 발송된 엑셀에는 이 시트가 없고,
 * 그때는 화면이 "이 파일에는 없다"고 말해야지 0으로 채워 정상인 척하면 안 된다.
 * 두 시트 모두 헤더가 1행이다(통합데이터 시트만 2행 헤더라 다르다).
 */
export function parseMethod2Sheets(
  workbook: XLSX.WorkBook,
  datasetId: string
): Method2SheetData | null {
  const resultSheet = workbook.Sheets[METHOD2_RESULT_SHEET];
  if (!resultSheet) return null;

  const hallRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(resultSheet, { defval: null });
  const halls = hallRows.map(readHall).filter((h) => h.hallName !== "");
  if (!halls.length) return null;

  const candidateSheet = workbook.Sheets[METHOD2_CANDIDATE_SHEET];
  const candidates = candidateSheet
    ? XLSX.utils
        .sheet_to_json<Record<string, unknown>>(candidateSheet, { defval: null })
        .map(readCandidate)
        .filter((c) => c.hallName !== "")
    : [];

  return { datasetId, halls, candidates };
}
