/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 우체국보험회관 5곳의 고정 사실 — 단일 출처.
 *
 * 왜 한 곳으로 모았나 — 같은 명단이 세 군데에 따로 적혀 있었다.
 *   · prdDataset.ts `activeBuildingsInfo` — 주소·상권·전용률 (화면용)
 *   · rentalCalculationEngine.ts `HALL_SPECS` — 연면적·준공연도 (산정용)
 *   · calculateHallComparison 안의 지역 배열 — 주소·실거래가 (환산표용)
 *
 * 세 벌이라 실제로 어긋나 있었다: 대구회관 주소가 "남구 명덕로 104"(화면)와
 * "남구 중앙대로 200"(환산표)로 갈렸고, 환산표에는 당산회관이 아예 빠져 4곳만
 * 나왔다. 아래 값이 유일한 출처다 — 다른 파일에서 다시 적지 말 것.
 *
 * 회관 실거래 임대료는 담당자가 화면에서 고칠 수 있는 값이라 여기 두지 않는다
 * (services/actualContractStore.ts).
 */
export interface HallSpec {
  /** 데이터셋·산정 결과에서 회관을 가리키는 키. */
  buildingId: string;
  buildingName: string;
  /** 화면에서 쓰는 짧은 이름. region 과 다르다 — 서울 회관 둘을 구분한다. */
  shortName: string;
  /** 시·도. 지역 기준군을 고를 때 쓴다. */
  region: string;
  /** 산정 권역 키. 매물 데이터의 권역 라벨과 같아야 한다. */
  zone: string;
  /** 화면 표기용 상권명. zone 과 달리 계산에는 쓰지 않는다. */
  tradeArea: string;
  roadAddress: string;
  grossArea: number;
  builtYear: number;
  /** 회관 건물 자체의 전용률(%). 매물 전용률표와는 다른 값이다. */
  efficiencyRate: number;
  useType: string;
}

export const HALLS: HallSpec[] = [
  {
    buildingId: "dangsan",
    buildingName: "당산 우체국보험회관",
    shortName: "당산",
    region: "서울",
    zone: "당산_문래",
    tradeArea: "영등포·당산 상권",
    roadAddress: "서울특별시 영등포구 선유동2로 6",
    grossArea: 23573.93,
    builtYear: 2021,
    efficiencyRate: 48.87,
    useType: "업무시설",
  },
  {
    buildingId: "yeongdeungpo",
    buildingName: "영등포 우체국보험회관",
    shortName: "영등포",
    region: "서울",
    zone: "영등포",
    tradeArea: "영등포역 상권",
    roadAddress: "서울특별시 영등포구 영등포동4가 425-2",
    grossArea: 14476.76,
    builtYear: 1988,
    efficiencyRate: 51.67,
    useType: "업무시설",
  },
  {
    buildingId: "busan",
    buildingName: "부산 우체국보험회관",
    shortName: "부산",
    region: "부산",
    zone: "중구_남포중앙동",
    tradeArea: "부산 중구 상권",
    roadAddress: "부산광역시 중구 중앙대로 63",
    grossArea: 33148.77,
    builtYear: 1989,
    efficiencyRate: 60.0,
    useType: "업무시설",
  },
  {
    buildingId: "daegu",
    buildingName: "대구 우체국보험회관",
    shortName: "대구",
    region: "대구",
    zone: "중구남구_도심",
    tradeArea: "대구 남구 상권",
    roadAddress: "대구광역시 남구 중앙대로 200",
    grossArea: 22894.63,
    builtYear: 2003,
    efficiencyRate: 41.0,
    useType: "업무시설",
  },
  {
    buildingId: "gwangju",
    buildingName: "광주 우체국보험회관",
    shortName: "광주",
    region: "광주",
    zone: "서구_상무",
    tradeArea: "광주 서구 상권",
    roadAddress: "광주광역시 서구 상무중앙로 110",
    // 24,200㎡ · 2008년으로 적혀 있었으나 둘 다 틀렸다. 소유주(자사) 공표 제원과
    // 방법1 검증 스크립트가 모두 31,456㎡ · 2009년이고, 같은 파일에 남아 있던
    // 전용률 53.2% 도 16,702 ÷ 31,456 = 53.1% 로 이 값에서 나온 것이다.
    // 규모 구분은 24,200 이나 31,456 이나 "중형"(9,917~33,058㎡)이라 보정계수는 그대로다.
    grossArea: 31456.11,
    builtYear: 2009,
    efficiencyRate: 53.2,
    useType: "업무시설",
  },
];
