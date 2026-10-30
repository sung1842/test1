import { StateView } from "@/components/state/StateView";

interface ServiceUnavailableProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ServiceUnavailable({
  title,
  description = "지금은 미리보기 버전이라 이 기능이 꺼져 있어요. 정식 연결이 끝나면 바로 쓸 수 있어요.",
  backHref = "/",
  backLabel = "홈으로",
}: ServiceUnavailableProps) {
  return (
    <div className="tf-card">
      <StateView
        art="umbrella"
        title={`${title}은(는) 준비 중이에요`}
        body={description}
        action={{ href: backHref, label: backLabel }}
      />
    </div>
  );
}
