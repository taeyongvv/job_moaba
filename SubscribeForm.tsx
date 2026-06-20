"use client";

import { useState, useTransition } from "react";
import { subscribe, type SubscribeResult } from "./actions";
import styles from "./jobs.module.css";

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
