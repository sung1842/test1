"use client";

import { ApexChart, CHART_COLORS, CHART_INK, outsideLabels } from "@/components/charts/ApexChart";

export type FunnelStage = { label: string; n: number | null; pct: number | null; wip?: boolean };

/** 파이프라인: 단계별 인원(가로 막대). 가장 많이 빠지는 단계만 앰버, 준비 중 단계는 0 + "준비 중". */
export function FunnelChart({ stages, leakIdx }: { stages: FunnelStage[]; leakIdx: number }) {
  const max = Math.max(1, ...stages.map((s) => s.n ?? 0));
  return (
    <ApexChart
      type="bar"
      height={Math.max(220, stages.length * 40)}
      ariaLabel={stages.map((s) => `${s.label} ${s.wip ? "준비 중" : `${s.n}명`}`).join(", ")}
      series={[{ name: "인원", data: stages.map((s) => (s.wip ? 0 : s.n ?? 0)) }]}
      options={{
        plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "60%", dataLabels: { position: "top" } } },
        colors: stages.map((_, i) => (i === leakIdx ? CHART_COLORS.c2 : CHART_COLORS.c1)),
        ...outsideLabels(),
        dataLabels: {
          ...outsideLabels().dataLabels,
          formatter: (_v, o) => {
            const s = stages[o.dataPointIndex];
            return s.wip ? "준비 중" : `${s.n}${o.dataPointIndex && s.pct !== null ? ` · ${s.pct}%` : ""}`;
          },
        },
        xaxis: { categories: stages.map((s) => s.label), max: Math.ceil(max * 1.25), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        grid: { show: false },
        legend: { show: false },
        tooltip: { y: { formatter: (_v, o) => { const s = stages[o.dataPointIndex]; return s.wip ? "준비 중" : `${s.n}명${s.pct !== null && o.dataPointIndex ? ` (전 단계 대비 ${s.pct}%)` : ""}${o.dataPointIndex === leakIdx ? " · 가장 많이 빠지는 단계" : ""}`; } } },
      }}
    />
  );
}

/** 스카우트 건 한 줄: 승인 / 분석됨 / 분석 전 누적 막대 (줄 높이용 소형). */
export function CaseBar({ matched, analyzed, approved }: { matched: number; analyzed: number; approved: number }) {
  return (
    <ApexChart
      type="bar"
      height={34}
      ariaLabel={`매칭 ${matched}, 분석 ${analyzed}, 승인 ${approved}`}
      series={[
        { name: "승인", data: [approved] },
        { name: "분석됨", data: [Math.max(0, analyzed - approved)] },
        { name: "분석 전", data: [Math.max(0, matched - analyzed)] },
      ]}
      options={{
        chart: { stacked: true, sparkline: { enabled: true } },
        plotOptions: { bar: { horizontal: true, barHeight: "70%", borderRadius: 3, borderRadiusApplication: "end", borderRadiusWhenStacked: "last" } },
        colors: [CHART_COLORS.c1, "#7FA3F0", "#C8D8F5"],
        stroke: { width: 2, colors: [CHART_INK.white] },
        xaxis: { categories: [""], max: Math.max(1, matched) },
        tooltip: { shared: true, intersect: false, y: { formatter: (v) => `${v}명` } },
      }}
    />
  );
}

/** 거절 사유 분포. */
export function ReasonsChart({ reasons }: { reasons: { label: string; count: number }[] }) {
  const max = Math.max(1, ...reasons.map((r) => r.count));
  return (
    <ApexChart
      type="bar"
      height={Math.max(140, reasons.length * 36)}
      ariaLabel={`거절 사유: ${reasons.map((r) => `${r.label} ${r.count}건`).join(", ")}`}
      series={[{ name: "거절", data: reasons.map((r) => r.count) }]}
      options={{
        plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "56%", dataLabels: { position: "top" } } },
        colors: [CHART_COLORS.c1],
        ...outsideLabels(),
        xaxis: { categories: reasons.map((r) => r.label), max: Math.ceil(max * 1.2), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        grid: { show: false },
        tooltip: { y: { formatter: (v) => `${v}건` } },
      }}
    />
  );
}

/** 공급(후보)·수요(공고): 직군별 묶음 가로 막대, 한 축. */
export function SupplyDemandChart({ supply, demand }: { supply: { developer: number; designer: number }; demand: { developer: number; designer: number } }) {
  return (
    <ApexChart
      type="bar"
      height={200}
      ariaLabel={`개발 후보 ${supply.developer}명·공고 ${demand.developer}건, 디자인 후보 ${supply.designer}명·공고 ${demand.designer}건`}
      series={[
        { name: "플랫폼 후보", data: [supply.developer, supply.designer] },
        { name: "시장 공고", data: [demand.developer, demand.designer] },
      ]}
      options={{
        plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "64%" } },
        colors: [CHART_COLORS.c1, CHART_COLORS.c2],
        stroke: { show: true, width: 2, colors: [CHART_INK.white] },
        xaxis: { categories: ["개발", "디자인"], labels: { formatter: (v) => Math.round(Number(v)).toLocaleString() } },
        legend: { position: "top", horizontalAlign: "left" },
        tooltip: { shared: true, intersect: false, y: { formatter: (v) => v.toLocaleString() } },
      }}
    />
  );
}
