"use client";

import { useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import styles from "./jobs.module.css";

interface SubscribeResult {
  ok: boolean;
  message: string;
}

// 정적 호스팅(GitHub Pages)이라 Server Action을 쓸 수 없어 클라이언트에서 직접 insert한다.
// 이메일 검증은 클라이언트·DB(RLS WITH CHECK) 양쪽에서 수행된다.
async function subscribe(email: string): Promise<SubscribeResult> {
  const value = (email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    return { ok: false, message: "이메일 주소를 확인해 주세요." };
  }

  const { error } = await supabaseBrowser
    .from("jobradar_subscribers")
    .insert({ email: value });

  if (error) {
    // 23505 = unique_violation
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "이미 구독 중인 이메일이에요."
          : "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    ok: true,
    message: "✓ 구독 신청 완료 — 매주 일요일 오전 10시에 보내드릴게요.",
  };
}

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<SubscribeResult | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await subscribe(email);
      setNote(result);
      if (result.ok) setEmail("");
    });
  };

  return (
    <>
      <div className={styles.subForm}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="you@email.com"
          aria-label="이메일"
          disabled={pending}
        />
        <button type="button" onClick={submit} disabled={pending}>
          {pending ? "신청 중…" : "구독하기"}
        </button>
      </div>
      <div className={`${styles.subNote} ${note ? (note.ok ? styles.ok : styles.err) : ""}`}>
        {note?.message ?? ""}
      </div>
    </>
  );
}
