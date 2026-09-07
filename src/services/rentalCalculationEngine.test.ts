/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, test } from "bun:test";
import { CALC_ENGINE_VERSION, calculateAdjustmentFactors } from "./rentalCalculationEngine";
import type { BuildingMedian } from "../types/dataset";

/** 테스트용 건물 중앙값 한 건. 계산에 쓰이는 5개 필드만 지정하면 된다. */
function bldg(
  region: string,
  zone: string,
  rent: number,
  grossArea = 20000,
  completionYear = 2021,
  name = `${zone}-${rent}`
): BuildingMedian {
  return {
    datasetId: "T",
    buildingId: `b-${name}`,
    buildingName: name,
    normalizedAddress: "",
    region,
    zone,
    primaryUse: "업무시설",
    completionYear,
    grossArea,
    subwayDistance: 100,
    validListingCount: 1,
    buildingMedianRent: rent,
    buildingMedianDeposit: 0,
    buildingMedianMaintenance: 0,
  };
}

const 당산 = (rs: BuildingMedian[]) =>
  calculateAdjustmentFactors(rs, "T").find((r) => r.buildingId === "dangsan")!;

describe("calculateAdjustmentFactors — 업로드 데이터에서 산출", () => {
  test("지역 기준단가는 같은 지역 건물 중앙값이다", () => {
    const rows = [10000, 12000, 14000, 16000, 18000].map((r) =>
      bldg("서울", "여의도", r)
    );

    expect(당산(rows).baseRegionalRent).toBe(14000);
  });

  test("업로드 파일이 바뀌면 기준단가도 바뀐다", () => {
    const a = [10000, 12000, 14000, 16000, 18000].map((r) => bldg("서울", "여의도", r));
    const b = [20000, 22000, 24000, 26000, 28000].map((r) => bldg("서울", "여의도", r));

    expect(당산(a).baseRegionalRent).not.toBe(당산(b).baseRegionalRent);
  });

  test("권역 보정계수는 권역 중앙값 ÷ 지역 중앙값이다", () => {
    // 지역 중앙값 10,000 / 당산_문래 권역 중앙값 12,000 -> 1.200
    const rows = [
      ...[11000, 11500, 12000, 12500, 13000].map((r) => bldg("서울", "당산_문래", r)),
      ...[7000, 7500, 8000, 8500, 9000].map((r) => bldg("서울", "여의도", r)),
    ];

    const zone = 당산(rows).zoneFactorDetail;
    expect(당산(rows).baseRegionalRent).toBe(10000);
    expect(zone.observedFactor).toBe(1.2);
    expect(zone.appliedFactor).toBe(1.2);
    expect(zone.sampleCount).toBe(5);
  });

  test("권역 표본이 5건 미만이면 중립값 1.000을 쓴다", () => {
    const rows = [
      ...[12000, 12000, 12000, 12000].map((r) => bldg("서울", "당산_문래", r)), // 4건
      ...[8000, 8000, 8000, 8000, 8000, 8000].map((r) => bldg("서울", "여의도", r)),
    ];

    const zone = 당산(rows).zoneFactorDetail;
    expect(zone.sampleCount).toBe(4);
    expect(zone.appliedFactor).toBe(1.0);
    expect(zone.appliedStatus).toBe("미적용");
    expect(zone.observedFactor).not.toBe(1.0); // 관측값 자체는 보존한다
  });

  test("권역 IQR이 중앙값의 15%를 넘으면 중립값 1.000을 쓴다", () => {
    // 표본 6건이지만 흩어짐이 커서 게이트에 걸린다
    const rows = [
      ...[2000, 4000, 6000, 14000, 16000, 18000].map((r) => bldg("서울", "당산_문래", r)),
      ...[8000, 8000, 8000, 8000, 8000, 8000].map((r) => bldg("서울", "여의도", r)),
    ];

    const zone = 당산(rows).zoneFactorDetail;
    expect(zone.sampleCount).toBe(6);
    expect(zone.iqrRatioPercent!).toBeGreaterThan(15);
    expect(zone.appliedFactor).toBe(1.0);
  });

  test("연면적이 없는 건물은 규모 비교군에 들어가지 않는다", () => {
    // 당산회관 23,573.93㎡ = '중'. 연면적 0인 건물은 규모군에서 빠져야 한다.
    const rows = [
      ...[10000, 10000, 10000, 10000, 10000].map((r) => bldg("서울", "당산_문래", r, 20000)),
      ...[99999, 99999, 99999].map((r) => bldg("서울", "당산_문래", r, 0)),
    ];

    const size = 당산(rows).sizeFactorDetail;
    expect(size.sampleCount).toBe(5); // 연면적 0인 3건 제외
    expect(size.targetGroupMedian).toBe(10000);
  });

  test("규모 비교군이 비면 권역 비교군을 그대로 쓴다", () => {
    // 권역 건물이 전부 '소'(9,917㎡ 미만) — 당산회관의 '중'과 일치하는 건물이 없다
    const rows = [10000, 10000, 10000, 10000, 10000].map((r) =>
      bldg("서울", "당산_문래", r, 5000)
    );

    const size = 당산(rows).sizeFactorDetail;
    expect(size.sampleCount).toBe(5);
    expect(size.observedFactor).toBe(1.0); // 권역군과 같은 집합 -> 비율 1
  });

  test("연식 비교군은 준공연도 ±5년이다", () => {
    // 당산회관 2021년 준공 -> 2016~2026년만 대상
    const rows = [
      ...[10000, 10000, 10000, 10000, 10000].map((r) =>
        bldg("서울", "당산_문래", r, 20000, 2020)
      ),
      ...[50000, 50000, 50000].map((r) => bldg("서울", "당산_문래", r, 20000, 1990)),
    ];

    const age = 당산(rows).ageFactorDetail;
    expect(age.sampleCount).toBe(5);
    expect(age.ageRangeStr).toBe("2016~2026년 준공");
  });

  test("해당 지역에 건물이 없으면 숫자를 지어내지 않는다", () => {
    const rows = [10000, 10000, 10000].map((r) => bldg("부산", "중구_남포중앙동", r));

    const r = 당산(rows); // 서울 표본 0건
    expect(r.baseRegionalRent).toBe(0);
    expect(r.finalRent).toBe(0);
    expect(r.zoneFactorDetail.sampleCount).toBe(0);
  });

  test("최종 단가 = 기준단가 × 적용계수 곱", () => {
    const rows = [
      ...[12000, 12000, 12000, 12000, 12000].map((r) =>
        bldg("서울", "당산_문래", r, 20000, 2020)
      ),
      ...[10000, 10000, 10000, 10000, 10000].map((r) => bldg("서울", "여의도", r)),
    ];

    const r = 당산(rows);
    const expected = Math.round(r.baseRegionalRent * r.appliedFactors.total);
    expect(r.finalRent).toBe(expected);
    expect(r.recommendedRent).toBe(expected);
  });

  // 저장된 결과를 다시 계산할지 판단하는 근거가 이 도장이다(db/repository.ts).
  // 도장이 안 찍히면 옛 엔진 산출이 영원히 갱신되지 않는다.
  test("산정 결과에 현재 엔진 판이 찍힌다", () => {
    const rows = [...Array(5)].map(() => bldg("서울", "당산_문래", 12000));
    expect(당산(rows).calculationVersion).toBe(CALC_ENGINE_VERSION);
  });
});
