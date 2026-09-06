/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, test } from "bun:test";
import { calculateHallComparison } from "./rentalCalculationEngine";
import type { EfficiencyRateTable, RegionalConvertedListing } from "../types/dataset";

const effTable: EfficiencyRateTable = {
  datasetId: "T",
  isInitialDefaultUsed: false,
  rows: [],
  overallMedian: 0.6,
  regionMedians: { 서울: 0.5, 부산: 0.5, 대구: 0.5, 광주: 0.5 },
  zoneMedians: {},
};

/** 지역·권역만 지정하면 되는 환산 매물 한 건. */
function listing(
  region: string,
  zone: string,
  exclusiveRent: number
): RegionalConvertedListing {
  return {
    source: "알스퀘어",
    listingId: `${region}-${zone}-${exclusiveRent}`,
    region,
    zone,
    exclusiveAreaSqm: 100,
    rentPerExclusiveSqmWon: exclusiveRent,
    regionEfficiencyRate: 0.5,
    zoneEfficiencyRate: 0.5,
    rentPerContractSqmByRegionWon: Math.round(exclusiveRent * 0.5),
    rentPerContractSqmByZoneWon: Math.round(exclusiveRent * 0.5),
    zoneRateFallbackUsed: false,
  };
}

const 서울회관 = (ls: RegionalConvertedListing[]) =>
  calculateHallComparison(effTable, ls).find((h) => h.hallName === "서울회관")!;

describe("calculateHallComparison — 업로드 매물에서 중앙값 산출", () => {
  test("지역 매물 중앙값은 그 지역 매물에서 나온다", () => {
    // 전용단가 10,000/20,000/30,000 -> 중앙값 20,000, 계약환산 10,000
    const ls = [10000, 20000, 30000].map((r) => listing("서울", "여의도", r));

    const h = 서울회관(ls);
    expect(h.regionExclMedianRentWon).toBe(20000);
    expect(h.regionListingsMedianRentWon).toBe(10000);
  });

  test("업로드 매물이 바뀌면 중앙값도 바뀐다", () => {
    const a = [10000, 20000, 30000].map((r) => listing("서울", "여의도", r));
    const b = [40000, 50000, 60000].map((r) => listing("서울", "여의도", r));

    expect(서울회관(a).regionListingsMedianRentWon).not.toBe(
      서울회관(b).regionListingsMedianRentWon
    );
  });

  test("권역 중앙값은 회관 권역 매물만 본다", () => {
    // 서울회관 권역 = 영등포
    const ls = [
      ...[6000, 8000, 10000].map((r) => listing("서울", "영등포", r)),
      ...[90000, 90000, 90000].map((r) => listing("서울", "여의도", r)),
    ];

    const h = 서울회관(ls);
    expect(h.zoneExclMedianRentWon).toBe(8000); // 여의도 90,000 은 섞이지 않는다
    expect(h.zoneListingsMedianRentWon).toBe(4000);
  });

  test("다른 지역 매물은 섞이지 않는다", () => {
    const ls = [
      ...[10000, 10000, 10000].map((r) => listing("서울", "영등포", r)),
      ...[99999, 99999, 99999].map((r) => listing("부산", "중구_남포중앙동", r)),
    ];

    expect(서울회관(ls).regionExclMedianRentWon).toBe(10000);
  });

  test("해당 지역 매물이 없으면 0을 돌려준다", () => {
    const ls = [10000, 10000].map((r) => listing("부산", "중구_남포중앙동", r));

    const h = 서울회관(ls);
    expect(h.regionListingsMedianRentWon).toBe(0);
    expect(h.zoneListingsMedianRentWon).toBe(0);
  });
});
