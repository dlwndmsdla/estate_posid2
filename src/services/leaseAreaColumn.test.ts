/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, test } from "bun:test";
import { findColumnIndexWithPriority, normalizeHeader, HEADER_ALIASES } from "./excelEngine";

/**
 * 분기 발송본의 임대(계약)면적 열을 이 앱이 실제로 알아보는지 본다.
 *
 * 왜 시험까지 두나 — 이 열 하나로 전용률표가 갈린다. 열을 못 찾으면 매물마다
 * 실측 전용률을 구할 수 없어, 앱이 2026-06-29 표본으로 만든 저장 기준표를
 * 계속 쓴다(rentalCalculationEngine 의 INITIAL_DEFAULT_EFFICIENCY_RATES).
 * 화면에는 숫자가 그대로 나오므로 눈으로는 티가 안 난다.
 *
 * 헤더 문자열은 rent-pipeline/integrate/r5_t1_integrate.py 의 49열 정의를 그대로
 * 옮긴 것이다. 파이프라인이 열 이름을 바꾸면 여기서 먼저 깨진다.
 */
describe("분기 발송본 49열 — 임대(계약)면적", () => {
  const 발송본_49열_헤더 = "임대(계약)면적\n(㎡)";

  test("줄바꿈과 괄호가 섞인 실제 헤더를 알아본다", () => {
    const headers = [
      ...Array(48).fill("기타"),
      발송본_49열_헤더,
    ].map(normalizeHeader);

    const idx = findColumnIndexWithPriority(headers, HEADER_ALIASES.contractAreaSqm);
    expect(idx).toBe(48);
  });

  test("앞쪽 앵커 열(임대면적이 이름에 들어간다)을 잘못 집지 않는다", () => {
    const headers = [
      ...Array(44).fill("기타"),
      "앵커 임대료\n(원/㎡·월, 임대면적)",
      "적용 전용률",
      "전용률 기준",
      "앵커대비 배율",
      발송본_49열_헤더,
    ].map(normalizeHeader);

    expect(findColumnIndexWithPriority(headers, HEADER_ALIASES.contractAreaSqm)).toBe(48);
  });

  test("열이 없으면 -1 — 저장 기준표로 물러난다는 뜻이다", () => {
    const headers = Array(48).fill("기타").map(normalizeHeader);
    expect(findColumnIndexWithPriority(headers, HEADER_ALIASES.contractAreaSqm)).toBe(-1);
  });
});
