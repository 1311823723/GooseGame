import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "鹅鸭杀发车助手",
  description: "GooseGame web client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
