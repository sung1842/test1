"use client";

import type { ReactNode } from "react";
import "./product.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useInDeskFrame } from "@/components/desk/deskFrameContext";

/** 스튜디오·데스크 공용 셸. 역할별 메뉴는 SiteHeader 가 경로로 정한다. */
export function ProductShell({
  children,
  crumble,
}: {
  children: ReactNode;
  crumble?: string;
}) {
  // 기업 화면은 루트의 DeskFrame 이 헤더·탭을 한 번만 그린다 → 여기선 본문만
  const inFrame = useInDeskFrame();
  if (inFrame) return <>{children}</>;
  return (
    <div className="product-root">
      <SiteHeader crumb={crumble} />
      <main id="main">{children}</main>
    </div>
  );
}
