"use client";

import { useEffect, useState } from "react";
import { LogOut, Mail, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthStatus = "idle" | "loading" | "success" | "error";

export function AuthPanel() {
  const [email, setEmail] = useState("");
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

  async function handleEmailLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatus("error");
      setMessage("請先設定 Supabase 環境變數。");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage("登入連結已寄出，請到信箱確認。");
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

      <div className="my-5 flex items-center gap-3 text-xs text-[#9a938a]">
        <span className="h-px flex-1 bg-black/[0.08]" />
        或
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <form className="space-y-3" onSubmit={handleEmailLogin}>
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <div className="flex h-11 items-center gap-2 rounded-full border border-black/[0.1] bg-[#fbfaf8] px-4 focus-within:border-black/[0.22]">
          <Mail size={16} className="text-[#8a8379]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa39a]"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/[0.1] bg-white px-5 text-sm font-medium transition hover:border-black/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status === "loading"}
          type="submit"
        >
          寄送 Email 登入連結
        </button>
      </form>

      <a
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border border-black/[0.1] bg-[#fbfaf8] px-5 text-sm font-medium transition hover:border-black/[0.18]"
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
