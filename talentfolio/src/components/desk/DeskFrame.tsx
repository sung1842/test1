"use client";

/**
 * 기업 작업 화면(데스크·승인함·스카우트 건·연동·기업 프로필) 공용 틀.
 * 루트 레이아웃에 있어서 화면을 옮겨도 사이드바 셸(console/DeskShell)이 다시 그려지지 않는다 → 본문만 바뀐다.
 * 틀 안에서는 ProductShell 이 아무것도 그리지 않는다 (중복 방지).
 */
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { zoneOwner } from "@/lib/accountType";
import { setCacheScope, notifyScopeChange } from "@/lib/useCached";
import { DeskFrameContext } from "./deskFrameContext";
import { DeskShell } from "./console/DeskShell";

export function DeskFrame({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "";
  const { user } = useAuth();
  // 계정별 캐시 분리 (렌더 중에는 조용히 바꾸고, 구독자 알림은 effect 에서)
  setCacheScope(user?.id, { silent: true });
  useEffect(() => notifyScopeChange(), [user?.id]);

  if (zoneOwner(path) !== "company") return <>{children}</>;
  return (
    <DeskFrameContext.Provider value={true}>
      <DeskShell>{children}</DeskShell>
    </DeskFrameContext.Provider>
  );
}
