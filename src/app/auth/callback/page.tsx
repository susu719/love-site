"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function readAuthError() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("error_description") ??
    hashParams.get("error_description") ??
    searchParams.get("error") ??
    hashParams.get("error")
  );
}

async function waitForSession() {
  if (!supabase) {
    return null;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      return session;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("正在完成登入...");

  useEffect(() => {
    async function finishLogin() {
      if (!supabase) {
        setMessage("尚未設定 Supabase，請先確認環境變數。");
        return;
      }

      const authError = readAuthError();

      if (authError) {
        setMessage(decodeURIComponent(authError));
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const code = searchParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(error.message);
          return;
        }
      }

      window.history.replaceState(null, "", "/auth/callback");

      const session = await waitForSession();

      if (!session) {
        setMessage("登入狀態還沒有建立成功，請回首頁再按一次 Google 登入。");
        return;
      }

      window.location.replace(`${window.location.origin}/memories`);
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
