import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const themeInitScript = `
try {
  var theme = window.localStorage.getItem("hentor-admin-theme");
  var root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.dataset.adminTheme = "dark";
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.dataset.adminTheme = "light";
    root.style.colorScheme = "light";
  }
} catch (error) {}
`;

export const metadata: Metadata = {
  title: "Hentor Fresh 运营台",
  description: "蔬菜预订系统管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={cn("font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
