"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("正在完成登入...");

  useEffect(() => {
    async function finishLogin() {
      if (!supabase) {
        setMessage("Supabase 尚未設定，無法完成登入。");
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const errorDescription = searchParams.get("error_description");
      const code = searchParams.get("code");

      if (errorDescription) {
        setMessage(decodeURIComponent(errorDescription));
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          return;
        }
      }

      window.location.replace("/");
    }

    finishLogin();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5f1] px-6 text-[#1f1f1d]">
      <div className="rounded-3xl border border-black/[0.08] bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-[#756e66]">{message}</p>
      </div>
    </main>
  );
}
