import { getJdAnalyzerUrl } from "@/lib/features";

const BASE = () => getJdAnalyzerUrl();

export interface SlackChannelConfig {
  slackChannelId: string;
  userId: string;
  jdText: string;
  enabled: boolean;
  maxAnalyze: number;
  inviterSlackUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSlackChannelConfigs(userId: string): Promise<SlackChannelConfig[]> {
  const res = await fetch(`${BASE()}/api/slack/channel-configs?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "채널 설정 로드 실패");
  return data.configs ?? [];
}

export async function saveSlackChannelConfig(input: {
  channelId: string;
  userId: string;
  jdText: string;
  enabled?: boolean;
  maxAnalyze?: number;
}): Promise<SlackChannelConfig> {
  const res = await fetch(`${BASE()}/api/slack/channel-configs/${encodeURIComponent(input.channelId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "채널 설정 저장 실패");
  return data.config;
}

export async function deleteSlackChannelConfig(channelId: string, userId: string): Promise<void> {
  const res = await fetch(
    `${BASE()}/api/slack/channel-configs/${encodeURIComponent(channelId)}?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "채널 설정 삭제 실패");
}
