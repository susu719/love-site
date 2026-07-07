"use client";

import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthStatus = "idle" | "loading" | "success" | "error";

export function AuthPanel() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && window.location.pathname === "/") {
      window.location.replace(`${window.location.origin}/memories`);
    }
  }, [user]);

  async function handleGoogleLogin() {
    if (!supabase) {
      setStatus("error");
      setMessage("請先設定 Supabase 環境變數。");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    setStatus("loading");
    setMessage("");
    await supabase.auth.signOut();
    setStatus("idle");
  }

  if (user) {
    return (
      <div className="rounded-3xl border border-black/[0.08] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-[#f0ebe4] text-[#8a6b5d]">
            <User size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-[#756e66]">已登入</p>
            <p className="truncate font-medium">{user.email}</p>
          </div>
        </div>
        <a
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full border border-black/[0.1] bg-white px-5 text-sm font-medium transition hover:border-black/[0.18]"
          href="/memories"
        >
          管理回憶
        </a>
        <button
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1f1f1d] px-5 text-sm font-medium text-white transition hover:bg-black"
          onClick={handleLogout}
          type="button"
        >
          <LogOut size={16} />
          登出
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-black/[0.08] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm text-[#8a8379]">登入</p>
        <h2 className="mt-1 text-xl font-semibold">進入兩個人的空間</h2>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mb-4 rounded-2xl bg-[#fff6df] p-4 text-sm leading-6 text-[#7b5b20]">
          尚未設定 Supabase。請建立 `.env.local`，填入
          `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
        </div>
      ) : null}

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#1f1f1d] px-5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        disabled={status === "loading"}
        onClick={handleGoogleLogin}
        type="button"
      >
        使用 Google 登入
      </button>

      <a
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-black/[0.1] bg-[#fbfaf8] px-5 text-sm font-medium transition hover:border-black/[0.18]"
        href="/memories"
      >
        先用 Demo 模式管理回憶
      </a>

      {message ? (
        <p
          className={`mt-4 text-sm leading-6 ${
            status === "error" ? "text-[#b42318]" : "text-[#4d6b45]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
