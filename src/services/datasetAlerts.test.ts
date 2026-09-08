/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, test } from "bun:test";
import { buildDataQualityAlerts } from "./datasetAlerts";
import type { CleanedListing } from "../types/dataset";

/** 정상 매물 한 건. 검사하려는 항목만 덮어쓴다. */
function listing(over: Partial<CleanedListing> = {}): CleanedListing {
  const base: CleanedListing = {
    id: "id",
    datasetId: "T",
    rowNumber: 1,
    source: "알스퀘어",
    listingId: "RS-1",
    crawledDate: "2026-06-30",
    region: "서울",
    zone: "영등포",
    address: "서울특별시 영등포구 양평로 21",
    roadAddress: "서울특별시 영등포구 양평로 21",
    buildingName: "샘플오피스",
    primaryUse: "업무시설",
    completionYear: 2005,
    builtYear: 2005,
    grossArea: 18500,
    grossFloorAreaSqm: 18500,
    leaseArea: 200,
    exclusiveArea: 105,
    exclusiveAreaSqm: 105,
    contractAreaSqm: 200,
    deposit: 520,
    monthlyRent: 52,
    maintenanceFee: 10,
    subwayDistance: 300,
    rentConversionRate: 0.056,
    validation: { isValid: true, errorCodes: [], warningCodes: [] },
    eligibility: {
      validForContractConversion: true,
      validForRegionalBaseRent: true,
      validForZoneAdjustment: true,
      validForSizeAdjustment: true,
      validForAgeAdjustment: true,
      validForEfficiencyRateSample: true,
    },
    rentPerExclusiveArea: 49523,
    depositPerSqm: 495238,
    maintenancePerSqm: 9523,
    isDuplicate: false,
    isOutlier: false,
    excludeFromCalculation: false,
  };
  return { ...base, ...over };
}

/** 지정한 id 의 경고를 찾는다. */
function pick(alerts: ReturnType<typeof buildDataQualityAlerts>, id: string) {
  return alerts.find((a) => a.id === id);
}

describe("전월세전환율", () => {
  test("지역마다 전환율이 다르면 단일값 경고가 없다", () => {
    const alerts = buildDataQualityAlerts([
      listing({ region: "서울", rentConversionRate: 0.052 }),
      listing({ region: "부산", rentConversionRate: 0.061 }),
      listing({ region: "대구", rentConversionRate: 0.058 }),
    ]);

    expect(pick(alerts, "conversion-rate-uniform")).toBeUndefined();
  });

  test("모든 지역이 같은 전환율이면 지역 수를 건수로 경고한다", () => {
    const alerts = buildDataQualityAlerts([
      listing({ region: "서울", rentConversionRate: 0.056 }),
      listing({ region: "부산", rentConversionRate: 0.056 }),
      listing({ region: "대구", rentConversionRate: 0.056 }),
      listing({ region: "광주", rentConversionRate: 0.056 }),
    ]);

    const a = pick(alerts, "conversion-rate-uniform");
    expect(a?.level).toBe("경고");
    expect(a?.count).toBe(4);
    expect(a?.countUnit).toBe("개 지역");
    expect(a?.detail).toContain("5.6%");
  });
});

describe("산정 제외 매물", () => {
  test("제외 건수와 전체 건수, 사유를 문구에 담는다", () => {
    const alerts = buildDataQualityAlerts([
      listing(),
      listing(),
      listing({
        excludeFromCalculation: true,
        validation: { isValid: false, errorCodes: ["RENT_LE_ZERO"], warningCodes: [] },
      }),
    ]);

    const a = pick(alerts, "excluded-rows");
    expect(a?.count).toBe(1);
    expect(a?.detail).toContain("3건");
    expect(a?.detail).toContain("월세 0 이하");
  });

  test("제외가 없으면 항목 자체가 없다", () => {
    const alerts = buildDataQualityAlerts([listing(), listing()]);

    expect(pick(alerts, "excluded-rows")).toBeUndefined();
  });
});

describe("빌딩명 결측", () => {
  test("결측 비율이 30%를 넘으면 경고, 고유 건물 수를 함께 센다", () => {
    const alerts = buildDataQualityAlerts([
      listing({ buildingName: "A빌딩" }),
      listing({ buildingName: "" }),
      listing({ buildingName: "미지정 건물" }),
      listing({ buildingName: "" }),
    ]);

    const a = pick(alerts, "building-name-missing");
    expect(a?.level).toBe("경고");
    expect(a?.count).toBe(3);
    expect(a?.detail).toContain("1곳");
  });

  test("산정이 실제로 묶은 건물 그룹 수가 있으면 그 값을 문구에 쓴다", () => {
    const alerts = buildDataQualityAlerts(
      [listing({ buildingName: "A빌딩" }), listing({ buildingName: "" })],
      { buildingCount: 354 }
    );

    expect(pick(alerts, "building-name-missing")?.detail).toContain("354개동");
  });

  test("결측 비율이 낮으면 정보 등급으로 낮춘다", () => {
    const alerts = buildDataQualityAlerts([
      ...Array.from({ length: 9 }, (_, i) => listing({ buildingName: `B${i}빌딩` })),
      listing({ buildingName: "" }),
    ]);

    expect(pick(alerts, "building-name-missing")?.level).toBe("정보");
  });
});

describe("보정 표본 결측", () => {
  test("연면적이 없는 행은 규모 보정 표본 경고로 잡힌다", () => {
    const alerts = buildDataQualityAlerts([
      listing({ grossFloorAreaSqm: 0, grossArea: 0 }),
      listing({ grossFloorAreaSqm: 0, grossArea: 0 }),
      listing(),
    ]);

    const a = pick(alerts, "gross-area-missing");
    expect(a?.level).toBe("경고");
    expect(a?.count).toBe(2);
  });

  test("준공연도가 없는 행은 연식 보정 표본 경고로 잡힌다", () => {
    const alerts = buildDataQualityAlerts([
      listing({ builtYear: 0, completionYear: 0 }),
      listing({ builtYear: 0, completionYear: 0 }),
      listing(),
    ]);

    expect(pick(alerts, "built-year-missing")?.count).toBe(2);
  });

  test("임대면적이 없으면 전용률을 실측 못 한다는 항목이 뜬다", () => {
    const alerts = buildDataQualityAlerts([
      listing({ contractAreaSqm: 0 }),
      listing({ contractAreaSqm: 0 }),
      listing(),
    ]);

    const a = pick(alerts, "contract-area-missing");
    expect(a?.count).toBe(2);
    expect(a?.detail).toContain("중앙값");
  });
});

describe("전체", () => {
  test("결측도 제외도 없고 전환율이 지역별로 다르면 빈 목록이다", () => {
    const alerts = buildDataQualityAlerts([
      listing({ region: "서울", rentConversionRate: 0.052 }),
      listing({ region: "부산", rentConversionRate: 0.061 }),
    ]);

    expect(alerts).toEqual([]);
  });

  test("매물이 없으면 빈 목록이다", () => {
    expect(buildDataQualityAlerts([])).toEqual([]);
  });

  test("경고가 정보보다 먼저 온다", () => {
    const alerts = buildDataQualityAlerts([
      // 연면적 결측 2/3 → 경고 / 빌딩명 결측 1/3 은 30% 초과라 경고가 되지 않게 10건으로 희석
      ...Array.from({ length: 8 }, () => listing({ grossFloorAreaSqm: 0, grossArea: 0 })),
      listing({ buildingName: "" }),
      listing(),
    ]);

    const levels = alerts.map((a) => a.level);
    expect(levels.indexOf("경고")).toBeLessThan(levels.lastIndexOf("정보"));
  });
});
