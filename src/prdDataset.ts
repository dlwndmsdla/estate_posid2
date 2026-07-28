/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PrdCandidateBuilding {
  id: string;
  name: string;
  address: string;
  city: string; // "당산", "영등포", "부산", "대구", "광주"
  tradeArea: string; // 한국부동산원 기준 상권명
  distanceMeters: number; // 거리
  grossAreaSqm: number; // 연면적
  builtYear: number;
  useType: string; // 용도 (예: "업무시설", "근린생활시설", "지식산업센터", "업무용 오피스텔", "순수상가", "아파트")
  actualOfficeRentable: boolean; // 실제 오피스 임차 가능 여부
  depositPerSqm: number; // m²당 보증금 (만원)
  monthlyRentPerSqm: number; // m²당 월세 (만원)
  maintenancePerSqm: number; // m²당 관리비 (만원)
  source: "네모" | "알스퀘어" | "실거래가";
  registeredDate: string;
  url: string;
  year: number;
  quarter: string; // "1Q" | "2Q" | "3Q" | "4Q"
}

export const activeBuildingsInfo = [
  {
    id: "dangsan",
    name: "당산 우체국보험회관",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    address: "서울특별시 영등포구 선유동2로 6",
    builtYear: 2021,
    grossAreaSqm: 23573.93, // 중형
    efficiencyRate: 48.87,
    useType: "업무시설",
    coordinates: { x: 34, y: 32 },
  },
  {
    id: "yeongdeungpo",
    name: "영등포 우체국보험회관",
    city: "영등포",
    tradeArea: "영등포역 상권",
    address: "서울특별시 영등포구 영등포동4가 425-2",
    builtYear: 1988,
    grossAreaSqm: 14476.76, // 중형
    efficiencyRate: 51.67,
    useType: "업무시설",
    coordinates: { x: 38, y: 35 },
  },
  {
    id: "busan",
    name: "부산 우체국보험회관",
    city: "부산",
    tradeArea: "부산 중구 상권",
    address: "부산광역시 중구 중앙대로 63",
    builtYear: 1989,
    grossAreaSqm: 33148.77, // 대형
    efficiencyRate: 60.0,
    useType: "업무시설",
    coordinates: { x: 74, y: 83 },
  },
  {
    id: "daegu",
    name: "대구 우체국보험회관",
    city: "대구",
    tradeArea: "대구 남구 상권",
    address: "대구광역시 남구 명덕로 104",
    builtYear: 2003,
    grossAreaSqm: 22894.63, // 중형
    efficiencyRate: 41.0,
    useType: "업무시설",
    coordinates: { x: 62, y: 64 },
  },
  {
    id: "gwangju",
    name: "광주 우체국보험회관",
    city: "광주",
    tradeArea: "광주 서구 상권",
    address: "광주광역시 서구 상무중앙로 110",
    builtYear: 2008,
    grossAreaSqm: 24200, // 중형
    efficiencyRate: 53.2,
    useType: "업무시설",
    coordinates: { x: 32, y: 72 },
  },
];

export const prdDataset: PrdCandidateBuilding[] = [
  // ==================== 당산 우체국보험회관 후보군 (영등포·당산 상권) ====================
  // 2026 2Q
  {
    id: "ds-c1-26-2q",
    name: "삼성생명 당산빌딩",
    address: "서울시 영등포구 양평로 21",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 520,
    grossAreaSqm: 18500, // 중형 
    builtYear: 2005,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 31.76, // 105만 / 3.3058
    monthlyRentPerSqm: 3.09, // 10.2만 / 3.3058
    maintenancePerSqm: 1.03, // 3.4만
    source: "알스퀘어",
    registeredDate: "2026-05-12",
    url: "https://www.rsquare.co.kr/property/ds1",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c2-26-2q",
    name: "당산 SK V1타워",
    address: "서울시 영등포구 선유서로 43",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 650,
    grossAreaSqm: 45200, // 대형
    builtYear: 2015,
    useType: "지식산업센터", // 4순위
    actualOfficeRentable: true,
    depositPerSqm: 37.81, // 125만
    monthlyRentPerSqm: 3.63, // 12만
    maintenancePerSqm: 1.21, // 4만
    source: "네모",
    registeredDate: "2026-06-02",
    url: "https://www.nemoapp.kr/office/ds2",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c3-26-2q",
    name: "당산역 지식산업센터",
    address: "서울시 영등포구 당산동5가 9",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 410,
    grossAreaSqm: 31200, // 중형
    builtYear: 2011,
    useType: "지식산업센터", // 4순위
    actualOfficeRentable: true,
    depositPerSqm: 33.27, // 110만
    monthlyRentPerSqm: 3.27, // 10.8만
    maintenancePerSqm: 1.06, // 3.5만
    source: "실거래가",
    registeredDate: "2026-05-20",
    url: "https://www.rtms.go.kr/ds3",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c4-26-2q",
    name: "코오롱 디지털타워",
    address: "서울시 영등포구 선유동3로 15",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 280,
    grossAreaSqm: 15800, // 중형
    builtYear: 2002,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 29.65, // 98만
    monthlyRentPerSqm: 2.90, // 9.6만
    maintenancePerSqm: 0.97, // 3.2만
    source: "알스퀘어",
    registeredDate: "2026-04-30",
    url: "https://www.rsquare.co.kr/property/ds4",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c5-26-2q",
    name: "당산동 한강포스빌",
    address: "서울시 영등포구 당산로 203",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 850,
    grossAreaSqm: 8200, // 소형
    builtYear: 2001,
    useType: "업무시설+근린생활시설", // 2순위
    actualOfficeRentable: true,
    depositPerSqm: 26.62, // 88만
    monthlyRentPerSqm: 2.54, // 8.4만
    maintenancePerSqm: 0.85, // 2.8만
    source: "네모",
    registeredDate: "2026-06-10",
    url: "https://www.nemoapp.kr/office/ds5",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c6-26-2q",
    name: "T타워 당산역",
    address: "서울시 영등포구 당산동6가 340",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 350,
    grossAreaSqm: 12200, // 중형
    builtYear: 2018,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 36.30, // 120만
    monthlyRentPerSqm: 3.48, // 11.5만
    maintenancePerSqm: 1.15, // 3.8만
    source: "알스퀘어",
    registeredDate: "2026-06-15",
    url: "https://www.rsquare.co.kr/property/ds6",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c7-26-2q",
    name: "태영빌딩 당산",
    address: "서울시 영등포구 선유로 125",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 920,
    grossAreaSqm: 5400, // 소형
    builtYear: 1996,
    useType: "제2종 근린생활시설", // 3순위 (사무실 임차가능)
    actualOfficeRentable: true,
    depositPerSqm: 24.20, // 80만
    monthlyRentPerSqm: 2.36, // 7.8만
    maintenancePerSqm: 0.79, // 2.6만
    source: "네모",
    registeredDate: "2026-05-18",
    url: "https://www.nemoapp.kr/office/ds7",
    year: 2026,
    quarter: "2Q"
  },
  // 1.5km 확장 유도용 및 타 상권 유인 후보
  {
    id: "ds-c8-26-2q",
    name: "여의도 파크원 타워2",
    address: "서울시 영등포구 여의대로 108",
    city: "당산",
    tradeArea: "여의도 상권", // 타 상권! 탈락 대상
    distanceMeters: 1350, // 1.1km 초과, 1.5km 이내
    grossAreaSqm: 162200,
    builtYear: 2020,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 42.35, // 140만
    monthlyRentPerSqm: 4.08, // 13.5만
    maintenancePerSqm: 1.36, // 4.5만
    source: "알스퀘어",
    registeredDate: "2026-06-01",
    url: "https://www.rsquare.co.kr/property/ds8",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c9-26-2q",
    name: "당산 에이스테크노",
    address: "서울시 영등포구 선유동1로 50",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 1250, // 1.1km 초과! 후보부족 시 확장 구제용!
    grossAreaSqm: 14500, // 중형
    builtYear: 2008,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 28.74, // 95만
    monthlyRentPerSqm: 2.72, // 9.0만
    maintenancePerSqm: 0.91, // 3.0만
    source: "실거래가",
    registeredDate: "2026-05-05",
    url: "https://www.rtms.go.kr/ds9",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c10-26-2q",
    name: "영등포 푸르지오 상가",
    address: "서울시 영등포구 영등포동 647",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 1050,
    grossAreaSqm: 4100,
    builtYear: 2002,
    useType: "순수상가", // 제외 대상!
    actualOfficeRentable: false,
    depositPerSqm: 45.0,
    monthlyRentPerSqm: 4.5,
    maintenancePerSqm: 1.0,
    source: "네모",
    registeredDate: "2026-06-11",
    url: "https://www.nemoapp.kr/office/ds10",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c11-26-2q",
    name: "당산 리엔타워",
    address: "서울시 영등포구 국회대로 552",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 1420, // 1.1km 초과! 후보 부족 시 확장 구제용
    grossAreaSqm: 7900, // 소형
    builtYear: 2013,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 31.15, // 103만
    monthlyRentPerSqm: 3.03, // 10.0만
    maintenancePerSqm: 1.00, // 3.3만
    source: "네모",
    registeredDate: "2026-05-24",
    url: "https://www.nemoapp.kr/office/ds11",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ds-c12-26-2q",
    name: "당산동 아인스프라자 (이상치 테스트용)",
    address: "서울시 영등포구 선유서로 88",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 480,
    grossAreaSqm: 11500, // 중형
    builtYear: 2014,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 56.40, // 186.5만 (중앙값 대비 과도하게 높은 단가 - 이상치 검출 유도)
    monthlyRentPerSqm: 5.45, // 18.0만 (중앙값 대비 70% 이상 높음 - 이상치)
    maintenancePerSqm: 1.82, // 6.0만 (이상치)
    source: "알스퀘어",
    registeredDate: "2026-06-18",
    url: "https://www.rsquare.co.kr/property/ds12",
    year: 2026,
    quarter: "2Q"
  },

  // 2026 1Q
  {
    id: "ds-c1-26-1q",
    name: "삼성생명 당산빌딩",
    address: "서울시 영등포구 양평로 21",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 520,
    grossAreaSqm: 18500,
    builtYear: 2005,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 31.46, // 보증금 이전 분기 소폭 낮음
    monthlyRentPerSqm: 3.03,
    maintenancePerSqm: 1.03,
    source: "알스퀘어",
    registeredDate: "2026-02-12",
    url: "https://www.rsquare.co.kr/property/ds1",
    year: 2026,
    quarter: "1Q"
  },
  {
    id: "ds-c4-26-1q",
    name: "코오롱 디지털타워",
    address: "서울시 영등포구 선유동3로 15",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 280,
    grossAreaSqm: 15800,
    builtYear: 2002,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 29.04,
    monthlyRentPerSqm: 2.84,
    maintenancePerSqm: 0.97,
    source: "알스퀘어",
    registeredDate: "2026-01-30",
    url: "https://www.rsquare.co.kr/property/ds4",
    year: 2026,
    quarter: "1Q"
  },

  // 2025 4Q
  {
    id: "ds-c1-25-4q",
    name: "삼성생명 당산빌딩",
    address: "서울시 영등포구 양평로 21",
    city: "당산",
    tradeArea: "영등포·당산 상권",
    distanceMeters: 520,
    grossAreaSqm: 18500,
    builtYear: 2005,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 30.85,
    monthlyRentPerSqm: 2.96,
    maintenancePerSqm: 1.00,
    source: "알스퀘어",
    registeredDate: "2025-11-10",
    url: "https://www.rsquare.co.kr/property/ds1",
    year: 2025,
    quarter: "4Q"
  },


  // ==================== 영등포 우체국보험회관 후보군 (영등포역 상권) ====================
  // 2026 2Q
  {
    id: "ydp-c1-26-2q",
    name: "영등포 타임스퀘어 오피스A",
    address: "서울시 영등포구 영중로 15",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 220,
    grossAreaSqm: 58400, // 대형
    builtYear: 2009,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 40.84, // 135만
    monthlyRentPerSqm: 3.87, // 12.8만
    maintenancePerSqm: 1.27, // 4.2만
    source: "알스퀘어",
    registeredDate: "2026-06-05",
    url: "https://www.rsquare.co.kr/property/ydp1",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ydp-c2-26-2q",
    name: "영등포 리드원센터",
    address: "서울시 영등포구 국회대로 48",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 710,
    grossAreaSqm: 24100, // 중형
    builtYear: 2013,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 33.27, // 110만
    monthlyRentPerSqm: 3.18, // 10.5만
    maintenancePerSqm: 1.09, // 3.6만
    source: "네모",
    registeredDate: "2026-05-22",
    url: "https://www.nemoapp.kr/office/ydp2",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ydp-c3-26-2q",
    name: "교보생명 영등포사옥",
    address: "서울시 영등포구 영등포로 188",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 480,
    grossAreaSqm: 19500, // 중형
    builtYear: 1995,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 30.25, // 100만
    monthlyRentPerSqm: 2.96, // 9.8만
    maintenancePerSqm: 0.97, // 3.2만
    source: "실거래가",
    registeredDate: "2026-05-15",
    url: "https://www.rtms.go.kr/ydp3",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ydp-c4-26-2q",
    name: "케이엔포트 오피스타워",
    address: "서울시 영등포구 버드나루로 18",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 820,
    grossAreaSqm: 11200, // 중형
    builtYear: 2000,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 28.74, // 95만
    monthlyRentPerSqm: 2.78, // 9.2만
    maintenancePerSqm: 0.91, // 3.0만
    source: "알스퀘어",
    registeredDate: "2026-06-11",
    url: "https://www.rsquare.co.kr/property/ydp4",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ydp-c5-26-2q",
    name: "영등포 청사 빌딩",
    address: "서울시 영등포구 당산로 123",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 650,
    grossAreaSqm: 14800, // 중형
    builtYear: 2005,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 31.76, // 105만
    monthlyRentPerSqm: 3.03, // 10.0만
    maintenancePerSqm: 1.03, // 3.4만
    source: "네모",
    registeredDate: "2026-05-18",
    url: "https://www.nemoapp.kr/office/ydp5",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ydp-c6-26-2q",
    name: "영등포 두오빌딩",
    address: "서울시 영등포구 경인로 843",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 990,
    grossAreaSqm: 4800, // 소형
    builtYear: 1992,
    useType: "제1종 근린생활시설", // 3순위 (사무실임대가능)
    actualOfficeRentable: true,
    depositPerSqm: 24.20, // 80만
    monthlyRentPerSqm: 2.12, // 7.0만
    maintenancePerSqm: 0.76, // 2.5만
    source: "알스퀘어",
    registeredDate: "2026-06-03",
    url: "https://www.rsquare.co.kr/property/ydp6",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ydp-c7-26-2q",
    name: "영등포 에이스 하이테크시티",
    address: "서울시 영등포구 경인로 775",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 1050,
    grossAreaSqm: 94600, // 대형
    builtYear: 2010,
    useType: "지식산업센터", // 4순위
    actualOfficeRentable: true,
    depositPerSqm: 30.25, // 100만
    monthlyRentPerSqm: 2.87, // 9.5만
    maintenancePerSqm: 0.97, // 3.2만
    source: "실거래가",
    registeredDate: "2026-05-30",
    url: "https://www.rtms.go.kr/ydp7",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "ydp-c8-26-2q",
    name: "신길역 클래스빌 (이상치 테스트용)",
    address: "서울시 영등포구 경인로 902",
    city: "영등포",
    tradeArea: "영등포역 상권",
    distanceMeters: 1200, // 1.1km 초과, 1.5km 이내
    grossAreaSqm: 11500,
    builtYear: 2015,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 15.12, // 50만 (중앙값 대비 과도하게 낮은 단가 - 이상치 검출 유도)
    monthlyRentPerSqm: 1.45, // 4.8만 (중앙값 대비 너무 낮음 - 이상치)
    maintenancePerSqm: 0.54, // 1.8만
    source: "네모",
    registeredDate: "2026-06-12",
    url: "https://www.nemoapp.kr/office/ydp8",
    year: 2026,
    quarter: "2Q"
  },

  // ==================== 부산 우체국보험회관 후보군 (부산 중구 상권) ====================
  // 2026 2Q
  {
    id: "bs-c1-26-2q",
    name: "교보생명 부산역 사옥",
    address: "부산시 동구 중앙대로 240",
    city: "부산",
    tradeArea: "부산 중구 상권",
    distanceMeters: 520,
    grossAreaSqm: 31500, // 중형
    builtYear: 1998,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 15.12, // 50만
    monthlyRentPerSqm: 1.45, // 4.8만
    maintenancePerSqm: 0.60, // 2.0만
    source: "알스퀘어",
    registeredDate: "2026-06-02",
    url: "https://www.rsquare.co.kr/property/bs1",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "bs-c2-26-2q",
    name: "부산무역회관",
    address: "부산시 중구 충장대로 9",
    city: "부산",
    tradeArea: "부산 중구 상권",
    distanceMeters: 650,
    grossAreaSqm: 27800, // 중형
    builtYear: 2012,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 18.15, // 60만
    monthlyRentPerSqm: 1.75, // 5.8만
    maintenancePerSqm: 0.70, // 2.3만
    source: "네모",
    registeredDate: "2026-06-10",
    url: "https://www.nemoapp.kr/office/bs2",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "bs-c3-26-2q",
    name: "중앙동 현대생명 빌딩",
    address: "부산시 중구 중앙대로 78",
    city: "부산",
    tradeArea: "부산 중구 상권",
    distanceMeters: 210,
    grossAreaSqm: 18500, // 중형
    builtYear: 1995,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 13.61, // 45만
    monthlyRentPerSqm: 1.27, // 4.2만
    maintenancePerSqm: 0.54, // 1.8만
    source: "실거래가",
    registeredDate: "2026-05-24",
    url: "https://www.rtms.go.kr/bs3",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "bs-c4-26-2q",
    name: "대한항공 부산빌딩",
    address: "부산시 중구 중앙대로 95",
    city: "부산",
    tradeArea: "부산 중구 상권",
    distanceMeters: 380,
    grossAreaSqm: 16200, // 중형
    builtYear: 2002,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 14.52, // 48만
    monthlyRentPerSqm: 1.36, // 4.5만
    maintenancePerSqm: 0.57, // 1.9만
    source: "알스퀘어",
    registeredDate: "2026-06-01",
    url: "https://www.rsquare.co.kr/property/bs4",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "bs-c5-26-2q",
    name: "한진부산종합사옥",
    address: "부산시 중구 충장대로 12",
    city: "부산",
    tradeArea: "부산 중구 상권",
    distanceMeters: 800,
    grossAreaSqm: 41200, // 대형
    builtYear: 2006,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 16.64, // 55만
    monthlyRentPerSqm: 1.57, // 5.2만
    maintenancePerSqm: 0.64, // 2.1만
    source: "네모",
    registeredDate: "2026-06-08",
    url: "https://www.nemoapp.kr/office/bs5",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "bs-c6-26-2q",
    name: "해운대 센텀오피스(이상치/상권탈락용)",
    address: "부산시 해운대구 센텀동로 45",
    city: "부산",
    tradeArea: "해운대 상권", // 타 상권! 탈락!
    distanceMeters: 8500, // 거리 초과! 탈락!
    grossAreaSqm: 24500,
    builtYear: 2012,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 24.20,
    monthlyRentPerSqm: 2.42,
    maintenancePerSqm: 0.76,
    source: "네모",
    registeredDate: "2026-05-10",
    url: "https://www.nemoapp.kr/office/bs6",
    year: 2026,
    quarter: "2Q"
  },

  // ==================== 대구 우체국보험회관 후보군 (대구 남구 상권) ====================
  // 2026 2Q
  {
    id: "dg-c1-26-2q",
    name: "DGB대구은행 명덕지점",
    address: "대구시 남구 중앙대로 230",
    city: "대구",
    tradeArea: "대구 남구 상권",
    distanceMeters: 280,
    grossAreaSqm: 12800, // 중형
    builtYear: 2005,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 12.71, // 42만
    monthlyRentPerSqm: 1.18, // 3.9만
    maintenancePerSqm: 0.51, // 1.7만
    source: "알스퀘어",
    registeredDate: "2026-05-18",
    url: "https://www.rsquare.co.kr/property/dg1",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "dg-c2-26-2q",
    name: "삼성생명 대구남부사옥",
    address: "대구시 남구 명덕로 104",
    city: "대구",
    tradeArea: "대구 남구 상권",
    distanceMeters: 640,
    grossAreaSqm: 19500, // 중형
    builtYear: 1998,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 11.50, // 38만
    monthlyRentPerSqm: 1.09, // 3.6만
    maintenancePerSqm: 0.45, // 1.5만
    source: "실거래가",
    registeredDate: "2026-05-24",
    url: "https://www.rtms.go.kr/dg2",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "dg-c3-26-2q",
    name: "대구 행정종합빌딩",
    address: "대구시 남구 중앙대로 180",
    city: "대구",
    tradeArea: "대구 남구 상권",
    distanceMeters: 320,
    grossAreaSqm: 8600, // 소형
    builtYear: 2010,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 13.61, // 45만
    monthlyRentPerSqm: 1.27, // 4.2만
    maintenancePerSqm: 0.54, // 1.8만
    source: "네모",
    registeredDate: "2026-06-03",
    url: "https://www.nemoapp.kr/office/dg3",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "dg-c4-26-2q",
    name: "명덕 메디컬 스퀘어",
    address: "대구시 남구 중앙대로 165",
    city: "대구",
    tradeArea: "대구 남구 상권",
    distanceMeters: 420,
    grossAreaSqm: 6200, // 소형
    builtYear: 2001,
    useType: "업무시설+근린생활시설", // 2순위
    actualOfficeRentable: true,
    depositPerSqm: 10.59, // 35만
    monthlyRentPerSqm: 1.00, // 3.3만
    maintenancePerSqm: 0.42, // 1.4만
    source: "네모",
    registeredDate: "2026-05-12",
    url: "https://www.nemoapp.kr/office/dg4",
    year: 2026,
    quarter: "2Q"
  },

  // ==================== 광주 우체국보험회관 후보군 (광주 서구 상권) ====================
  // 2026 2Q
  {
    id: "gj-c1-26-2q",
    name: "광주 기독교방송국 빌딩",
    address: "광주시 서구 상무중앙로 84",
    city: "광주",
    tradeArea: "광주 서구 상권",
    distanceMeters: 280,
    grossAreaSqm: 18600, // 중형
    builtYear: 2010,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 15.73, // 52만
    monthlyRentPerSqm: 1.48, // 4.9만
    maintenancePerSqm: 0.64, // 2.1만
    source: "알스퀘어",
    registeredDate: "2026-05-11",
    url: "https://www.rsquare.co.kr/property/gj1",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "gj-c2-26-2q",
    name: "상무지구 대신증권 코너",
    address: "광주시 서구 상무중앙로 118",
    city: "광주",
    tradeArea: "광주 서구 상권",
    distanceMeters: 120,
    grossAreaSqm: 21500, // 중형
    builtYear: 2000,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 13.31, // 44만
    monthlyRentPerSqm: 1.27, // 4.2만
    maintenancePerSqm: 0.54, // 1.8만
    source: "네모",
    registeredDate: "2026-06-04",
    url: "https://www.nemoapp.kr/office/gj2",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "gj-c3-26-2q",
    name: "상무 현대해상 타워",
    address: "광주시 서구 상무중앙로 50",
    city: "광주",
    tradeArea: "광주 서구 상권",
    distanceMeters: 450,
    grossAreaSqm: 28500, // 중형
    builtYear: 2007,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 16.64, // 55만
    monthlyRentPerSqm: 1.54, // 5.1만
    maintenancePerSqm: 0.67, // 2.2만
    source: "실거래가",
    registeredDate: "2026-05-18",
    url: "https://www.rtms.go.kr/gj3",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "gj-c4-26-2q",
    name: "광주종합행정센터",
    address: "광주시 서구 치평로 25",
    city: "광주",
    tradeArea: "광주 서구 상권",
    distanceMeters: 620,
    grossAreaSqm: 14500, // 중형
    builtYear: 2002,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 12.71, // 42만
    monthlyRentPerSqm: 1.24, // 4.1만
    maintenancePerSqm: 0.51, // 1.7만
    source: "알스퀘어",
    registeredDate: "2026-06-10",
    url: "https://www.rsquare.co.kr/property/gj4",
    year: 2026,
    quarter: "2Q"
  },
  {
    id: "gj-c5-26-2q",
    name: "상무 한국은행 빌딩",
    address: "광주시 서구 치평동 1152-1",
    city: "광주",
    tradeArea: "광주 서구 상권",
    distanceMeters: 340,
    grossAreaSqm: 23200, // 중형
    builtYear: 1999,
    useType: "업무시설",
    actualOfficeRentable: true,
    depositPerSqm: 13.61, // 45만
    monthlyRentPerSqm: 1.30, // 4.3만
    maintenancePerSqm: 0.54, // 1.8만
    source: "네모",
    registeredDate: "2026-05-29",
    url: "https://www.nemoapp.kr/office/gj5",
    year: 2026,
    quarter: "2Q"
  }
];
