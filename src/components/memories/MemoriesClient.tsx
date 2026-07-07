"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
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
import { RelationshipStats } from "@/components/dashboard/RelationshipStats";
import { readPhotoLocation } from "@/lib/photo-location";
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

type DailyMessage = {
  id: string;
  content: string;
  message_date: string;
};

type WishItem = {
  id: string;
  done: boolean;
  title: string;
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

const defaultDailyMessages: DailyMessage[] = [
  {
    id: "message-1",
    content: "今天也想把一點點時間留給你。晚點一起散步嗎？",
    message_date: new Date().toISOString().slice(0, 10),
  },
  {
    id: "message-2",
    content: "把普通的一天也存起來，之後回頭看會很可愛。",
    message_date: "2026-07-06",
  },
];

const defaultWishes: WishItem[] = [
  { id: "wish-1", done: false, title: "去海邊看日出" },
  { id: "wish-2", done: false, title: "做一本年度回憶冊" },
  { id: "wish-3", done: false, title: "找一家固定約會的咖啡店" },
];

const dailyMessagesKey = "love-site.daily-messages";
const wishesKey = "love-site.wishes";

function normalizeDailyMessages(value: unknown): DailyMessage[] {
  if (!Array.isArray(value)) {
    return defaultDailyMessages;
  }

  return value
    .filter(
      (message): message is Partial<DailyMessage> & { date?: string } =>
        typeof message === "object" &&
        message !== null &&
        typeof message.content === "string",
    )
    .map((message) => ({
      id: typeof message.id === "string" ? message.id : crypto.randomUUID(),
      content: message.content ?? "",
      message_date:
        typeof message.message_date === "string"
          ? message.message_date
          : typeof message.date === "string"
            ? message.date
            : new Date().toISOString().slice(0, 10),
    }));
}

function normalizeWishes(value: unknown): WishItem[] {
  if (!Array.isArray(value)) {
    return defaultWishes;
  }

  return value
    .filter(
      (wish): wish is Partial<WishItem> =>
        typeof wish === "object" &&
        wish !== null &&
        typeof wish.title === "string",
    )
    .map((wish) => ({
      id: typeof wish.id === "string" ? wish.id : crypto.randomUUID(),
      done: Boolean(wish.done),
      title: wish.title ?? "",
    }));
}

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

function normalizeImageUrl(url: string) {
  const trimmedUrl = url.trim();
  const driveFileMatch = trimmedUrl.match(
    /^https:\/\/drive\.google\.com\/file\/d\/([^/]+)/,
  );
  const driveOpenMatch = trimmedUrl.match(
    /^https:\/\/drive\.google\.com\/open\?id=([^&]+)/,
  );
  const driveUcMatch = trimmedUrl.match(
    /^https:\/\/drive\.google\.com\/uc\?[^#]*id=([^&]+)/,
  );

  const googleDriveFileId =
    driveFileMatch?.[1] ?? driveOpenMatch?.[1] ?? driveUcMatch?.[1];

  if (googleDriveFileId) {
    return `https://drive.google.com/thumbnail?id=${googleDriveFileId}&sz=w1200`;
  }

  return trimmedUrl;
}

function parseImageUrls(value: string) {
  return value.split(/\r?\n/).map(normalizeImageUrl).filter(Boolean);
}

function getPhotoUrlFields(value: string) {
  const fields = value.split(/\r?\n/);
  return fields.length > 0 && fields.some((field) => field.trim())
    ? fields
    : [""];
}

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "jpg";
}

async function isHeicFile(file: File) {
  const extension = getFileExtension(file);

  if (
    file.type.toLowerCase().includes("heic") ||
    file.type.toLowerCase().includes("heif") ||
    extension === "heic" ||
    extension === "heif"
  ) {
    return true;
  }

  const signature = new Uint8Array(await file.slice(4, 12).arrayBuffer());
  const textSignature = new TextDecoder().decode(signature);
  return textSignature === "ftypheic" || textSignature === "ftypheif";
}

async function prepareImageForUpload(file: File) {
  if (!(await isHeicFile(file))) {
    return file;
  }

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    quality: 0.9,
    toType: "image/jpeg",
  });
  const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
  const jpgName = file.name.replace(/\.(heic|heif|png)$/i, ".jpg");

  return new File([convertedBlob], jpgName, {
    lastModified: file.lastModified,
    type: "image/jpeg",
  });
}

function isBrowserDisplayableImage(url: string) {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return !cleanUrl.endsWith(".heic") && !cleanUrl.endsWith(".heif");
}

function MemoryCover({
  memory,
  photoCount,
}: {
  memory: Memory;
  photoCount: number;
}) {
  const displayablePhotos = memory.photos.filter((photo) =>
    isBrowserDisplayableImage(photo.image_url),
  );
  const fallbackPhotos =
    displayablePhotos.length > 0 ? displayablePhotos : memory.photos;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hasTriedAllPhotos, setHasTriedAllPhotos] = useState(false);
  const coverPhoto = fallbackPhotos[photoIndex] ?? null;

  if (!coverPhoto?.image_url) {
    return (
      <div className="flex h-40 items-center justify-center bg-[#ebe6dd] text-[#8a8379]">
        <ImageIcon size={28} />
      </div>
    );
  }

  return (
    <div className="relative">
      {hasTriedAllPhotos ? (
        <div className="flex h-60 flex-col items-center justify-center gap-2 bg-[#ebe6dd] px-6 text-center text-[#8a8379]">
          <ImageIcon size={28} />
          <p className="text-sm">照片載入失敗</p>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          alt={memory.title}
          className="h-60 w-full object-cover"
          onError={() =>
            setPhotoIndex((current) => {
              if (current + 1 < fallbackPhotos.length) {
                return current + 1;
              }

              setHasTriedAllPhotos(true);
              return current;
            })
          }
          src={coverPhoto.image_url}
        />
      )}
      {photoCount > 1 ? (
        <span className="absolute right-4 bottom-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#1f1f1d] shadow-sm backdrop-blur">
          共 {photoCount} 張照片
        </span>
      ) : null}
    </div>
  );
}

export function MemoriesClient() {
  const [user, setUser] = useState<User | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [form, setForm] = useState<MemoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isWishesOpen, setIsWishesOpen] = useState(false);
  const [dailyMessages, setDailyMessages] =
    useState<DailyMessage[]>(defaultDailyMessages);
  const [newDailyMessage, setNewDailyMessage] = useState("");
  const [wishes, setWishes] = useState<WishItem[]>(defaultWishes);
  const [newWish, setNewWish] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const isDemoMode = !isSupabaseConfigured || !user;
  const displayName =
    user?.user_metadata.full_name ??
    user?.user_metadata.name ??
    user?.email ??
    "已登入";
  const todayMessage = dailyMessages[0];

  const orderedMemories = useMemo(
    () =>
      [...memories].sort((a, b) => b.memory_date.localeCompare(a.memory_date)),
    [memories],
  );
  const photoUrlFields = getPhotoUrlFields(form.imageUrl);

  useEffect(() => {
    if (!supabase) {
      setMemories(demoMemories);
      setLoading(false);
      setMessage("目前是 Demo 模式；設定 Supabase 並登入後會寫入資料庫。");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;

      setUser(sessionUser);
      if (!sessionUser) {
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
    const savedMessages = window.localStorage.getItem(dailyMessagesKey);
    const savedWishes = window.localStorage.getItem(wishesKey);

    if (savedMessages) {
      setDailyMessages(normalizeDailyMessages(JSON.parse(savedMessages)));
    }

    if (savedWishes) {
      setWishes(normalizeWishes(JSON.parse(savedWishes)));
    }
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    loadMemories(user.id);
    loadDailyMessages(user.id);
    loadWishes(user.id);
  }, [user]);

  async function handlePhotoLocationFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const location = await readPhotoLocation(file);

      if (!location) {
        setMessage(
          "這張照片沒有可讀取的定位資訊。請試試手機原始照片，或手動填入經緯度。",
        );
        return;
      }

      setForm((current) => ({
        ...current,
        latitude: location.latitude.toFixed(6),
        longitude: location.longitude.toFixed(6),
      }));
      setMessage("已從照片讀取定位，並填入地圖座標。");
    } catch {
      setMessage("讀取照片定位時發生問題，請換一張原始照片再試試。");
    } finally {
      event.target.value = "";
    }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    if (!supabase || !user) {
      setMessage("請先登入並設定 Supabase，才能直接上傳照片。");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage(`正在上傳 ${files.length} 張照片...`);

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const uploadFile = await prepareImageForUpload(file);
      const filePath = `${user.id}/${crypto.randomUUID()}.${getFileExtension(uploadFile)}`;
      const { error } = await supabase.storage
        .from("memory-photos")
        .upload(filePath, uploadFile, {
          cacheControl: "3600",
          contentType: uploadFile.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        setMessage(error.message);
        setUploading(false);
        event.target.value = "";
        return;
      }

      const { data } = supabase.storage
        .from("memory-photos")
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);

      if (!form.latitude || !form.longitude) {
        try {
          const location = await readPhotoLocation(file);

          if (location) {
            setForm((current) => ({
              ...current,
              latitude: current.latitude || location.latitude.toFixed(6),
              longitude: current.longitude || location.longitude.toFixed(6),
            }));
          }
        } catch {
          // Photo location is optional; upload should still succeed.
        }
      }
    }

    setForm((current) => ({
      ...current,
      imageUrl: [...parseImageUrls(current.imageUrl), ...uploadedUrls].join(
        "\n",
      ),
    }));
    setMessage(`已上傳 ${uploadedUrls.length} 張照片。`);
    setUploading(false);
    event.target.value = "";
  }

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
        "id,title,content,memory_date,latitude,longitude,photos(id,image_url,caption,latitude,longitude)",
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

  async function loadDailyMessages(userId: string) {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("daily_messages")
      .select("id,content,message_date")
      .eq("user_id", userId)
      .order("message_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setDailyMessages((data ?? []) as DailyMessage[]);
  }

  async function loadWishes(userId: string) {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("bucket_list")
      .select("id,title,status")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setWishes(
      (data ?? []).map((wish) => ({
        id: wish.id,
        done: wish.status === "completed",
        title: wish.title,
      })),
    );
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setMemories(demoMemories);
    setMessage("已登出，現在回到 Demo 模式。");
  }

  function saveDailyMessages(nextMessages: DailyMessage[]) {
    setDailyMessages(nextMessages);
    window.localStorage.setItem(dailyMessagesKey, JSON.stringify(nextMessages));
  }

  async function addDailyMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newDailyMessage.trim()) {
      return;
    }

    if (!isDemoMode && supabase && user) {
      await ensureProfile(user);

      const { error } = await supabase.from("daily_messages").insert({
        user_id: user.id,
        content: newDailyMessage.trim(),
        message_date: new Date().toISOString().slice(0, 10),
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setNewDailyMessage("");
      setIsMessagesOpen(true);
      await loadDailyMessages(user.id);
      return;
    }

    saveDailyMessages([
      {
        id: crypto.randomUUID(),
        content: newDailyMessage.trim(),
        message_date: new Date().toISOString().slice(0, 10),
      },
      ...dailyMessages,
    ]);
    setNewDailyMessage("");
    setIsMessagesOpen(true);
  }

  async function deleteDailyMessage(id: string) {
    if (!isDemoMode && supabase && user) {
      const { error } = await supabase
        .from("daily_messages")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      await loadDailyMessages(user.id);
      return;
    }

    saveDailyMessages(
      dailyMessages.filter((dailyMessage) => dailyMessage.id !== id),
    );
  }

  function saveWishes(nextWishes: WishItem[]) {
    setWishes(nextWishes);
    window.localStorage.setItem(wishesKey, JSON.stringify(nextWishes));
  }

  async function addWish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newWish.trim()) {
      return;
    }

    if (!isDemoMode && supabase && user) {
      await ensureProfile(user);

      const { error } = await supabase.from("bucket_list").insert({
        user_id: user.id,
        title: newWish.trim(),
        status: "pending",
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setNewWish("");
      setIsWishesOpen(true);
      await loadWishes(user.id);
      return;
    }

    saveWishes([
      ...wishes,
      {
        id: crypto.randomUUID(),
        done: false,
        title: newWish.trim(),
      },
    ]);
    setNewWish("");
    setIsWishesOpen(true);
  }

  async function toggleWish(id: string) {
    if (!isDemoMode && supabase && user) {
      const currentWish = wishes.find((wish) => wish.id === id);

      if (!currentWish) {
        return;
      }

      const { error } = await supabase
        .from("bucket_list")
        .update({
          completed_at: currentWish.done ? null : new Date().toISOString(),
          status: currentWish.done ? "pending" : "completed",
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      await loadWishes(user.id);
      return;
    }

    saveWishes(
      wishes.map((wish) =>
        wish.id === id ? { ...wish, done: !wish.done } : wish,
      ),
    );
  }

  async function deleteWish(id: string) {
    if (!isDemoMode && supabase && user) {
      const { error } = await supabase
        .from("bucket_list")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      await loadWishes(user.id);
      return;
    }

    saveWishes(wishes.filter((wish) => wish.id !== id));
  }

  function updatePhotoUrl(index: number, value: string) {
    const nextImageUrls = getPhotoUrlFields(form.imageUrl);

    nextImageUrls[index] = value;

    setForm((current) => ({
      ...current,
      imageUrl: nextImageUrls.join("\n"),
    }));
  }

  function addPhotoUrl() {
    setForm((current) => ({
      ...current,
      imageUrl: [...getPhotoUrlFields(current.imageUrl), ""].join("\n"),
    }));
  }

  function removePhotoUrl(index: number) {
    const nextImageUrls = getPhotoUrlFields(form.imageUrl).filter(
      (_url, urlIndex) => urlIndex !== index,
    );

    setForm((current) => ({
      ...current,
      imageUrl: (nextImageUrls.length > 0 ? nextImageUrls : [""]).join("\n"),
    }));
  }

  function startEdit(memory: Memory) {
    const photoLocation = memory.photos.find(
      (photo) => photo.latitude != null && photo.longitude != null,
    );

    setEditingId(memory.id);
    setForm({
      title: memory.title,
      memoryDate: memory.memory_date,
      description: memory.content ?? "",
      imageUrl: memory.photos.map((photo) => photo.image_url).join("\n"),
      latitude: (memory.latitude ?? photoLocation?.latitude)?.toString() ?? "",
      longitude:
        (memory.longitude ?? photoLocation?.longitude)?.toString() ?? "",
    });
    setMessage("");
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
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

    const imageUrls = parseImageUrls(imageUrl);

    if (imageUrls.length === 0) {
      return;
    }

    await supabase.from("photos").insert(
      imageUrls.map((url, index) => ({
        memory_id: memoryId,
        user_id: userId,
        image_url: url,
        latitude: parseCoordinate(form.latitude),
        longitude: parseCoordinate(form.longitude),
        sort_order: index,
      })),
    );
  }

  function saveDemoMemory() {
    const imageUrls = parseImageUrls(form.imageUrl);

    const nextMemory: Memory = {
      id: editingId ?? crypto.randomUUID(),
      title: form.title,
      content: form.description,
      memory_date: form.memoryDate,
      latitude: parseCoordinate(form.latitude),
      longitude: parseCoordinate(form.longitude),
      photos: imageUrls.map((url, index) => ({
        id: `photo-${editingId ?? crypto.randomUUID()}-${index}`,
        image_url: url,
        caption: null,
      })),
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
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-[#756e66] sm:gap-5">
            <a className="transition hover:text-[#1f1f1d]" href="/">
              首頁
            </a>
            <a className="transition hover:text-[#1f1f1d]" href="/photos">
              照片牆
            </a>
            {isDemoMode ? (
              <span>Demo 模式</span>
            ) : (
              <div className="flex items-center gap-3 rounded-full border border-black/[0.08] bg-white/70 px-3 py-1.5 text-[#1f1f1d] shadow-sm">
                <span className="max-w-32 truncate sm:max-w-44">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[#756e66] transition hover:bg-[#f0ece5] hover:text-[#1f1f1d]"
                >
                  <LogOut className="size-3.5" />
                  登出
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
        <RelationshipStats />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pt-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <MotionDiv
          {...fadeInUp}
          className="rounded-3xl border border-black/[0.08] bg-white p-5 shadow-sm"
        >
          <button
            className="mb-4 flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setIsMessagesOpen((current) => !current)}
            type="button"
          >
            <span className="flex items-center gap-2">
              <MessageCircle size={18} className="text-[#a26d62]" />
              <span className="font-semibold">今日留言</span>
            </span>
            <ChevronDown
              className={`text-[#8a8379] transition ${
                isMessagesOpen ? "rotate-180" : ""
              }`}
              size={18}
            />
          </button>
          <p className="rounded-2xl bg-[#f7f5f1] p-4 text-sm leading-7 text-[#5d5751]">
            「{todayMessage?.content ?? "今天還沒有留言。"}」
          </p>

          {isMessagesOpen ? (
            <div className="mt-4 space-y-4">
              <form className="flex gap-2" onSubmit={addDailyMessage}>
                <input
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                  onChange={(event) => setNewDailyMessage(event.target.value)}
                  placeholder="寫下今天想留給對方的話"
                  value={newDailyMessage}
                />
                <button
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#1f1f1d] px-4 text-sm font-medium text-white transition hover:bg-black"
                  type="submit"
                >
                  <Plus size={15} />
                  新增
                </button>
              </form>

              <div className="space-y-2">
                {dailyMessages.map((dailyMessage) => (
                  <div
                    className="rounded-2xl border border-black/[0.06] bg-[#fbfaf8] p-4"
                    key={dailyMessage.id}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-[#8a8379]">
                        {formatDate(dailyMessage.message_date)}
                      </span>
                      <button
                        aria-label="刪除留言"
                        className="inline-flex size-8 items-center justify-center rounded-full text-[#a13d2d] transition hover:bg-[#f8e8e4]"
                        onClick={() => deleteDailyMessage(dailyMessage.id)}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm leading-7 text-[#5d5751]">
                      {dailyMessage.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </MotionDiv>

        <MotionDiv
          {...fadeInUp}
          className="rounded-3xl border border-black/[0.08] bg-white p-5 shadow-sm"
        >
          <button
            className="mb-4 flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setIsWishesOpen((current) => !current)}
            type="button"
          >
            <span className="font-semibold">願望清單</span>
            <ChevronDown
              className={`text-[#8a8379] transition ${
                isWishesOpen ? "rotate-180" : ""
              }`}
              size={18}
            />
          </button>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {wishes.map((wish) => (
              <div className="flex items-center gap-3" key={wish.id}>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    wish.done
                      ? "bg-[#6f7d65] text-white"
                      : "bg-[#edf1ea] text-[#6f7d65]"
                  }`}
                >
                  {wish.done ? <Check size={15} /> : null}
                </span>
                <span
                  className={`text-sm leading-6 text-[#5d5751] ${
                    wish.done ? "line-through opacity-60" : ""
                  }`}
                >
                  {wish.title}
                </span>
              </div>
            ))}
          </div>

          {isWishesOpen ? (
            <div className="mt-4 space-y-4">
              <form className="flex gap-2" onSubmit={addWish}>
                <input
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                  onChange={(event) => setNewWish(event.target.value)}
                  placeholder="新增想一起完成的事"
                  value={newWish}
                />
                <button
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#1f1f1d] px-4 text-sm font-medium text-white transition hover:bg-black"
                  type="submit"
                >
                  <Plus size={15} />
                  新增
                </button>
              </form>

              <div className="space-y-2">
                {wishes.map((wish) => (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-[#fbfaf8] p-3"
                    key={wish.id}
                  >
                    <button
                      aria-label={wish.done ? "標記未完成" : "標記完成"}
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition ${
                        wish.done
                          ? "border-[#6f7d65] bg-[#6f7d65] text-white"
                          : "border-black/[0.12] bg-white text-transparent hover:text-[#6f7d65]"
                      }`}
                      onClick={() => toggleWish(wish.id)}
                      type="button"
                    >
                      <Check size={15} />
                    </button>
                    <span
                      className={`min-w-0 flex-1 text-sm leading-6 ${
                        wish.done
                          ? "text-[#8a8379] line-through"
                          : "text-[#5d5751]"
                      }`}
                    >
                      {wish.title}
                    </span>
                    <button
                      aria-label="刪除願望"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#a13d2d] transition hover:bg-[#f8e8e4]"
                      onClick={() => deleteWish(wish.id)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </MotionDiv>
      </section>

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
            ref={formRef}
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
                  <textarea
                    className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 py-3 text-sm leading-6 outline-none focus:border-black/[0.22]"
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
                  <div className="mt-2 space-y-2">
                    {photoUrlFields.map((url, index) => (
                      <div className="flex gap-2" key={index}>
                        <input
                          className="h-11 min-w-0 flex-1 rounded-2xl border border-black/[0.1] bg-[#fbfaf8] px-4 text-sm outline-none focus:border-black/[0.22]"
                          onChange={(event) =>
                            updatePhotoUrl(index, event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addPhotoUrl();
                            }
                          }}
                          placeholder={`第 ${index + 1} 張照片網址`}
                          type="url"
                          value={url}
                        />
                        {photoUrlFields.length > 1 ? (
                          <button
                            aria-label="移除照片網址"
                            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#f0c8c0] text-[#a13d2d] transition hover:border-[#d79b90]"
                            onClick={() => removePhotoUrl(index)}
                            type="button"
                          >
                            <X size={15} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] px-4 text-sm font-medium transition hover:border-black/[0.18]"
                    onClick={addPhotoUrl}
                    type="button"
                  >
                    <Plus size={15} />
                    新增一張照片
                  </button>
                  <span className="mt-2 block text-xs leading-5 text-[#8a8379]">
                    一行放一張照片網址；第一張會當成回憶封面。
                  </span>
                </label>

                <label className="block rounded-2xl border border-dashed border-black/[0.14] bg-[#fbfaf8] p-4">
                  <span className="text-sm font-medium">從裝置選擇照片</span>
                  <p className="mt-1 text-xs leading-5 text-[#8a8379]">
                    可一次選多張。手機會開啟相簿選擇器，只會讀取你選的照片。
                  </p>
                  <input
                    accept="image/*"
                    className="mt-3 block w-full text-sm text-[#756e66] file:mr-4 file:h-9 file:rounded-full file:border-0 file:bg-[#1f1f1d] file:px-4 file:text-sm file:font-medium file:text-white"
                    disabled={uploading || isDemoMode}
                    multiple
                    onChange={handlePhotoUpload}
                    type="file"
                  />
                  {uploading ? (
                    <p className="mt-2 text-xs leading-5 text-[#756e66]">
                      照片上傳中...
                    </p>
                  ) : null}
                  {isDemoMode ? (
                    <p className="mt-2 text-xs leading-5 text-[#a26d62]">
                      直接上傳需要先完成 Supabase 登入設定。
                    </p>
                  ) : null}
                </label>

                <label className="block rounded-2xl border border-dashed border-black/[0.14] bg-[#fbfaf8] p-4">
                  <span className="text-sm font-medium">從照片讀取定位</span>
                  <p className="mt-1 text-xs leading-5 text-[#8a8379]">
                    選擇手機原始照片，若照片內含 GPS，會自動填入下方經緯度。
                  </p>
                  <input
                    accept="image/*"
                    className="mt-3 block w-full text-sm text-[#756e66] file:mr-4 file:h-9 file:rounded-full file:border-0 file:bg-[#1f1f1d] file:px-4 file:text-sm file:font-medium file:text-white"
                    onChange={handlePhotoLocationFile}
                    type="file"
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
                disabled={saving || uploading}
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
            <MemoryMap
              memories={orderedMemories}
              onDeleteMemory={deleteMemory}
              onEditMemory={startEdit}
            />
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

          {orderedMemories.map((memory) => {
            return (
              <MotionArticle
                {...fadeInUp}
                {...softHover}
                className="overflow-hidden rounded-3xl border border-black/[0.08] bg-white shadow-sm"
                key={memory.id}
              >
                <MemoryCover
                  memory={memory}
                  photoCount={memory.photos.length}
                />
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
            );
          })}
        </MotionSection>
      </main>
    </MotionDiv>
  );
}
