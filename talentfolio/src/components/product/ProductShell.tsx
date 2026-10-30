"use client";

import type { ReactNode } from "react";
import "./product.css";
import { SiteHeader } from "@/components/site/SiteHeader";

/** 스튜디오·데스크 공용 셸. 역할별 메뉴는 SiteHeader 가 경로로 정한다. */
export function ProductShell({
  children,
  crumble,
}: {
  children: ReactNode;
  crumble?: string;
}) {
  return (
    <div className="product-root">
      <SiteHeader crumb={crumble} />
      <main id="main">{children}</main>
    </div>
  );
}
