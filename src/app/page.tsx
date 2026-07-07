import {
  CalendarDays,
  Check,
  Clock3,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import {
  fadeInUp,
  MotionArticle,
  MotionDiv,
  MotionSection,
  pageTransition,
  softHover,
} from "@/components/shared/Motion";

const memories = [
  {
    date: "06.12",
    title: "晚餐後的河邊散步",
    note: "風很安靜，我們聊了很久。",
  },
  {
    date: "05.20",
    title: "一起完成的第一個願望",
    note: "把想去的小店標記成已完成。",
  },
  {
    date: "04.08",
    title: "週末小旅行",
    note: "照片、票根和一段短短的日記。",
  },
];

const wishes = ["去海邊看日出", "做一本年度回憶冊", "找一家固定約會的咖啡店"];

export default function Home() {
  return (
    <MotionDiv
      {...pageTransition}
      className="min-h-screen bg-[#f7f5f1] text-[#1f1f1d]"
    >
      <header className="sticky top-0 z-10 border-b border-black/[0.06] bg-[#f7f5f1]/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a className="flex items-center gap-2 font-medium" href="#">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#1f1f1d] text-white">
              <Heart size={15} fill="currentColor" />
            </span>
            <span>兩個人的日常</span>
          </a>
          <div className="hidden items-center gap-7 text-sm text-[#6f6a63] md:flex">
            <a className="transition hover:text-[#1f1f1d]" href="#dashboard">
              回憶總覽
            </a>
            <a className="transition hover:text-[#1f1f1d]" href="/photos">
              照片牆
            </a>
            <a className="transition hover:text-[#1f1f1d]" href="#login">
              登入
            </a>
            <a className="transition hover:text-[#1f1f1d]" href="#footer">
              關於
            </a>
          </div>
          <a
            className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-black/[0.14]"
            href="#login"
          >
            開始登入
          </a>
        </nav>
      </header>

      <main>
        <MotionSection
          {...fadeInUp}
          className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[0.92fr_1.08fr]"
        >
          <MotionDiv {...fadeInUp}>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-2 text-sm text-[#6f6a63] shadow-sm">
              <Sparkles size={15} />
              私密、安靜、只屬於兩個人
            </div>
            <h1 className="max-w-2xl text-5xl leading-[1.04] font-semibold tracking-normal text-balance sm:text-6xl lg:text-7xl">
              把戀愛裡的小事，收進同一個地方。
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#68625b]">
              一個極簡的雙人空間，用來放紀念日、回憶、留言和一起想完成的願望。現在先完成登入，後續再慢慢加入只屬於你們的內容。
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f1f1d] px-6 text-sm font-medium text-white shadow-sm transition hover:bg-black"
                href="#login"
              >
                前往登入
              </a>
              <a
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/[0.1] bg-white px-6 text-sm font-medium transition hover:border-black/[0.18]"
                href="#dashboard"
              >
                預覽首頁
              </a>
              <a
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/[0.1] bg-white px-6 text-sm font-medium transition hover:border-black/[0.18]"
                href="/photos"
              >
                照片牆
              </a>
            </div>
          </MotionDiv>

          <MotionDiv {...fadeInUp} id="login">
            <AuthPanel />
          </MotionDiv>
        </MotionSection>

        <MotionSection
          {...fadeInUp}
          id="dashboard"
          className="mx-auto max-w-6xl px-5 pb-20 sm:px-8"
        >
          <MotionDiv
            {...softHover}
            className="rounded-[28px] border border-black/[0.08] bg-white p-3 shadow-[0_30px_80px_rgba(35,31,27,0.12)]"
          >
            <div className="rounded-[22px] border border-black/[0.06] bg-[#fbfaf8] p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#8a8379]">今天的我們</p>
                  <h2 className="mt-1 text-xl font-semibold">回憶儀表板</h2>
                </div>
                <div className="flex -space-x-2">
                  <div className="size-9 rounded-full border-2 border-[#fbfaf8] bg-[#e9d3cd]" />
                  <div className="size-9 rounded-full border-2 border-[#fbfaf8] bg-[#cfd8cc]" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MotionDiv
                  {...softHover}
                  className="rounded-2xl border border-black/[0.06] bg-white p-4"
                >
                  <Clock3 className="mb-4 text-[#a26d62]" size={18} />
                  <p className="text-3xl font-semibold">728</p>
                  <p className="mt-1 text-sm text-[#7a736b]">在一起的天數</p>
                </MotionDiv>
                <MotionDiv
                  {...softHover}
                  className="rounded-2xl border border-black/[0.06] bg-white p-4"
                >
                  <CalendarDays className="mb-4 text-[#6f7d65]" size={18} />
                  <p className="text-3xl font-semibold">18</p>
                  <p className="mt-1 text-sm text-[#7a736b]">下一個紀念日</p>
                </MotionDiv>
                <MotionDiv
                  {...softHover}
                  className="rounded-2xl border border-black/[0.06] bg-white p-4"
                >
                  <ImageIcon className="mb-4 text-[#8a735b]" size={18} />
                  <p className="text-3xl font-semibold">42</p>
                  <p className="mt-1 text-sm text-[#7a736b]">照片數</p>
                </MotionDiv>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1.18fr_0.82fr]">
                <section className="rounded-2xl border border-black/[0.06] bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium">最近回憶</h3>
                    <span className="text-sm text-[#8a8379]">Timeline</span>
                  </div>
                  <div className="space-y-3">
                    {memories.map((memory) => (
                      <MotionArticle
                        {...fadeInUp}
                        className="grid grid-cols-[3.5rem_1fr] gap-3 rounded-xl bg-[#f7f5f1] p-3"
                        key={memory.title}
                      >
                        <div className="text-sm font-medium text-[#a26d62]">
                          {memory.date}
                        </div>
                        <div>
                          <p className="font-medium">{memory.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[#756e66]">
                            {memory.note}
                          </p>
                        </div>
                      </MotionArticle>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <MessageCircle size={18} className="text-[#a26d62]" />
                      <h3 className="font-medium">今日留言</h3>
                    </div>
                    <p className="rounded-xl bg-[#f7f5f1] p-4 text-sm leading-7 text-[#5d5751]">
                      「今天也想把一點點時間留給你。晚點一起散步嗎？」
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
                    <h3 className="mb-4 font-medium">願望清單</h3>
                    <div className="space-y-3">
                      {wishes.map((wish) => (
                        <div className="flex items-center gap-3" key={wish}>
                          <span className="flex size-6 items-center justify-center rounded-full bg-[#edf1ea] text-[#6f7d65]">
                            <Check size={14} />
                          </span>
                          <span className="text-sm text-[#5d5751]">{wish}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </MotionDiv>
        </MotionSection>
      </main>

      <footer
        id="footer"
        className="border-t border-black/[0.06] px-5 py-8 text-sm text-[#756e66] sm:px-8"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>兩個人的日常</p>
          <p>使用 Google 登入，安靜保存只屬於你們的回憶。</p>
        </div>
      </footer>
    </MotionDiv>
  );
}
