"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { MappableMemory } from "@/components/memories/MemoryMap";
import {
  fadeInUp,
  MotionArticle,
  MotionDiv,
  MotionSection,
  pageTransition,
  softHover,
} from "@/components/shared/Motion";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const MemoryMap = dynamic(
  () => import("@/components/memories/MemoryMap").then((mod) => mod.MemoryMap),
  {
    ssr: false,
  },
);

type Memory = MappableMemory;

type MemoryForm = {
  title: string;
  memoryDate: string;
  description: string;
  imageUrl: string;
  latitude: string;
  longitude: string;
};

const emptyForm: MemoryForm = {
  title: "",
  memoryDate: new Date().toISOString().slice(0, 10),
  description: "",
  imageUrl: "",
  latitude: "",
  longitude: "",
};

const demoMemories: Memory[] = [
  {
    id: "demo-1",
    title: "第一次一起做早餐",
    content: "煎蛋有點焦，但咖啡很好喝。",
    memory_date: "2026-06-12",
    latitude: 25.033,
    longitude: 121.5654,
    photos: [
      {
        id: "demo-photo-1",
        image_url:
          "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80",
        caption: null,
      },
    ],
  },
  {
    id: "demo-2",
    title: "河邊散步",
    content: "沒有特別安排，只是剛好天氣很好。",
    memory_date: "2026-05-20",
    latitude: 25.0478,
    longitude: 121.5319,
    photos: [],
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-Hant", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function parseCoordinate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function MemoriesClient() {
  const [user, setUser] = useState<User | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [form, setForm] = useState<MemoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isDemoMode = !isSupabaseConfigured || !user;

  const orderedMemories = useMemo(
    () =>
      [...memories].sort((a, b) => b.memory_date.localeCompare(a.memory_date)),
    [memories],
  );

  useEffect(() => {
    if (!supabase) {
      setMemories(demoMemories);
      setLoading(false);
      setMessage("目前是 Demo 模式；設定 Supabase 並登入後會寫入資料庫。");
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) {
        setMemories(demoMemories);
        setLoading(false);
        setMessage("請先登入。登入前可以用 Demo 模式試操作。");
      }
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
    if (!supabase || !user) {
      return;
    }

    loadMemories(user.id);
  }, [user]);

  async function ensureProfile(currentUser: User) {
    if (!supabase) {
      return;
    }

    await supabase.from("users").upsert({
      id: currentUser.id,
      display_name:
        currentUser.user_metadata.full_name ?? currentUser.email ?? "使用者",
      avatar_url: currentUser.user_metadata.avatar_url ?? null,
    });
  }

  async function loadMemories(userId: string) {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("memories")
      .select(
        "id,title,content,memory_date,latitude,longitude,photos(id,image_url,caption)",
      )
      .eq("user_id", userId)
      .order("memory_date", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMemories((data ?? []) as Memory[]);
    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(memory: Memory) {
    setEditingId(memory.id);
    setForm({
      title: memory.title,
      memoryDate: memory.memory_date,
      description: memory.content ?? "",
      imageUrl: memory.photos[0]?.image_url ?? "",
      latitude: memory.latitude?.toString() ?? "",
      longitude: memory.longitude?.toString() ?? "",
    });
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("請輸入回憶標題。");
      return;
    }

    if (isDemoMode) {
      saveDemoMemory();
      return;
    }

    if (!supabase || !user) {
      return;
    }

    setSaving(true);
    setMessage("");
    await ensureProfile(user);

    const memoryPayload = {
      title: form.title,
      content: form.description,
      memory_date: form.memoryDate,
      latitude: parseCoordinate(form.latitude),
      longitude: parseCoordinate(form.longitude),
    };

    if (editingId) {
      const { error } = await supabase
        .from("memories")
        .update(memoryPayload)
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      await replacePhoto(editingId, user.id, form.imageUrl);
    } else {
      const { data, error } = await supabase
        .from("memories")
        .insert({
          user_id: user.id,
          ...memoryPayload,
        })
        .select("id")
        .single();

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      await replacePhoto(data.id, user.id, form.imageUrl);
    }

    await loadMemories(user.id);
    resetForm();
    setSaving(false);
  }

  async function replacePhoto(
    memoryId: string,
    userId: string,
    imageUrl: string,
  ) {
    if (!supabase) {
      return;
    }

    await supabase.from("photos").delete().eq("memory_id", memoryId);

    if (!imageUrl.trim()) {
      return;
    }

    await supabase.from("photos").insert({
      memory_id: memoryId,
      user_id: userId,
      image_url: imageUrl.trim(),
      sort_order: 0,
    });
  }

  function saveDemoMemory() {
    const nextMemory: Memory = {
      id: editingId ?? crypto.randomUUID(),
      title: form.title,
      content: form.description,
      memory_date: form.memoryDate,
      latitude: parseCoordinate(form.latitude),
      longitude: parseCoordinate(form.longitude),
      photos: form.imageUrl
        ? [
            {
              id: `photo-${editingId ?? crypto.randomUUID()}`,
              image_url: form.imageUrl,
              caption: null,
            },
          ]
        : [],
    };

    setMemories((current) =>
      editingId
        ? current.map((memory) =>
            memory.id === editingId ? nextMemory : memory,
          )
        : [nextMemory, ...current],
    );
    setMessage("Demo 回憶已更新；設定 Supabase 後才會永久保存。");
    resetForm();
  }

  async function deleteMemory(memory: Memory) {
    if (!window.confirm(`確定刪除「${memory.title}」嗎？`)) {
      return;
    }

    if (isDemoMode) {
      setMemories((current) => current.filter((item) => item.id !== memory.id));
      setMessage("Demo 回憶已刪除。");
      return;
    }

    if (!supabase || !user) {
      return;
    }

    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("id", memory.id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadMemories(user.id);
  }

  return (
    <MotionDiv
      {...pageTransition}
      className="min-h-screen bg-[#f7f5f1] text-[#1f1f1d]"
    >
      <header className="border-b border-black/[0.06] bg-[#f7f5f1]/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a className="font-medium" href="/memories">
            回憶管理
          </a>
          <div className="flex items-center gap-5 text-sm text-[#756e66]">
            <a className="transition hover:text-[#1f1f1d]" href="/">
              首頁
            </a>
            <a className="transition hover:text-[#1f1f1d]" href="/photos">
              照片牆
            </a>
            <span>{isDemoMode ? "Demo 模式" : "已連接 Supabase"}</span>
          </div>
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 xl:grid-cols-[0.82fr_1.18fr]">
        <MotionSection {...fadeInUp}>
          <p className="mb-3 text-sm tracking-[0.24em] text-[#a26d62]">
            MEMORIES
          </p>
          <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
            回憶管理
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-[#68625b]">
            新增、修改、刪除你們的回憶。這一版支援日期、描述、圖片網址和地圖座標。
          </p>

          <MotionDiv
            {...fadeInUp}
            className="mt-8 rounded-3xl border border-black/[0.08] bg-white p-5 shadow-sm"
          >
            <form onSubmit={handleSubmit}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingId ? "修改回憶" : "新增回憶"}
                </h2>
                {editingId ? (
                  <button
                    className="inline-flex size-9 items-center justify-center rounded-full border border-black/[0.08]"
                    onClick={resetForm}
                    type="button"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium">標題</span>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="例如：第一次一起看日出"
                    required
                    value={form.title}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">日期</span>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        memoryDate: event.target.value,
                      }))
                    }
                    required
                    type="date"
                    value={form.memoryDate}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">圖片網址</span>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        imageUrl: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    type="url"
                    value={form.imageUrl}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">緯度</span>
                    <input
                      className="mt-2 h-11 w-full rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                      inputMode="decimal"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          latitude: event.target.value,
                        }))
                      }
                      placeholder="25.033"
                      value={form.latitude}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">經度</span>
                    <input
                      className="mt-2 h-11 w-full rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                      inputMode="decimal"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          longitude: event.target.value,
                        }))
                      }
                      placeholder="121.5654"
                      value={form.longitude}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">描述</span>
                  <textarea
                    className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 py-3 text-sm leading-6 outline-none focus:border-black/[0.22]"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="寫下一點當天的心情、對話或小細節。"
                    value={form.description}
                  />
                </label>
              </div>

              <button
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1f1f1d] px-5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
                type="submit"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : null}
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {editingId ? "儲存修改" : "新增回憶"}
              </button>

              {message ? (
                <p className="mt-4 text-sm leading-6 text-[#756e66]">
                  {message}
                </p>
              ) : null}
            </form>
          </MotionDiv>
        </MotionSection>

        <MotionSection {...fadeInUp} className="space-y-5">
          <MotionDiv {...fadeInUp}>
            <MemoryMap memories={orderedMemories} />
          </MotionDiv>

          {loading ? (
            <div className="rounded-3xl border border-black/[0.08] bg-white p-8 text-center text-[#756e66]">
              載入回憶中...
            </div>
          ) : null}

          {!loading && orderedMemories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/[0.16] bg-white p-8 text-center">
              <ImageIcon className="mx-auto mb-4 text-[#a26d62]" size={28} />
              <h2 className="font-semibold">還沒有回憶</h2>
              <p className="mt-2 text-sm text-[#756e66]">
                從左邊新增第一則回憶。
              </p>
            </div>
          ) : null}

          {orderedMemories.map((memory) => (
            <MotionArticle
              {...fadeInUp}
              {...softHover}
              className="overflow-hidden rounded-3xl border border-black/[0.08] bg-white shadow-sm"
              key={memory.id}
            >
              {memory.photos[0]?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={memory.title}
                  className="h-60 w-full object-cover"
                  src={memory.photos[0].image_url}
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-[#ebe6dd] text-[#8a8379]">
                  <ImageIcon size={28} />
                </div>
              )}
              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[#8a8379]">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} />
                    {formatDate(memory.memory_date)}
                  </span>
                  {memory.latitude != null && memory.longitude != null ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={16} />
                      {memory.latitude.toFixed(4)},{" "}
                      {memory.longitude.toFixed(4)}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-2xl font-semibold">{memory.title}</h2>
                <p className="mt-3 leading-7 whitespace-pre-line text-[#68625b]">
                  {memory.content || "沒有描述。"}
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] px-4 text-sm font-medium transition hover:border-black/[0.18]"
                    onClick={() => startEdit(memory)}
                    type="button"
                  >
                    <Pencil size={15} />
                    修改
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#f0c8c0] px-4 text-sm font-medium text-[#a13d2d] transition hover:border-[#d79b90]"
                    onClick={() => deleteMemory(memory)}
                    type="button"
                  >
                    <Trash2 size={15} />
                    刪除
                  </button>
                </div>
              </div>
            </MotionArticle>
          ))}
        </MotionSection>
      </main>
    </MotionDiv>
  );
}
