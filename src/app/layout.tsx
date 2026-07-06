import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "雙人情侶網站",
  description: "屬於兩個人的私密回憶空間",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
