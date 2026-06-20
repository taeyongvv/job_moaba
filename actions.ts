// app/jobs/actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";

export interface SubscribeResult {
  ok: boolean;
  message: string;
}

export async function subscribe(email: string): Promise<SubscribeResult> {
  const value = (email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    return { ok: false, message: "이메일 주소를 확인해 주세요." };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error } = await supabase
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
