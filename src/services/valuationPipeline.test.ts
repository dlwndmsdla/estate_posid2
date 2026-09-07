/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, test } from "bun:test";
import { runValuationPipeline } from "./rentalCalculationEngine";
import type { RawListing } from "../types/dataset";

/**
 * 매물 한 건. 전용률을 실제로 갖고 있는 알스퀘어 행을 흉내 낸다.
 * 전용 50㎡ / 임대 100㎡ = 전용률 0.5.
 */
function listing(i: number, rentPerExclusive: number, buildingName: string): RawListing {
  return {
    id: `l${i}`,
    datasetId: "T",
    rowNumber: i,
    source: "알스퀘어",
    listingId: `L${i}`,
    crawledDate: "2026-09-01",
    region: "서울",
    zone: "당산_문래",
    address: "",
    buildingName,
    primaryUse: "업무시설",
    completionYear: 2021,
    grossArea: 20000,
    leaseArea: 50,
    exclusiveArea: 50,
    exclusiveAreaSqm: 50,
    contractAreaSqm: 100,
    deposit: 0,
    monthlyRent: 0,
    maintenanceFee: 0,
    subwayDistance: 100,
    rentPerExclusiveSqmWon: rentPerExclusive,
  };
}

describe("runValuationPipeline — 전용률을 매물에서 구한다", () => {
  /**
   * 예전에 2단계 "산정 실행"과 3단계 즉석 계산이 타던 옛 경로는 전용률을
   * 전국 일괄 62%로 놓았다. 전용률 0.5 인 매물이면 그 경로는 6,200원,
   * 정식 경로는 5,000원이 나온다 — 24% 차이다.
   */
  test("전용단가 10,000원 · 전용률 0.5 이면 계약단가는 5,000원 (62% 아님)", () => {
    const raws = [1, 2, 3].map((i) => listing(i, 10000, `건물${i}`));

    const { buildingMedians, efficiencyTable } = runValuationPipeline(raws, "T");

    expect(efficiencyTable.isInitialDefaultUsed).toBe(false);
    buildingMedians.forEach((b) => {
      expect(b.buildingMedianRent).toBe(5000);
      expect(b.buildingMedianRent).not.toBe(6200);
    });
  });

  test("임대(계약)면적이 없으면 저장된 기준 전용률표로 물러난다", () => {
    const raws = [1, 2, 3].map((i) => {
      const l = listing(i, 10000, `건물${i}`);
      delete l.contractAreaSqm;
      return l;
    });

    expect(runValuationPipeline(raws, "T").efficiencyTable.isInitialDefaultUsed).toBe(true);
  });

  test("건물별 중앙값과 보정계수가 같은 실행에서 나온다", () => {
    const raws = [1, 2, 3, 4, 5].map((i) => listing(i, 10000 + i * 1000, `건물${i}`));
    const { buildingMedians, results } = runValuationPipeline(raws, "T");

    expect(buildingMedians).toHaveLength(5);
    const 당산 = results.find((r) => r.buildingId === "dangsan")!;
    // 지역 건물 중앙값 = 전용단가 13,000 × 전용률 0.5 = 6,500
    expect(당산.baseRegionalRent).toBe(6500);
  });
});
