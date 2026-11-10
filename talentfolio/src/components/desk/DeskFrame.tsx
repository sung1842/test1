"use client";

/**
 * 기업 작업 화면(데스크·승인함·스카우트 건·인재풀·연동·기업 프로필) 공용 틀.
 * 루트 레이아웃에 있어서 탭을 옮겨도 다시 그려지지 않는다 → 헤더·탭 줄 위치가 고정되고 본문만 바뀐다.
 * 각 페이지의 <ProductShell>·<DeskTabs> 는 이 틀 안에서는 아무것도 그리지 않는다 (중복 방지).
 */
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { zoneOwner } from "@/lib/accountType";
import { SiteHeader } from "@/components/site/SiteHeader";
import { setCacheScope, notifyScopeChange } from "@/lib/useCached";
import { DeskTabsBar } from "./DeskTabs";
import { DeskFrameContext } from "./deskFrameContext";
import "@/components/product/product.css";
import "./desk.css";


const CRUMB: [string, string][] = [
  ["/desk/candidates", "데스크 · 인재풀"],
  ["/desk/profile", "데스크 · 기업 프로필"],
  ["/desk/offers", "데스크 · 제안"],
  ["/desk", "데스크 · 홈"],
  ["/review", "데스크 · 승인함"],
  ["/sourcing", "데스크 · 스카우트 건"],
  ["/settings", "데스크 · 연동"],
];

export function DeskFrame({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "";
  const { user } = useAuth();
  // 계정별 캐시 분리 (렌더 중에는 조용히 바꾸고, 구독자 알림은 effect 에서)
  setCacheScope(user?.id, { silent: true });
  useEffect(() => notifyScopeChange(), [user?.id]);

  if (zoneOwner(path) !== "company") return <>{children}</>;
  const crumb = CRUMB.find(([p]) => path === p || path.startsWith(p + "/"))?.[1];
  return (
    <DeskFrameContext.Provider value={true}>
      <div className="product-root">
        <SiteHeader crumb={crumb} />
        <div className="dk-tabbar">
          <div className="dk-tabwrap">
            <DeskTabsBar />
          </div>
        </div>
        <main id="main">{children}</main>
      </div>
    </DeskFrameContext.Provider>
  );
}
