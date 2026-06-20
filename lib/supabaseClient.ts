// 브라우저용 Supabase 클라이언트 (구독 insert 전용).
// 정적 export(GitHub Pages)에는 서버가 없으므로 Server Action 대신 클라이언트에서 직접 insert한다.
// anon 키만 사용 — RLS가 jobradar_subscribers에 insert만 허용(이메일 형식 검증)하므로 안전.
import { createClient } from "@supabase/supabase-js";

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
