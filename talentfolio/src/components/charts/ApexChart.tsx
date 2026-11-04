"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useEffect, useState } from "react";

// react-apexcharts는 window를 쓰므로 SSR 제외.
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => null });

// 브랜드 코발트 기준 범주 4색 (dataviz validate_palette.js 라이트 모드 통과). 순서 고정, 순환 금지.
export const CHART_COLORS = { c1: "#1F4FD6", c2: "#C2710C", c3: "#7A3FB0", c4: "#00957F" } as const;
export const CHART_INK = { ink: "#0B1C45", ink2: "#44527A", grid: "#E6EEF9", mist: "#DCEBFF", white: "#FFFFFF" } as const;

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(q.matches);
    const on = () => setRm(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return rm;
}

/** 공통 바탕 옵션. 개별 차트 옵션이 위에 얹힌다(얕은 병합 + chart/grid/tooltip 은 한 단계 더). */
export function baseOptions(rm: boolean): ApexOptions {
  return {
    chart: { fontFamily: "'Pretendard Variable', Pretendard, sans-serif", toolbar: { show: false }, foreColor: CHART_INK.ink2, animations: { enabled: !rm, speed: 600 }, parentHeightOffset: 0 },
    grid: { borderColor: CHART_INK.grid, padding: { left: 4, right: 8 } },
    dataLabels: { enabled: false },
    legend: { fontSize: "13px", markers: { size: 6, shape: "circle" }, labels: { colors: CHART_INK.ink } },
    yaxis: { labels: { style: { fontSize: "13px", colors: CHART_INK.ink } } },
    tooltip: { theme: "light" },
    states: { hover: { filter: { type: "darken", value: 0.9 } } } as ApexOptions["states"],
  };
}

/** 가로 막대에서 값 라벨을 막대 바깥(끝)에 둔다. 막대 안 어두운 글씨가 안 읽히는 문제 방지. */
export function outsideLabels(fmt?: (v: number) => string): Pick<ApexOptions, "dataLabels"> {
  return {
    dataLabels: { enabled: true, offsetX: 4, textAnchor: "start", style: { fontSize: "13px", fontWeight: 600, colors: [CHART_INK.ink] }, formatter: fmt ? (v) => fmt(Number(v)) : undefined, dropShadow: { enabled: false } },
  };
}

type Props = {
  type: "bar" | "radialBar";
  series: ApexOptions["series"];
  options: ApexOptions;
  height: number;
  ariaLabel: string;
};

export function ApexChart({ type, series, options, height, ariaLabel }: Props) {
  const rm = useReducedMotion();
  const base = baseOptions(rm);
  const merged: ApexOptions = {
    ...base,
    ...options,
    chart: { ...base.chart, ...options.chart, type },
    grid: { ...base.grid, ...options.grid },
    tooltip: { ...base.tooltip, ...options.tooltip },
    yaxis: options.yaxis ?? base.yaxis,
  };
  return (
    <div role="img" aria-label={ariaLabel}>
      <Chart type={type} series={series} options={merged} height={height} width="100%" />
    </div>
  );
}
