"use client";

import { useEffect, useState } from "react";
import { ApexChart, CHART_COLORS, outsideLabels } from "@/components/charts/ApexChart";

type Cand = { name: string; note: string; score: number };

/**
 * 메인 데모 보드의 후보별 JD 핏 막대.
 * 항목 제목은 [이름, 설명] 두 줄 카테고리로 넣어 잘리지 않게 한다 (한 줄이면 축 라벨 폭에서 말줄임됨).
 * skyLandingMotion 이 #board 에 "sky-demo" 이벤트(detail = 단계 0~3)를 보내면 단계 2부터 막대가 찬다.
 */
export function LandingDemoChart({ cands }: { cands: Cand[] }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const board = document.getElementById("board");
    if (!board) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setFilled(true);
    const on = (e: Event) => setFilled((e as CustomEvent<number>).detail >= 2);
    board.addEventListener("sky-demo", on);
    return () => board.removeEventListener("sky-demo", on);
  }, []);

  return (
    <ApexChart
      type="bar"
      height={cands.length * 76}
      ariaLabel={cands.map((c) => `${c.name} ${c.note} JD 핏 ${c.score}%`).join(", ")}
      series={[{ name: "JD 핏", data: cands.map((c) => (filled ? c.score : 0)) }]}
      options={{
        chart: { animations: { speed: 1100 } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: "end", barHeight: "40%", dataLabels: { position: "top" } } },
        colors: [CHART_COLORS.c1],
        ...outsideLabels((v) => `${v}%`),
        xaxis: { categories: cands.map((c) => [c.name, c.note]), min: 0, max: 112, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { maxWidth: 220, align: "left", style: { fontSize: "13px", colors: "#0B1C45" } } },
        grid: { show: false, padding: { left: 0, right: 4 } },
        tooltip: { y: { formatter: (v) => `${v}%` } },
      }}
    />
  );
}
