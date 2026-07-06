"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  fadeInUp,
  MotionArticle,
  MotionDiv,
  pageTransition,
  softHover,
} from "@/components/shared/Motion";
import { supabase } from "@/lib/supabase";

type GalleryPhoto = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  memories?: {
    title: string;
    memory_date: string;
  } | null;
};

type SortMode = "custom" | "newest" | "oldest";

const demoPhotos: GalleryPhoto[] = [
  {
    id: "demo-photo-1",
    image_url:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=80",
    caption: "一起走過的街角。",
    sort_order: 1,
    created_at: "2026-06-12T10:00:00.000Z",
    memories: { title: "晚餐後散步", memory_date: "2026-06-12" },
  },
  {
    id: "demo-photo-2",
    image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    caption: "週末的光很溫柔。",
    sort_order: 2,
    created_at: "2026-05-20T10:00:00.000Z",
    memories: { title: "週末小旅行", memory_date: "2026-05-20" },
  },
  {
    id: "demo-photo-3",
    image_url:
      "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80",
    caption: "路邊買的一束花。",
    sort_order: 3,
    created_at: "2026-04-08T10:00:00.000Z",
    memories: { title: "普通但可愛的一天", memory_date: "2026-04-08" },
  },
  {
    id: "demo-photo-4",
    image_url:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80",
    caption: "把小日子留下來。",
    sort_order: 4,
    created_at: "2026-03-14T10:00:00.000Z",
    memories: { title: "紀念日晚餐", memory_date: "2026-03-14" },
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-Hant", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function PhotoGalleryClient() {
  const [user, setUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("custom");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const sortedPhotos = useMemo(() => {
    const nextPhotos = [...photos];

    if (sortMode === "newest") {
      return nextPhotos.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
    }

    if (sortMode === "oldest") {
      return nextPhotos.sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
    }

    return nextPhotos.sort((a, b) => a.sort_order - b.sort_order);
  }, [photos, sortMode]);

  const selectedPhoto =
    selectedIndex === null ? null : (sortedPhotos[selectedIndex] ?? null);

  const goToPhoto = useCallback(
    (direction: "previous" | "next") => {
      setSelectedIndex((current) => {
        if (current === null) {
          return current;
        }

        if (direction === "previous") {
          return current === 0 ? sortedPhotos.length - 1 : current - 1;
        }

        return current === sortedPhotos.length - 1 ? 0 : current + 1;
      });
    },
    [sortedPhotos.length],
  );

  useEffect(() => {
    if (!supabase) {
      setPhotos(demoPhotos);
      setLoading(false);
      setMessage("目前是 Demo 模式；設定 Supabase 並登入後會讀取你的照片。");
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) {
        setPhotos(demoPhotos);
        setLoading(false);
        setMessage("請先登入。登入前可以用 Demo 模式預覽相簿。");
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

    loadPhotos(user.id);
  }, [user]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedIndex === null) {
        return;
      }

      if (event.key === "Escape") {
        setSelectedIndex(null);
      }

      if (event.key === "ArrowLeft") {
        goToPhoto("previous");
      }

      if (event.key === "ArrowRight") {
        goToPhoto("next");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPhoto, selectedIndex]);

  async function loadPhotos(userId: string) {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("photos")
      .select(
        "id,image_url,caption,sort_order,created_at,memories(title,memory_date)",
      )
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setPhotos((data ?? []) as unknown as GalleryPhoto[]);
    setLoading(false);
  }

  function movePhoto(photoId: string, direction: "up" | "down") {
    if (sortMode !== "custom") {
      setSortMode("custom");
    }

    setPhotos((current) => {
      const ordered = [...current].sort((a, b) => a.sort_order - b.sort_order);
      const index = ordered.findIndex((photo) => photo.id === photoId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return current;
      }

      const targetPhoto = ordered[targetIndex];
      ordered[targetIndex] = ordered[index];
      ordered[index] = targetPhoto;

      return ordered.map((photo, orderIndex) => ({
        ...photo,
        sort_order: orderIndex + 1,
      }));
    });
  }

  return (
    <MotionDiv
      {...pageTransition}
      className="min-h-screen bg-[#f7f5f1] text-[#1f1f1d]"
    >
      <header className="border-b border-black/[0.06] bg-[#f7f5f1]/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a className="font-medium" href="/photos">
            照片牆
          </a>
          <div className="flex items-center gap-5 text-sm text-[#756e66]">
            <a className="transition hover:text-[#1f1f1d]" href="/">
              首頁
            </a>
            <a className="transition hover:text-[#1f1f1d]" href="/memories">
              回憶管理
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <MotionDiv
          {...fadeInUp}
          className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p className="mb-3 text-sm tracking-[0.24em] text-[#a26d62]">
              PHOTO GALLERY
            </p>
            <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
              照片牆
            </h1>
            <p className="mt-4 max-w-xl leading-7 text-[#68625b]">
              瀑布流展示所有回憶照片，支援 Lightbox、Lazy Loading 和照片排序。
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-full border border-black/[0.08] bg-white p-1 shadow-sm">
            <button
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                sortMode === "custom" ? "bg-[#1f1f1d] text-white" : ""
              }`}
              onClick={() => setSortMode("custom")}
              type="button"
            >
              <GripVertical size={15} />
              自訂排序
            </button>
            <button
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                sortMode === "newest" ? "bg-[#1f1f1d] text-white" : ""
              }`}
              onClick={() => setSortMode("newest")}
              type="button"
            >
              <ArrowDownAZ size={15} />
              最新
            </button>
            <button
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                sortMode === "oldest" ? "bg-[#1f1f1d] text-white" : ""
              }`}
              onClick={() => setSortMode("oldest")}
              type="button"
            >
              <ArrowUpAZ size={15} />
              最舊
            </button>
          </div>
        </MotionDiv>

        {message ? (
          <div className="mb-5 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-[#756e66]">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-black/[0.08] bg-white p-8 text-center text-[#756e66]">
            載入照片中...
          </div>
        ) : null}

        {!loading && sortedPhotos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/[0.16] bg-white p-8 text-center">
            <ImageIcon className="mx-auto mb-4 text-[#a26d62]" size={28} />
            <h2 className="font-semibold">還沒有照片</h2>
            <p className="mt-2 text-sm text-[#756e66]">
              到 Memories 新增含圖片網址的回憶後，照片會出現在這裡。
            </p>
          </div>
        ) : null}

        <section className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {sortedPhotos.map((photo, index) => (
            <MotionArticle
              {...fadeInUp}
              {...softHover}
              className="mb-4 break-inside-avoid overflow-hidden rounded-3xl border border-black/[0.08] bg-white shadow-sm"
              key={photo.id}
            >
              <button
                className="group block w-full text-left"
                onClick={() => setSelectedIndex(index)}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={photo.caption || photo.memories?.title || "回憶照片"}
                  className="w-full bg-[#ebe6dd] object-cover transition duration-300 group-hover:scale-[1.015]"
                  loading="lazy"
                  src={photo.image_url}
                />
              </button>
              <div className="p-4">
                <p className="font-medium">
                  {photo.memories?.title ?? "未命名回憶"}
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-[#8a8379]">
                  <CalendarDays size={15} />
                  {photo.memories?.memory_date
                    ? formatDate(photo.memories.memory_date)
                    : formatDate(photo.created_at)}
                </div>
                {photo.caption ? (
                  <p className="mt-3 text-sm leading-6 text-[#68625b]">
                    {photo.caption}
                  </p>
                ) : null}
                {sortMode === "custom" ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      className="h-9 rounded-full border border-black/[0.08] px-3 text-sm transition hover:border-black/[0.18]"
                      onClick={() => movePhoto(photo.id, "up")}
                      type="button"
                    >
                      上移
                    </button>
                    <button
                      className="h-9 rounded-full border border-black/[0.08] px-3 text-sm transition hover:border-black/[0.18]"
                      onClick={() => movePhoto(photo.id, "down")}
                      type="button"
                    >
                      下移
                    </button>
                  </div>
                ) : null}
              </div>
            </MotionArticle>
          ))}
        </section>
      </main>

      {selectedPhoto ? (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 px-4 py-6 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label="關閉"
            className="absolute top-5 right-5 inline-flex size-11 items-center justify-center rounded-full bg-white text-[#1f1f1d]"
            onClick={() => setSelectedIndex(null)}
            type="button"
          >
            <X size={18} />
          </button>
          <button
            aria-label="上一張"
            className="absolute top-1/2 left-5 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1f1f1d] sm:inline-flex"
            onClick={() => goToPhoto("previous")}
            type="button"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            aria-label="下一張"
            className="absolute top-1/2 right-5 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1f1f1d] sm:inline-flex"
            onClick={() => goToPhoto("next")}
            type="button"
          >
            <ChevronRight size={20} />
          </button>

          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
            <MotionDiv
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={
                  selectedPhoto.caption ||
                  selectedPhoto.memories?.title ||
                  "回憶照片"
                }
                className="max-h-[72vh] w-full bg-black object-contain"
                src={selectedPhoto.image_url}
              />
              <div className="p-5">
                <p className="text-xl font-semibold">
                  {selectedPhoto.memories?.title ?? "未命名回憶"}
                </p>
                <p className="mt-2 text-sm text-[#756e66]">
                  {selectedPhoto.memories?.memory_date
                    ? formatDate(selectedPhoto.memories.memory_date)
                    : formatDate(selectedPhoto.created_at)}
                </p>
                {selectedPhoto.caption ? (
                  <p className="mt-3 leading-7 text-[#68625b]">
                    {selectedPhoto.caption}
                  </p>
                ) : null}
              </div>
            </MotionDiv>
          </div>
        </MotionDiv>
      ) : null}
    </MotionDiv>
  );
}
