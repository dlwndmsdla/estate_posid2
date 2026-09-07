/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { GitCompare, Info, AlertTriangle, ChevronDown } from "lucide-react";
import { Method2Candidate, Method2HallRow, Method2SheetData } from "../../types/dataset";
import { method2Repository } from "../../db/repository";

/**
 * 회관별 비교 — 실거래 임대료 vs 방법1·2·4
 *
 * 값은 전부 발송본 엑셀의 "방법2_유사군매칭"·"방법2_비교건물" 시트에서 읽는다.
 * 이 화면은 다시 계산하지 않는다 — 엑셀과 화면이 어긋나는 일을 원천적으로 막기 위해서다.
 * 시트가 없는 분기 파일이면 0으로 채우지 않고 "없음"이라고 말한다.
 */

/** 막대 4종 = 추정 방법. 방법4는 우리 계산이 아니라 공표치라 채우지 않고 테두리만 그린다. */
const BARS: {
  label: string;
  key: keyof Method2HallRow;
  fill: string;
  outline?: boolean;
  why: string;
}[] = [
  {
    label: "방법1 캐스케이드",
    key: "method1CascadeWon",
    fill: "#2a78d6",
    why: "지역 중앙값에 권역·규모·연식 보정을 곱한 값",
  },
  {
    label: "방법2 전용률적용",
    key: "method2RepresentativeWon",
    fill: "#eb6834",
    why: "연면적·연령이 비슷한 건물 15곳의 호가 중앙값 × 권역 전용률",
  },
  {
    label: "방법2 보정계수적용",
    key: "method2CalibratedWon" as keyof Method2HallRow,
    fill: "#1baf7a",
    why: "전용률 대신 실측 조사표에서 뽑은 보정계수를 곱한 값(기존 v6 방식)",
  },
  {
    label: "방법4 R-ONE 권역평균",
    key: "roneZoneAverageWon",
    fill: "#5c7a8c",
    outline: true,
    why: "한국부동산원 임대동향조사의 권역 평균 — 표본 건물 현장조사 평균이며 개별 건물 값이 아니다",
  },
];

const PLOT_X = 150;
const PLOT_W = 400;
const ROW_H = 26;
const TOP = 8;

const won = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : Math.round(v).toLocaleString("ko-KR");

const diff = (v: number | null | undefined, base: number | null | undefined) => {
  if (v === null || v === undefined || !base) return "";
  return `${v >= base ? "+" : ""}${(((v - base) / base) * 100).toFixed(1)}%`;
};

/** 기본15 티어의 보정계수 값을 막대 하나로 쓰기 위해 평평하게 편다. */
function withCalibrated(h: Method2HallRow) {
  const base15 = h.tiers.find((t) => t.tier.includes("기본15")) ?? h.tiers[0];
  return { ...h, method2CalibratedWon: base15?.byCalibrationWon ?? null };
}

function HallChart({ hall }: { hall: ReturnType<typeof withCalibrated> }) {
  const refs = [
    { label: "실거래", value: hall.realTransactionRentWon, color: "#52514e", dash: "5 4", width: 1.8 },
    { label: "현행", value: hall.currentRentWon, color: "#9a988f", dash: "2 3", width: 1.4 },
  ].filter((r) => r.value);

  const marks = [
    ...BARS.map((b) => hall[b.key] as number | null),
    ...refs.map((r) => r.value),
    hall.method2HighWon,
  ].filter((v): v is number => typeof v === "number" && v > 0);
  if (!marks.length) return null;

  const scale = PLOT_W / (Math.max(...marks) * 1.14);
  const bottom = TOP + ROW_H * BARS.length;
  const placed: number[] = [];

  return (
    <svg viewBox={`0 0 640 ${bottom + 46}`} className="w-full h-auto" role="img"
         aria-label={`${hall.hallName} 방법별 추정 비교`}>
      <line x1={PLOT_X} y1={2} x2={PLOT_X} y2={bottom} stroke="#c3c2b7" strokeWidth={1} />

      {BARS.map((bar, i) => {
        const v = hall[bar.key] as number | null;
        const y = TOP + ROW_H * i;
        if (v === null || v === undefined) {
          return (
            <g key={bar.label}>
              <text x={PLOT_X - 8} y={y + 13} textAnchor="end" fontSize={11} fill="#52514e">{bar.label}</text>
              <text x={PLOT_X + 6} y={y + 13} fontSize={11} fill="#898781" fontStyle="italic">산출 못 함</text>
            </g>
          );
        }
        const w = v * scale;
        const isMethod2 = bar.key === "method2RepresentativeWon";
        const hi = hall.method2HighWon ?? 0;
        const lo = hall.method2LowWon ?? 0;
        const labelX = PLOT_X + Math.max(w, isMethod2 ? hi * scale : 0) + 6;
        return (
          <g key={bar.label}>
            <text x={PLOT_X - 8} y={y + 13} textAnchor="end" fontSize={11} fill="#52514e">{bar.label}</text>
            <rect
              x={PLOT_X} y={y} width={w} height={17} rx={3}
              fill={bar.outline ? `${bar.fill}42` : bar.fill}
              stroke={bar.outline ? bar.fill : "none"}
              strokeWidth={bar.outline ? 1.4 : 0}
              strokeDasharray={bar.outline ? "4 3" : undefined}
            >
              <title>{`${hall.hallName} · ${bar.label}: ${won(v)}원/㎡·월 · 실거래 대비 ${diff(v, hall.realTransactionRentWon)}\n${bar.why}`}</title>
            </rect>
            {isMethod2 && hi > 0 && (
              <g stroke="#0b0b0b" strokeWidth={1.4} opacity={0.5}>
                <line x1={PLOT_X + lo * scale} y1={y + 8.5} x2={PLOT_X + hi * scale} y2={y + 8.5}>
                  <title>{`가정(티어 3구성 × 전용률 3안)에 따라 움직이는 폭: ${won(lo)} ~ ${won(hi)}원`}</title>
                </line>
                <line x1={PLOT_X + lo * scale} y1={y + 3.5} x2={PLOT_X + lo * scale} y2={y + 13.5} />
                <line x1={PLOT_X + hi * scale} y1={y + 3.5} x2={PLOT_X + hi * scale} y2={y + 13.5} />
              </g>
            )}
            <text x={labelX} y={y + 13} fontSize={11} fill="#0b0b0b"
                  style={{ fontVariantNumeric: "tabular-nums" }}>
              {won(v)}
              <tspan fill="#898781" fontSize={10}>{`  ${diff(v, hall.realTransactionRentWon)}`}</tspan>
            </text>
          </g>
        );
      })}

      {refs.map((r) => {
        const x = PLOT_X + (r.value as number) * scale;
        const row = placed.some((px) => Math.abs(px - x) < 58) ? 1 : 0;
        placed.push(x);
        const dagger = r.label === "실거래" && hall.realTransactionNote ? "†" : "";
        return (
          <g key={r.label}>
            <line x1={x} y1={0} x2={x} y2={bottom} stroke={r.color}
                  strokeWidth={r.width} strokeDasharray={r.dash}>
              <title>{r.label === "실거래"
                ? `실거래 임대료 — 2025.4Q 부서 조사표, 지역 단위${hall.realTransactionNote ? ` · ${hall.realTransactionNote}` : ""}`
                : "현행 임대료 — 이 회관이 지금 적용 중인 계약 단가"}</title>
            </line>
            <text x={x} y={bottom + 14 + row * 14} textAnchor="middle" fontSize={10.5}
                  fill={r.color} fontWeight={r.label === "실거래" ? 700 : 400}>
              {`${r.label} ${won(r.value)}${dagger}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Swatch({ fill, outline }: { fill: string; outline?: boolean }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-[3px] shrink-0"
      style={
        outline
          ? { background: `${fill}42`, border: `1.4px dashed ${fill}` }
          : { background: fill }
      }
    />
  );
}

function CandidateTable({ rows }: { rows: Method2Candidate[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            {["순위", "기본15", "티어", "유사도", "주소", "연면적(㎡)", "연면적 출처", "연령", "호가 단가"].map((h) => (
              <th key={h} className="border border-slate-200 px-2 py-1.5 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.rank} className="text-center tabular-nums">
              <td className="border border-slate-200 px-2 py-1">{c.rank}</td>
              <td className="border border-slate-200 px-2 py-1">{c.inDefault15 ? "○" : ""}</td>
              <td className="border border-slate-200 px-2 py-1">{c.tier}</td>
              <td className="border border-slate-200 px-2 py-1">{c.similarity?.toFixed(3) ?? "—"}</td>
              <td className="border border-slate-200 px-2 py-1 text-left text-slate-600">{c.address}</td>
              <td className="border border-slate-200 px-2 py-1">{won(c.grossAreaSqm)}</td>
              <td className={`border border-slate-200 px-2 py-1 ${
                c.areaSource.startsWith("실측") ? "text-emerald-700" : "text-red-600 font-bold"}`}>
                {c.areaSource.startsWith("실측") ? "실측" : "대체"}
              </td>
              <td className="border border-slate-200 px-2 py-1">{c.buildingAgeYears ?? "—"}</td>
              <td className="border border-slate-200 px-2 py-1">{won(c.askRentPerExclusiveSqmWon)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TierMatrix({ hall }: { hall: Method2HallRow }) {
  const cols: [string, keyof (typeof hall.tiers)[number], string][] = [
    ["호가 중앙값(전용면적)", "askMedianWon", ""],
    ["× 전국 전용률", "byNationalRateWon", hall.nationalRate?.toFixed(3) ?? ""],
    ["× 지역 전용률", "byRegionRateWon", hall.regionRate?.toFixed(3) ?? ""],
    ["× 권역 전용률", "byZoneRateWon", hall.zoneRate?.toFixed(3) ?? ""],
    ["× 보정계수", "byCalibrationWon", hall.calibrationFactor?.toFixed(3) ?? ""],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[560px]">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="border border-slate-200 px-2 py-1.5 font-semibold">티어 구성</th>
            <th className="border border-slate-200 px-2 py-1.5 font-semibold">표본</th>
            {cols.map(([label, , sub]) => (
              <th key={label} className="border border-slate-200 px-2 py-1.5 font-semibold">
                {label}
                {sub && <div className="font-mono font-normal text-[10px] text-slate-500">{sub}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hall.tiers.map((t) => {
            const star = t.tier.includes("기본15");
            return (
              <tr key={t.tier} className={`text-center tabular-nums ${star ? "bg-orange-50 font-bold" : ""}`}>
                <td className="border border-slate-200 px-2 py-1 text-left">{t.tier}</td>
                <td className="border border-slate-200 px-2 py-1">{t.sampleCount}</td>
                {cols.map(([label, key]) => (
                  <td key={label} className="border border-slate-200 px-2 py-1">{won(t[key] as number | null)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-500 mt-2">
        굵은 줄이 대표값으로 쓴 조합입니다. 권역 전용률 출처: {hall.zoneRateSource || "—"}.
      </p>
    </div>
  );
}

export function MethodComparisonSubView({ selectedDatasetId }: { selectedDatasetId: string }) {
  const [data, setData] = useState<Method2SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openHall, setOpenHall] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    method2Repository
      .get(selectedDatasetId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedDatasetId]);

  const halls = useMemo(() => (data?.halls ?? []).map(withCalibrated), [data]);

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">불러오는 중…</div>;
  }

  if (!halls.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">이 데이터셋에는 방법별 비교 시트가 없습니다</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              이 화면은 발송본 엑셀의 <code className="bg-slate-100 px-1 rounded">방법2_유사군매칭</code> ·
              <code className="bg-slate-100 px-1 rounded ml-1">방법2_비교건물</code> 시트를 그대로 읽어 그립니다.
              시트가 없는 분기 파일을 올리면 값을 지어내지 않고 이렇게 안내합니다.
              두 시트가 들어 있는 엑셀을 <b>1단계 · 자료 반입</b>에서 다시 올려 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const coverage = halls[0]?.regionAreaCoverage;
  const weak = halls.filter((h) => {
    const [ok, total] = (h.measuredAreaRatio || "0/0").split("/").map(Number);
    return total > 0 && ok / total < 0.5;
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase">
          <GitCompare className="w-4 h-4" />
          METHOD COMPARISON
        </div>
        <h2 className="text-base md:text-lg font-bold text-slate-800 mt-1">
          회관별 비교 — 실거래 임대료 vs 방법1·2·4
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          같은 회관을 네 가지 방법으로 추정해 실거래 임대료·현행 임대료와 나란히 놓습니다.
          어느 방법이 실거래에 가까운지, 방법2가 가정에 따라 얼마나 흔들리는지를 한 화면에서 봅니다.
          <b className="text-slate-700"> 이 화면은 값을 결정하지 않습니다</b> — 최종 임대료는 담당자가 정하며 여기서는 근거만 제시합니다.
        </p>
      </div>

      {weak.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 border-l-4 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
          <b>표본 경고 — {weak.map((h) => h.hallName).join(", ")}</b>
          <br />
          유사군 매칭은 <b>연면적과 연령</b> 두 가지만 보고 비슷한 건물을 고릅니다. 연면적이 비어 있는 건물은
          권역 중앙값으로 채워지는데, 채운 건물이 많으면 "연면적이 비슷하다"는 판단 자체가 성립하지 않습니다.
          아래 표의 <b>연면적 실측</b> 칸이 낮은 회관은 방법2 값을 참고치로만 보십시오.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600">
          {BARS.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-1.5">
              <Swatch fill={b.fill} outline={b.outline} />
              {b.label}
              {b.outline && <span className="text-slate-400">(공표치)</span>}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-slate-600" />
            실거래 임대료(기준선, 2025.4Q 조사표)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dotted border-slate-400" />
            현행 임대료(보조선)
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {halls.map((h) => (
            <figure key={h.hallName} className="border border-slate-200 rounded-xl p-3">
              <figcaption className="flex items-baseline justify-between mb-1">
                <span className="text-[13px] font-bold text-slate-800">{h.hallName}</span>
                <span className="text-[10px] text-slate-400">단위: 원/㎡·월 (계약면적 기준)</span>
              </figcaption>
              <HallChart hall={h} />
            </figure>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">표로 보기</h3>
        <p className="text-[11px] text-slate-500">퍼센트는 실거래 기준선 대비 차이입니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                {["회관", "실거래(기준선)", "현행 임대료(보조선)", "방법1 캐스케이드", "방법2 전용률적용",
                  "방법2 보정계수적용", "방법4 R-ONE 권역평균", "방법2 범위", "비교건물 중 연면적 실측"].map((h) => (
                  <th key={h} className="border border-slate-200 px-2 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {halls.map((h) => {
                const base = h.realTransactionRentWon;
                const [ok, total] = (h.measuredAreaRatio || "0/0").split("/").map(Number);
                const bad = total > 0 && ok / total < 0.5;
                const cell = (v: number | null | undefined, bold = false) => (
                  <td className={`border border-slate-200 px-2 py-1.5 text-center tabular-nums ${bold ? "font-bold" : ""}`}>
                    {won(v)}
                    <span className="block text-[10px] font-normal text-slate-400">{diff(v, base)}</span>
                  </td>
                );
                return (
                  <tr key={h.hallName}>
                    <th className="border border-slate-200 px-2 py-1.5 text-left whitespace-nowrap font-semibold">
                      {h.hallName}
                    </th>
                    <td className="border border-slate-200 px-2 py-1.5 text-center tabular-nums">
                      {won(base)}
                      {h.realTransactionNote && (
                        <abbr title={h.realTransactionNote} className="no-underline cursor-help">†</abbr>
                      )}
                    </td>
                    {cell(h.currentRentWon)}
                    {cell(h.method1CascadeWon, true)}
                    {cell(h.method2RepresentativeWon, true)}
                    {cell(h.method2CalibratedWon, true)}
                    {cell(h.roneZoneAverageWon, true)}
                    <td className="border border-slate-200 px-2 py-1.5 text-center tabular-nums text-slate-500">
                      {won(h.method2LowWon)}~{won(h.method2HighWon)}
                    </td>
                    <td className={`border border-slate-200 px-2 py-1.5 text-center tabular-nums ${
                      bad ? "text-red-600 font-bold" : "text-emerald-700"}`}>
                      {h.measuredAreaRatio || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {coverage && (
          <p className="text-[11px] text-slate-500">
            이 분기 지역 표본의 연면적 실측 커버리지: <b>{coverage}</b> (서울 기준).
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">방법2는 어떻게 나온 값인가</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          회관과 <b>연면적·연령</b>이 비슷한 건물을 유사도 순으로 줄 세운 뒤, 상위 건물들의 <b>호가 중앙값</b>을
          구하고 거기에 <b>전용률</b>을 곱해 계약면적 기준으로 바꿉니다. "몇 곳까지 볼 것인가(티어)"와
          "어느 전용률을 쓸 것인가"에 따라 값이 달라지므로, 9가지 조합을 모두 계산해 폭(차트의 수염)으로 보여줍니다.
        </p>
        <div className="space-y-2">
          {halls.map((h) => {
            const open = openHall === h.hallName;
            const cands = (data?.candidates ?? []).filter((c) => c.hallName === h.hallName);
            return (
              <div key={h.hallName} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenHall(open ? null : h.hallName)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-700
                             hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  <span>{h.hallName} — 계산 내역과 비교건물 {cands.length}곳</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="px-4 pb-4 pt-1 space-y-4 bg-slate-50/50">
                    <TierMatrix hall={h} />
                    {cands.length > 0 && <CandidateTable rows={cands} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[11px] text-slate-600 leading-relaxed space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
          <Info className="w-3.5 h-3.5" />
          읽을 때 주의할 것
        </div>
        <p>
          <b>단위</b> 전부 원/㎡·월, <b>계약(임대)면적</b> 기준입니다. 호가는 전용면적 기준으로 수집되므로
          전용률을 곱해 맞췄습니다. 안 맞추면 약 2배 차이가 납니다.
        </p>
        <p>
          <b>실거래 임대료(기준선)</b>는 2025년 4분기 부서 조사표 값이며 <b>지역 단위</b>라 서울 두 회관은 같은 값을 씁니다.
          공적 시스템에 개별 건물 임대료는 없습니다(상업·업무용 임대차는 신고 의무가 없음).
          <b> †</b>가 붙은 값은 담당자가 이상값으로 확인한 상태라 편차를 그대로 믿으면 안 됩니다.
        </p>
        <p>
          <b>방법4 R-ONE</b>은 한국부동산원 임대동향조사의 권역 평균으로, 개별 건물 실거래가가 아니라
          표본 건물 현장조사 평균입니다. 우리 계산이 아니라 공표치라 테두리만 있는 막대로 구분했습니다.
        </p>
        <p>
          <b>호가의 성격</b> 방법1·2의 입력은 협상 전 부른 값입니다. 통상 10~20% 협상 여지가 있다는 점을 감안해
          읽으십시오. 이 편향은 없애야 할 오류가 아니라 담당자가 참작할 정보입니다.
        </p>
      </div>
    </div>
  );
}
