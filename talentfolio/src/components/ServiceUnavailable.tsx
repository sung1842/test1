import Link from "next/link";
import { CloudOff } from "lucide-react";

interface ServiceUnavailableProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ServiceUnavailable({
  title,
  description = "현재 웹 데모만 배포된 상태입니다. Supabase·jd-fit-analyzer 연동 후 이용할 수 있습니다.",
  backHref = "/",
  backLabel = "메인으로",
}: ServiceUnavailableProps) {
  return (
    <div
      className="rounded-2xl px-6 py-10 text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
    >
      <CloudOff size={32} className="mx-auto mb-4 opacity-50" style={{ color: "var(--text-secondary)" }} />
      <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif" }}>
        {title}
      </h2>
      <p className="text-sm mb-6 max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
      <Link
        href={backHref}
        className="inline-flex px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
      >
        {backLabel}
      </Link>
    </div>
  );
}
