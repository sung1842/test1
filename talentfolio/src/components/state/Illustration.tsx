/**
 * 상태 화면용 손그림 스팟 일러스트 (메인 랜딩의 손그림 군중과 같은 문법).
 * 선 2px ink, 둥근 끝, 채색은 sky·mist·sun·cobalt 소량. 배경은 해 한 점.
 * E1 door(비로그인) · E2 search(결과 없음) · E3 kite(로딩) · E4 map(404) · E5 umbrella(오류) · E8 plane(완료)
 */
export type IllustrationName = "door" | "search" | "kite" | "map" | "umbrella" | "plane";

const INK = "#0B1C45";
const SKY = "#BFDDFF";
const MIST = "#DCEBFF";
const SUN = "#FFE7A3";
const COBALT = "#1F4FD6";

function Person({ x, shirt = SKY }: { x: number; shirt?: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M-26 168 Q-24 120 0 114 Q24 120 26 168" fill={shirt} />
      <circle cx="0" cy="88" r="18" fill="#fff" />
      <path d="M-15 80 Q-6 64 10 70 Q18 74 16 84" fill={INK} stroke="none" />
      <path d="M-6 90h.1M7 90h.1M-4 98 Q1 101 6 98" />
    </g>
  );
}

function Scene({ name }: { name: IllustrationName }) {
  switch (name) {
    case "door":
      return (
        <>
          <rect x="108" y="44" width="70" height="124" rx="6" fill="#fff" />
          <path d="M150 44v124" stroke={SKY} strokeWidth="10" />
          <circle cx="118" cy="110" r="3" fill={INK} />
          <Person x={70} />
          <path d="M92 128l14-6M106 122l4 6M106 122l-2 8" />
          <circle cx="110" cy="120" r="5" fill={SUN} />
        </>
      );
    case "search":
      return (
        <>
          <rect x="112" y="118" width="80" height="50" rx="6" fill="#fff" />
          <path d="M112 136h80M146 128h12" />
          <path d="M150 70 q8-14 22-6 q10 6 4 18 q-4 6 -10 8" fill={MIST} />
          <path d="M162 100h.1" strokeWidth="4" />
          <Person x={68} />
          <circle cx="104" cy="112" r="11" fill="#fff" />
          <path d="M96 120l-8 10" />
        </>
      );
    case "kite":
      return (
        <>
          <path d="M150 34 l22 18 -22 26 -22 -26z" fill={COBALT} stroke={INK} />
          <path d="M150 78 q-8 14 2 22 q10 8 -2 18" stroke={COBALT} className="tf-kite-tail" />
          <path d="M150 52v26" stroke="#fff" strokeWidth="1.5" />
          <path d="M92 118 L150 78" strokeWidth="1.2" strokeDasharray="3 4" />
          <Person x={80} />
        </>
      );
    case "map":
      return (
        <>
          <Person x={100} />
          <path d="M60 112 l26 -8 26 8 26 -8 v40 l-26 8 -26 -8 -26 8z" fill="#fff" />
          <path d="M86 104v40M112 112v40" />
          <path d="M72 128 q10 -8 18 2 t20 0" stroke={COBALT} strokeDasharray="3 4" />
        </>
      );
    case "umbrella":
      return (
        <>
          <path d="M64 92 Q100 44 136 92 Q127 84 118 92 Q109 84 100 92 Q91 84 82 92 Q73 84 64 92z" fill={SKY} />
          <path d="M100 92v40 q0 8 -8 6" />
          <path d="M150 50l-4 10M162 64l-4 10M44 56l-4 10" stroke={COBALT} />
          <Person x={100} shirt={MIST} />
        </>
      );
    case "plane":
      return (
        <>
          <rect x="60" y="120" width="70" height="48" rx="4" fill="#fff" />
          <path d="M70 134h40M70 146h30" />
          <circle cx="112" cy="152" r="12" stroke={COBALT} fill="none" />
          <path d="M106 152l5 5 8-10" stroke={COBALT} />
          <path d="M120 70 l52 -18 -22 46 -8 -18z" fill="#fff" />
          <path d="M142 80 l30 -28" />
          <path d="M70 110 q20 -30 48 -38" strokeDasharray="3 5" strokeWidth="1.2" />
        </>
      );
  }
}

export function Illustration({ name, size = 200, label }: { name: IllustrationName; size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 200 180"
      width={size}
      height={(size * 180) / 200}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="none"
      stroke={INK}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    >
      <circle cx="150" cy="56" r="40" fill={SUN} stroke="none" opacity=".75" />
      <path d="M20 168h160" stroke={MIST} strokeWidth="6" />
      <Scene name={name} />
    </svg>
  );
}
