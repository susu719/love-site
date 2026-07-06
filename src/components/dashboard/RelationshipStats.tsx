"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Heart,
  Image as ImageIcon,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { MotionDiv, softHover } from "@/components/shared/Motion";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Anniversary = {
  id: string;
  title: string;
  date: string;
};

type RelationshipSettings = {
  anniversaries: Anniversary[];
  startDate: string;
};

const defaultSettings: RelationshipSettings = {
  anniversaries: [
    {
      id: "first-day",
      title: "在一起紀念日",
      date: "2024-07-08",
    },
  ],
  startDate: "2024-07-08",
};

const relationshipSettingsKey = "love-site.relationship-settings";

function createId() {
  return crypto.randomUUID();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-Hant", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function getTodayOnly() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getDaysBetween(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  return Math.max(
    1,
    Math.floor((getTodayOnly().getTime() - start.getTime()) / 86400000) + 1,
  );
}

function getNextDate(date: string) {
  const originalDate = new Date(`${date}T00:00:00`);
  const today = getTodayOnly();
  const nextDate = new Date(
    today.getFullYear(),
    originalDate.getMonth(),
    originalDate.getDate(),
  );

  if (nextDate < today) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return {
    daysLeft: Math.ceil((nextDate.getTime() - today.getTime()) / 86400000),
    nextDate,
    yearCount: nextDate.getFullYear() - originalDate.getFullYear(),
  };
}

function getUpcomingAnniversaries(anniversaries: Anniversary[]) {
  return anniversaries
    .filter((anniversary) => anniversary.title.trim() && anniversary.date)
    .map((anniversary) => ({
      ...anniversary,
      ...getNextDate(anniversary.date),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function normalizeSettings(value: unknown): RelationshipSettings {
  if (!value || typeof value !== "object") {
    return defaultSettings;
  }

  const maybeSettings = value as Partial<
    RelationshipSettings & { anniversaryDate: string }
  >;
  const startDate =
    typeof maybeSettings.startDate === "string"
      ? maybeSettings.startDate
      : defaultSettings.startDate;
  const anniversaries = Array.isArray(maybeSettings.anniversaries)
    ? maybeSettings.anniversaries.filter(
        (anniversary): anniversary is Anniversary =>
          typeof anniversary?.id === "string" &&
          typeof anniversary?.title === "string" &&
          typeof anniversary?.date === "string",
      )
    : maybeSettings.anniversaryDate
      ? [
          {
            id: "first-day",
            title: "在一起紀念日",
            date: maybeSettings.anniversaryDate,
          },
        ]
      : defaultSettings.anniversaries;

  return {
    anniversaries:
      anniversaries.length > 0 ? anniversaries : defaultSettings.anniversaries,
    startDate,
  };
}

export function RelationshipStats() {
  const [settings, setSettings] =
    useState<RelationshipSettings>(defaultSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  const daysTogether = useMemo(
    () => getDaysBetween(settings.startDate),
    [settings.startDate],
  );
  const upcomingAnniversaries = useMemo(
    () => getUpcomingAnniversaries(settings.anniversaries),
    [settings.anniversaries],
  );
  const nextAnniversary = upcomingAnniversaries[0] ?? null;

  useEffect(() => {
    const savedSettings = window.localStorage.getItem(relationshipSettingsKey);

    if (savedSettings) {
      setSettings(normalizeSettings(JSON.parse(savedSettings)));
    }
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (!supabase || !isSupabaseConfigured) {
        setMemoryCount(0);
        setPhotoCount(0);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMemoryCount(0);
        setPhotoCount(0);
        return;
      }

      const [{ count: memories }, { count: photos }] = await Promise.all([
        supabase
          .from("memories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setMemoryCount(memories ?? 0);
      setPhotoCount(photos ?? 0);
    }

    loadStats();
  }, []);

  function updateSettings(nextSettings: RelationshipSettings) {
    setSettings(nextSettings);
    window.localStorage.setItem(
      relationshipSettingsKey,
      JSON.stringify(nextSettings),
    );
  }

  function updateAnniversary(id: string, nextValue: Partial<Anniversary>) {
    updateSettings({
      ...settings,
      anniversaries: settings.anniversaries.map((anniversary) =>
        anniversary.id === id ? { ...anniversary, ...nextValue } : anniversary,
      ),
    });
  }

  function addAnniversary() {
    updateSettings({
      ...settings,
      anniversaries: [
        ...settings.anniversaries,
        {
          id: createId(),
          title: "",
          date: new Date().toISOString().slice(0, 10),
        },
      ],
    });
  }

  function deleteAnniversary(id: string) {
    const nextAnniversaries = settings.anniversaries.filter(
      (anniversary) => anniversary.id !== id,
    );

    updateSettings({
      ...settings,
      anniversaries:
        nextAnniversaries.length > 0
          ? nextAnniversaries
          : defaultSettings.anniversaries,
    });
  }

  return (
    <MotionDiv
      {...softHover}
      className="rounded-[28px] border border-black/[0.08] bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#8a8379]">OUR DAYS</p>
          <h2 className="mt-1 text-xl font-semibold">我們的數據</h2>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-[#fbfaf8] px-4 text-sm font-medium transition hover:border-black/[0.18]"
          onClick={() => setIsEditing((current) => !current)}
          type="button"
        >
          {isEditing ? <X size={15} /> : <Settings2 size={15} />}
          {isEditing ? "收起" : "調整"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Clock3 size={18} />}
          label="在一起的天數"
          tone="rose"
          value={daysTogether}
        />
        <StatCard
          icon={<CalendarDays size={18} />}
          label={nextAnniversary?.title ?? "下一個紀念日"}
          tone="green"
          value={nextAnniversary?.daysLeft ?? 0}
        />
        <StatCard
          icon={<Heart size={18} />}
          label="回憶數"
          tone="rose"
          value={memoryCount}
        />
        <StatCard
          icon={<ImageIcon size={18} />}
          label="照片數"
          tone="brown"
          value={photoCount}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-black/[0.06] bg-[#fbfaf8] p-4">
        <p className="text-sm text-[#8a8379]">最近的紀念日</p>
        {nextAnniversary ? (
          <p className="mt-1 text-lg font-semibold">
            {nextAnniversary.title}，{formatDate(nextAnniversary.nextDate)}
            {nextAnniversary.yearCount > 0
              ? `，第 ${nextAnniversary.yearCount} 週年`
              : ""}
          </p>
        ) : (
          <p className="mt-1 text-lg font-semibold">尚未新增紀念日</p>
        )}
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-black/[0.06] bg-[#fbfaf8] p-4">
          <label className="grid gap-2 text-sm text-[#756e66] md:max-w-sm">
            <span>在一起的開始日</span>
            <input
              className="h-11 rounded-full border border-black/[0.08] bg-white px-4 text-[#1f1f1d] transition outline-none focus:border-black/[0.18]"
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  startDate: event.target.value,
                })
              }
              type="date"
              value={settings.startDate}
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">紀念日清單</h3>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-medium transition hover:border-black/[0.18]"
                onClick={addAnniversary}
                type="button"
              >
                <Plus size={15} />
                新增
              </button>
            </div>

            {settings.anniversaries.map((anniversary) => (
              <div
                className="grid gap-2 rounded-2xl border border-black/[0.06] bg-white p-3 md:grid-cols-[1fr_12rem_auto] md:items-center"
                key={anniversary.id}
              >
                <input
                  className="h-11 rounded-full border border-black/[0.08] bg-[#fbfaf8] px-4 text-sm text-[#1f1f1d] transition outline-none focus:border-black/[0.18]"
                  onChange={(event) =>
                    updateAnniversary(anniversary.id, {
                      title: event.target.value,
                    })
                  }
                  placeholder="例如：第一次約會"
                  value={anniversary.title}
                />
                <input
                  className="h-11 rounded-full border border-black/[0.08] bg-[#fbfaf8] px-4 text-sm text-[#1f1f1d] transition outline-none focus:border-black/[0.18]"
                  onChange={(event) =>
                    updateAnniversary(anniversary.id, {
                      date: event.target.value,
                    })
                  }
                  type="date"
                  value={anniversary.date}
                />
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#f0c8c0] px-4 text-sm font-medium text-[#a13d2d] transition hover:border-[#d79b90]"
                  onClick={() => deleteAnniversary(anniversary.id)}
                  type="button"
                >
                  <Trash2 size={15} />
                  刪除
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </MotionDiv>
  );
}

function StatCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "brown" | "green" | "rose";
  value: number;
}) {
  const iconColor = {
    brown: "text-[#8a735b]",
    green: "text-[#6f7d65]",
    rose: "text-[#a26d62]",
  }[tone];

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-[#fbfaf8] p-4">
      <div className={`mb-4 ${iconColor}`}>{icon}</div>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-sm text-[#7a736b]">{label}</p>
    </div>
  );
}
