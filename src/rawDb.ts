/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RawCrawledBuilding {
  id: string;
  name: string;
  address: string;
  city: string; // 당산, 영등포, 부산, 대구, 광주
  builtYear: number;
  grossAreaSqm: number; // 연면적 (m²)
  useType: string; // 용도
  depositPerSqm: number; // m²당 보증금 (만원)
  monthlyRentPerSqm: number; // m²당 월세 (만원)
  maintenancePerSqm: number; // m²당 관리비 (만원)
  source: "알스퀘어" | "네모" | "실거래가"; // 출처
  crawledAt: string; // 데이터 최신 반영일
}

export const rawCrawledDataset: RawCrawledBuilding[] = [
  // 당산 권역
  {
    id: "raw-ds-1",
    name: "영등포 생각공장 당산",
    address: "서울특별시 영등포구 당산동 121-1",
    city: "당산",
    builtYear: 2022,
    grossAreaSqm: 42150,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 37.8, // 125만원 / 3.3058
    monthlyRentPerSqm: 3.63, // 12.0만원 / 3.3058
    maintenancePerSqm: 1.21, // 4.0만원 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-18",
  },
  {
    id: "raw-ds-2",
    name: "코오롱 디지털타워 당산",
    address: "서울특별시 영등포구 선유동3로 15",
    city: "당산",
    builtYear: 2002,
    grossAreaSqm: 15800,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 29.65, // 98만원 / 3.3058
    monthlyRentPerSqm: 2.9, // 9.6만원 / 3.3058
    maintenancePerSqm: 0.97, // 3.2만원 / 3.3058
    source: "네모",
    crawledAt: "2026-06-17",
  },
  {
    id: "raw-ds-3",
    name: "당산 현대지식산업센터",
    address: "서울특별시 영등포구 당산동5가 9",
    city: "당산",
    builtYear: 2011,
    grossAreaSqm: 31200,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 33.27, // 110만 / 3.3058
    monthlyRentPerSqm: 3.27, // 10.8만 / 3.3058
    maintenancePerSqm: 1.06, // 3.5만 / 3.3058
    source: "실거래가",
    crawledAt: "2026-06-15",
  },
  {
    id: "raw-ds-4",
    name: "당산 리버타워 오피스",
    address: "서울특별시 영등포구 당산로 241",
    city: "당산",
    builtYear: 1999,
    grossAreaSqm: 8900,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 27.22, // 90만 / 3.3058
    monthlyRentPerSqm: 2.66, // 8.8만 / 3.3058
    maintenancePerSqm: 0.91, // 3.0만 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-18",
  },

  // 영등포 권역
  {
    id: "raw-ydp-1",
    name: "영등포 타임스퀘어 오피스A",
    address: "서울특별시 영등포구 영중로 15",
    city: "영등포",
    builtYear: 2009,
    grossAreaSqm: 58400,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 40.84, // 135만 / 3.3058
    monthlyRentPerSqm: 3.87, // 12.8만 / 3.3058
    maintenancePerSqm: 1.27, // 4.2만 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-19",
  },
  {
    id: "raw-ydp-2",
    name: "교보생명 영등포사옥",
    address: "서울특별시 영등포구 영등포로 188",
    city: "영등포",
    builtYear: 1995,
    grossAreaSqm: 19500,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 30.25, // 100만 / 3.3058
    monthlyRentPerSqm: 2.96, // 9.8만 / 3.3058
    maintenancePerSqm: 0.97, // 3.2만 / 3.3058
    source: "실거래가",
    crawledAt: "2026-06-16",
  },
  {
    id: "raw-ydp-3",
    name: "영등포 리드원 지식산업센터",
    address: "서울특별시 영등포구 국회대로 48",
    city: "영등포",
    builtYear: 2013,
    grossAreaSqm: 24100,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 33.27, // 110만 / 3.3058
    monthlyRentPerSqm: 3.18, // 10.5만 / 3.3058
    maintenancePerSqm: 1.09, // 3.6만 / 3.3058
    source: "네모",
    crawledAt: "2026-06-17",
  },
  {
    id: "raw-ydp-4",
    name: "에이스 하이테크시티 영등포",
    address: "서울특별시 영등포구 경인로 775",
    city: "영등포",
    builtYear: 2010,
    grossAreaSqm: 94600,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 28.74, // 95만 / 3.3058
    monthlyRentPerSqm: 2.78, // 9.2만 / 3.3058
    maintenancePerSqm: 0.94, // 3.1만 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-18",
  },

  // 부산 권역
  {
    id: "raw-bs-1",
    name: "부산무역회관",
    address: "부산광역시 중구 충장대로 9",
    city: "부산",
    builtYear: 2012,
    grossAreaSqm: 27800,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 18.15, // 60만 / 3.3058
    monthlyRentPerSqm: 1.75, // 5.8만 / 3.3058
    maintenancePerSqm: 0.7, // 2.3만 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-18",
  },
  {
    id: "raw-bs-2",
    name: "교보생명 부산역사옥",
    address: "부산광역시 동구 중앙대로 240",
    city: "부산",
    builtYear: 1998,
    grossAreaSqm: 31500,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 15.12, // 50만 / 3.3058
    monthlyRentPerSqm: 1.45, // 4.8만 / 3.3058
    maintenancePerSqm: 0.6, // 2.0만 / 3.3058
    source: "실거래가",
    crawledAt: "2026-06-14",
  },
  {
    id: "raw-bs-3",
    name: "한진부산종합사옥",
    address: "부산광역시 중구 충장대로 12",
    city: "부산",
    builtYear: 2006,
    grossAreaSqm: 41200,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 16.64, // 55만 / 3.3058
    monthlyRentPerSqm: 1.57, // 5.2만 / 3.3058
    maintenancePerSqm: 0.64, // 2.1만 / 3.3058
    source: "네모",
    crawledAt: "2026-06-16",
  },
  {
    id: "raw-bs-4",
    name: "중앙빌딩",
    address: "부산광역시 중구 대교로 112",
    city: "부산",
    builtYear: 2000,
    grossAreaSqm: 14500,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 13.91, // 46만 / 3.3058
    monthlyRentPerSqm: 1.3, // 4.3만 / 3.3058
    maintenancePerSqm: 0.54, // 1.8만 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-19",
  },

  // 대구 권역
  {
    id: "raw-dg-1",
    name: "대구 행정종합빌딩",
    address: "대구광역시 남구 중앙대로 180",
    city: "대구",
    builtYear: 2010,
    grossAreaSqm: 8600,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 13.61, // 45만 / 3.3058
    monthlyRentPerSqm: 1.27, // 4.2만 / 3.3058
    maintenancePerSqm: 0.54, // 1.8만 / 3.3058
    source: "네모",
    crawledAt: "2026-06-17",
  },
  {
    id: "raw-dg-2",
    name: "삼성생명 대구남부사옥",
    address: "대구광역시 남구 명덕로 104",
    city: "대구",
    builtYear: 1998,
    grossAreaSqm: 19500,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 11.5, // 38만 / 3.3058
    monthlyRentPerSqm: 1.09, // 3.6만 / 3.3058
    maintenancePerSqm: 0.45, // 1.5만 / 3.3058
    source: "실거래가",
    crawledAt: "2026-06-15",
  },
  {
    id: "raw-dg-3",
    name: "DGB대구은행 명덕지점",
    address: "대구광역시 남구 중앙대로 230",
    city: "대구",
    builtYear: 2005,
    grossAreaSqm: 12800,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 12.71, // 42만 / 3.3058
    monthlyRentPerSqm: 1.18, // 3.9만 / 3.3058
    maintenancePerSqm: 0.51, // 1.7만 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-18",
  },

  // 광주 권역
  {
    id: "raw-gj-1",
    name: "상무 현대해상 타워",
    address: "광주광역시 서구 상무중앙로 50",
    city: "광주",
    builtYear: 2007,
    grossAreaSqm: 28500,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 16.64, // 55만 / 3.3058
    monthlyRentPerSqm: 1.54, // 5.1만 / 3.3058
    maintenancePerSqm: 0.67, // 2.2만 / 3.3058
    source: "알스퀘어",
    crawledAt: "2026-06-19",
  },
  {
    id: "raw-gj-2",
    name: "광주 기독교방송국 빌딩",
    address: "광주광역시 서구 상무중앙로 84",
    city: "광주",
    builtYear: 2010,
    grossAreaSqm: 18600,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 15.73, // 52만 / 3.3058
    monthlyRentPerSqm: 1.48, // 4.9만 / 3.3058
    maintenancePerSqm: 0.64, // 2.1만 / 3.3058
    source: "실거래가",
    crawledAt: "2026-06-16",
  },
  {
    id: "raw-gj-3",
    name: "상무지구 대신증권 빌딩",
    address: "광주광역시 서구 상무중앙로 118",
    city: "광주",
    builtYear: 2000,
    grossAreaSqm: 21500,
    useType: "오피스 및 업무용 빌딩",
    depositPerSqm: 13.31, // 44만 / 3.3058
    monthlyRentPerSqm: 1.27, // 4.2만 / 3.3058
    maintenancePerSqm: 0.54, // 1.8만 / 3.3058
    source: "네모",
    crawledAt: "2026-06-17",
  },
  // 주용도 근생 예외 필터링 사례용 예시 데이터 추가 (이건 근생이라 AVM에서 필터링됨)
  {
    id: "raw-gj-4",
    name: "상무 센트럴스퀘어",
    address: "광주광역시 서구 상무번영로 42",
    city: "광주",
    builtYear: 2018,
    grossAreaSqm: 2450, // 3,300m² 미만 & 근린생활시설
    useType: "근린생활시설",
    depositPerSqm: 25.0,
    monthlyRentPerSqm: 2.8,
    maintenancePerSqm: 0.8,
    source: "네모",
    crawledAt: "2026-06-17",
  }
];
