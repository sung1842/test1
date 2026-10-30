"use client";

import { useEffect } from "react";
import { StateView } from "@/components/state/StateView";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" style={{ minHeight: "100vh", background: "var(--background)", paddingTop: 96 }}>
      <StateView
        level={1}
        art="umbrella"
        title="잠깐 문제가 생겼어요"
        note="금방 다시 맑아질 거예요"
        body="잠시 후 다시 시도해 주세요. 계속 같은 화면이 보이면 새로고침해 주세요."
        action={{ onClick: reset, label: "다시 시도" }}
        secondary={{ href: "/", label: "홈으로" }}
      />
    </main>
  );
}
