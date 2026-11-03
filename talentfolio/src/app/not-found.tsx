import { SiteHeader } from "@/components/site/SiteHeader";
import { StateView } from "@/components/state/StateView";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <SiteHeader />
      <main id="main" style={{ paddingTop: 96 }}>
        <StateView
          level={1}
          art="map"
          title="길을 잘못 들었어요"
          note="404 · 이 페이지는 없어요"
          body="주소가 바뀌었거나 정리된 페이지예요."
          action={{ href: "/", label: "홈으로" }}
          secondary={{ href: "/", label: "메인으로" }}
        />
      </main>
    </div>
  );
}
