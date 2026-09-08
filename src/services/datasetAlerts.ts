/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CleanedListing } from "../types/dataset";

/**
 * 이번 분기 매물 데이터에서 담당자가 알아야 할 항목을 뽑는다.
 *
 * 예전에는 종합 대시보드의 "주요 경고 및 검토사항" 표가 통째로 고정 문구였다 —
 * 건수(3건·755건·11건·994건)까지 소스에 박혀 있어 어떤 분기 엑셀을 올려도 같은 네 줄이 떴다.
 * "주변역·거리 컬럼 스왑 755건"은 이 앱이 주변역 컬럼을 읽지도 교정하지도 않으므로
 * 근거가 없어 뺐다.
 *
 * 여기서는 실제로 걸린 것만 만든다. 아무것도 안 걸리면 빈 목록이다.
 */

export type AlertLevel = "경고" | "정보";

export interface DataQualityAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  count: number;
  countUnit: string;
  action: string;
}

/** 검증 오류 코드를 담당자가 읽을 수 있는 말로 바꾼다. */
const ERROR_LABELS: Record<string, string> = {
  MISSING_LISTING_ID: "매물번호 없음",
  MISSING_SOURCE: "출처 없음",
  MISSING_REGION: "지역 없음",
  EXCLUSIVE_AREA_LE_ZERO: "전용면적 0 이하",
  RENT_LE_ZERO: "월세 0 이하 (전세·매매 등)",
  DUPLICATE_LISTING_ID: "매물번호 중복",
};

function pct(n: number, total: number): string {
  return total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
}

/** 가장 많이 나온 값. 동수면 먼저 나온 값. */
function mode<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best: T | undefined;
  let bestCount = 0;
  counts.forEach((c, v) => {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  });
  return best;
}

const grossAreaOf = (l: CleanedListing) => l.grossFloorAreaSqm ?? l.grossArea ?? 0;
const builtYearOf = (l: CleanedListing) => l.builtYear ?? l.completionYear ?? 0;
const isNameMissing = (l: CleanedListing) =>
  !l.buildingName?.trim() || l.buildingName === "미지정 건물";

/**
 * 지역별 전월세전환율이 사실상 한 값인지 본다.
 * 전환율은 보증금을 월세로 바꿀 때 쓰는 이자율 같은 값이라, 지역마다 다른데
 * 하나로 뭉뚱그리면 보증금 비중이 큰 매물일수록 단가가 실제와 벌어진다.
 */
function conversionRateAlert(listings: CleanedListing[]): DataQualityAlert | null {
  const byRegion = new Map<string, number[]>();
  listings.forEach((l) => {
    const rate = l.rentConversionRate ?? 0;
    if (!l.region || rate <= 0) return;
    byRegion.set(l.region, [...(byRegion.get(l.region) || []), rate]);
  });
  if (byRegion.size < 2) return null;

  const regionRates = new Map<string, number>();
  byRegion.forEach((rates, region) => {
    const m = mode(rates);
    if (m !== undefined) regionRates.set(region, m);
  });

  const shared = mode([...regionRates.values()]);
  if (shared === undefined) return null;

  const regions = [...regionRates.entries()].filter(([, r]) => r === shared).map(([r]) => r);
  if (regions.length < 2) return null;

  const ratePercent = (shared * 100).toFixed(1);
  return {
    id: "conversion-rate-uniform",
    level: "경고",
    title: `전월세전환율 단일값 적용 (${ratePercent}%)`,
    detail:
      `${regions.join("·")} ${regions.length}개 지역이 모두 같은 전환율 ${ratePercent}%로 계산됐습니다. ` +
      `지역별 공표치가 들어오면 보증금 비중이 큰 매물의 단가가 달라집니다.`,
    count: regions.length,
    countUnit: "개 지역",
    action: "부동산원 R-ONE 지역별 오피스 전월세전환율 확보",
  };
}

/** 검증에서 걸러져 월세 산정에 안 들어간 행. */
function excludedRowsAlert(listings: CleanedListing[]): DataQualityAlert | null {
  const excluded = listings.filter((l) => l.excludeFromCalculation);
  if (excluded.length === 0) return null;

  const reasonCounts = new Map<string, number>();
  excluded.forEach((l) =>
    l.validation.errorCodes.forEach((code) => {
      const label = ERROR_LABELS[code] ?? code;
      reasonCounts.set(label, (reasonCounts.get(label) || 0) + 1);
    })
  );
  const reasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, n]) => `${label} ${n}건`)
    .join(", ");

  const ratio = excluded.length / listings.length;
  return {
    id: "excluded-rows",
    level: ratio > 0.05 ? "경고" : "정보",
    title: "분석 조건 제외 매물 행",
    detail:
      `전체 ${listings.length.toLocaleString()}건 중 ${excluded.length.toLocaleString()}건` +
      `(${pct(excluded.length, listings.length)}%)이 월세 산정 대상에서 빠졌습니다.` +
      (reasons ? ` 사유: ${reasons}.` : ""),
    count: excluded.length,
    countUnit: "건",
    action: ratio > 0.05 ? "원본 시트에서 해당 행 확인 필요" : "제외 사유 투명 표기 (숨김 없음)",
  };
}

/**
 * 빌딩명이 없으면 건물 단위 집계를 PNU·주소에 의존하게 된다.
 * buildingCount 가 있으면 산정이 실제로 묶어 낸 건물 그룹 수를 쓴다 — 이름만 세는 것보다
 * 담당자가 알고 싶은 값에 가깝다.
 */
function buildingNameAlert(
  listings: CleanedListing[],
  buildingCount?: number
): DataQualityAlert | null {
  const missing = listings.filter(isNameMissing);
  if (missing.length === 0) return null;

  const named = listings.length - missing.length;
  const uniqueNames = new Set(
    listings.filter((l) => !isNameMissing(l)).map((l) => l.buildingName.trim())
  ).size;
  const ratio = missing.length / listings.length;

  const grouped =
    buildingCount && buildingCount > 0
      ? `이름이 있는 ${named.toLocaleString()}건 외에는 PNU·도로명주소로 묶어 ${buildingCount.toLocaleString()}개동이 됐습니다.`
      : `이름이 있는 ${named.toLocaleString()}건에서 확인된 건물은 ${uniqueNames.toLocaleString()}곳으로, 나머지는 주소·좌표로 묶습니다.`;

  return {
    id: "building-name-missing",
    level: ratio > 0.3 ? "경고" : "정보",
    title: "빌딩명 결측 · 주소 기반 건물 그룹핑",
    detail:
      `전체 ${listings.length.toLocaleString()}건 중 ${missing.length.toLocaleString()}건` +
      `(${pct(missing.length, listings.length)}%)에 빌딩명이 없습니다. ${grouped}`,
    count: missing.length,
    countUnit: "건",
    action: "건축물대장 주소 조인 강화",
  };
}

/** 연면적이 없으면 그 매물은 규모 보정계수 표본에서 빠진다. */
function grossAreaAlert(listings: CleanedListing[]): DataQualityAlert | null {
  const missing = listings.filter((l) => grossAreaOf(l) <= 0);
  if (missing.length === 0) return null;
  const ratio = missing.length / listings.length;

  return {
    id: "gross-area-missing",
    level: ratio > 0.3 ? "경고" : "정보",
    title: "연면적 결측 — 규모 보정 표본 축소",
    detail:
      `${missing.length.toLocaleString()}건(${pct(missing.length, listings.length)}%)에 연면적이 없어 ` +
      `규모 보정계수 비교군에서 빠집니다. 표본이 5곳 미만이면 게이트가 계수를 1.000으로 되돌립니다.`,
    count: missing.length,
    countUnit: "건",
    action: "건축물대장 연면적 보강",
  };
}

/** 준공연도가 없으면 그 매물은 연식 보정계수 표본에서 빠진다. */
function builtYearAlert(listings: CleanedListing[]): DataQualityAlert | null {
  const missing = listings.filter((l) => builtYearOf(l) <= 0);
  if (missing.length === 0) return null;
  const ratio = missing.length / listings.length;

  return {
    id: "built-year-missing",
    level: ratio > 0.3 ? "경고" : "정보",
    title: "준공연도 결측 — 연식 보정 표본 축소",
    detail:
      `${missing.length.toLocaleString()}건(${pct(missing.length, listings.length)}%)에 준공연도가 없어 ` +
      `연식 보정계수 비교군에서 빠집니다.`,
    count: missing.length,
    countUnit: "건",
    action: "건축물대장 준공연도 보강",
  };
}

/**
 * 임대(계약)면적이 없으면 그 매물의 전용률(전용 ÷ 임대)을 실측할 수 없어
 * 권역·지역 중앙값 전용률로 대신 환산한다.
 */
function contractAreaAlert(listings: CleanedListing[]): DataQualityAlert | null {
  const missing = listings.filter((l) => (l.contractAreaSqm ?? 0) <= 0);
  if (missing.length === 0) return null;
  const ratio = missing.length / listings.length;

  return {
    id: "contract-area-missing",
    level: ratio > 0.5 ? "경고" : "정보",
    title: "임대면적 결측 — 전용률 실측 불가",
    detail:
      `${missing.length.toLocaleString()}건(${pct(missing.length, listings.length)}%)에 임대(계약)면적이 없어 ` +
      `매물별 실측 전용률 대신 권역·지역 중앙값 전용률로 계약단가를 환산합니다.`,
    count: missing.length,
    countUnit: "건",
    action: "통합 단계에서 임대공급면적 컬럼 적재",
  };
}

export interface AlertContext {
  /** 산정이 실제로 묶어 낸 건물 그룹 수 (aggregateBuildingMedians 결과). */
  buildingCount?: number;
}

export function buildDataQualityAlerts(
  listings: CleanedListing[],
  context: AlertContext = {}
): DataQualityAlert[] {
  if (listings.length === 0) return [];

  const checks = [
    conversionRateAlert(listings),
    excludedRowsAlert(listings),
    buildingNameAlert(listings, context.buildingCount),
    contractAreaAlert(listings),
    grossAreaAlert(listings),
    builtYearAlert(listings),
  ];

  const alerts = checks.filter((a): a is DataQualityAlert => a !== null);

  // 경고를 먼저, 그 안에서는 검사 순서를 유지한다.
  return [
    ...alerts.filter((a) => a.level === "경고"),
    ...alerts.filter((a) => a.level === "정보"),
  ];
}
