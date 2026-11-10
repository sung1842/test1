"use client";

// 제안 서신함 공용 조각: 단계 배지 · 진행 단계 줄 · 메일 묶음. 기업(/desk/offers)과 후보(/studio/offers)가 같이 쓴다.
import type { ReactNode } from "react";
import { STAGE_LABEL, STAGE_TONE, fullDate, type OfferMail, type OfferStage } from "@/lib/offerApi";
import "./offers.css";

export function StageBadge({ stage, label }: { stage: OfferStage; label?: string }) {
  return <span className={`of-stage ${STAGE_TONE[stage]}`}>{label ?? STAGE_LABEL[stage]}</span>;
}

export interface TrackStep {
  label: string;
  at?: string | null;
  /** 지나온 단계 */
  done: boolean;
}

/** 초안 → 발송 → 열람 → 회신 → 면접. 끝난 제안(거절·철회)은 마지막 점을 회색으로 */
export function StageTrack({ steps, closed }: { steps: TrackStep[]; closed?: string }) {
  const lastDone = steps.reduce((acc, s, i) => (s.done ? i : acc), -1);
  return (
    <ol className="of-track" aria-label="진행 단계">
      {steps.map((s, i) => (
        <li key={s.label} className={s.done ? (i === lastDone ? "on now" : "on") : closed ? "off" : ""} aria-current={i === lastDone ? "step" : undefined}>
          <span>{!s.done && closed && i === lastDone + 1 ? closed : s.label}</span>
          {s.done && s.at ? <time dateTime={s.at}>{fullDate(s.at)}</time> : null}
        </li>
      ))}
    </ol>
  );
}

export function MailThread({
  mails,
  me,
  names,
  slotPicker,
}: {
  mails: OfferMail[];
  /** 보는 사람 쪽 */
  me: "company" | "candidate";
  names: { company: string; candidate: string };
  /** 면접 시각을 고르는 칸 (후보 화면: 아직 고르지 않은 마지막 제안에만) */
  slotPicker?: (mail: OfferMail) => ReactNode;
}) {
  const picked = new Set(mails.map((m) => m.pickedSlot).filter(Boolean) as string[]);
  return (
    <ol className="of-thread">
      {mails.map((m) => {
        const mine = m.from === me;
        return (
          <li key={m.id} className={`of-mail${mine ? "" : " theirs"}`}>
            <div className="of-mail-top">
              <b>{m.from === "company" ? names.company : names.candidate}</b>
              <time dateTime={m.sentAt}>{fullDate(m.sentAt)}</time>
            </div>
            <h3>{m.subject}</h3>
            <p className={`of-body${m.body ? "" : " empty"}`}>{m.body || "본문 없이 근거 카드만 보냈습니다."}</p>
            {m.interviewSlots.length > 0 && (
              <div className="of-slots">
                <p>면접 가능 시각</p>
                {slotPicker?.(m) ?? (
                  <ul>
                    {m.interviewSlots.map((s) => (
                      <li key={s} className={picked.has(s) ? "picked" : undefined}>
                        <time dateTime={s}>{fullDate(s)}</time>
                        {picked.has(s) ? <span>확정</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {m.pickedSlot && (
              <div className="of-slots">
                <p>면접 시각을 골랐습니다</p>
                <ul>
                  <li className="picked"><time dateTime={m.pickedSlot}>{fullDate(m.pickedSlot)}</time></li>
                </ul>
              </div>
            )}
            {mine && <p className="of-read">{m.readAt ? `읽음 · ${fullDate(m.readAt)}` : "아직 읽지 않음"}</p>}
          </li>
        );
      })}
    </ol>
  );
}
