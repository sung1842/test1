"use client";

import { ApexChart, CHART_COLORS, CHART_INK, outsideLabels } from "./ApexChart";

/** 0~100 점수 하나를 반원 게이지로 (핏 종합 점수, 프로필 완성도). */
export function ScoreGauge({ value, label, suffix = "", color = CHART_COLORS.c1, height = 180 }: { value: number; label: string; suffix?: string; color?: string; height?: number }) {
  return (
    <ApexChart
      type="radialBar"
      height={height}
      ariaLabel={`${label} ${value}${suffix}`}
      series={[Math.max(0, Math.min(100, value))]}
      options={{
        colors: [color],
        labels: [label],
        stroke: { lineCap: "round" },
        plotOptions: {
          radialBar: {
            startAngle: -110,
            endAngle: 110,
            hollow: { size: "60%" },
            track: { background: CHART_INK.mist, strokeWidth: "100%" },
            dataLabels: {
              name: { show: true, offsetY: 20, fontSize: "12px", color: CHART_INK.ink2 },
              value: { offsetY: -12, fontSize: "32px", fontWeight: 700, color: CHART_INK.ink, formatter: (v) => `${Math.round(Number(v))}${suffix}` },
            },
          },
        },
      }}
    />
  );
}

/** 항목별 점수 비교 가로 막대 + 기준선(점선). */
export function ScoreBars({ items, threshold = 75, height }: { items: { label: string; score: number }[]; threshold?: number; height?: number }) {
  return (
    <ApexChart
      type="bar"
      height={height ?? Math.max(120, items.length * 44)}
      ariaLabel={items.map((i) => `${i.label} ${i.score}점`).join(", ")}
      series={[{ name: "점수", data: items.map((i) => i.score) }]}
      options={{
        plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "52%", dataLabels: { position: "top" } } },
        colors: [CHART_COLORS.c1],
        ...outsideLabels(),
        xaxis: { categories: items.map((i) => i.label), min: 0, max: 100, tickAmount: 4 },
        annotations: { xaxis: [{ x: threshold, borderColor: CHART_INK.ink2, strokeDashArray: 4, label: { text: `${threshold}`, borderWidth: 0, style: { background: "transparent", color: CHART_INK.ink2 } } }] },
        tooltip: { y: { formatter: (v) => `${v}점` } },
      }}
    />
  );
}

/** 후보 비교: 종합 점수 세로 막대(높은 순) + 기준선. 막대를 누르면 onSelect(index). */
export function ScoreColumns({ items, threshold = 75, onSelect, height = 260 }: { items: { label: string; score: number }[]; threshold?: number; onSelect?: (i: number) => void; height?: number }) {
  return (
    <ApexChart
      type="bar"
      height={height}
      ariaLabel={`후보 비교: ${items.map((i) => `${i.label} ${i.score}점`).join(", ")}`}
      series={[{ name: "종합 점수", data: items.map((i) => i.score) }]}
      options={{
        chart: { events: onSelect ? { dataPointSelection: (_e, _c, o) => onSelect(o.dataPointIndex) } : undefined },
        plotOptions: { bar: { columnWidth: items.length > 6 ? "60%" : "44%", borderRadius: 4, borderRadiusApplication: "end", dataLabels: { position: "top" } } },
        colors: [CHART_COLORS.c1],
        dataLabels: { enabled: true, offsetY: -20, style: { fontSize: "13px", fontWeight: 600, colors: [CHART_INK.ink] } },
        xaxis: { categories: items.map((i) => i.label), labels: { rotate: -30, hideOverlappingLabels: false, trim: false, style: { fontSize: "13px", colors: CHART_INK.ink } } },
        yaxis: { min: 0, max: 100, tickAmount: 4, labels: { style: { fontSize: "12px", colors: CHART_INK.ink2 } } },
        annotations: { yaxis: [{ y: threshold, borderColor: CHART_INK.ink2, strokeDashArray: 4, label: { text: `잘 맞음 ${threshold}`, borderWidth: 0, style: { background: "transparent", color: CHART_INK.ink2 } } }] },
        tooltip: { y: { formatter: (v) => `${v}점` } },
      }}
    />
  );
}
