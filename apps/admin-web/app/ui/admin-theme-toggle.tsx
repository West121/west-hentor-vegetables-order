"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";

import { cn } from "@/app/lib/cn";

type AdminTheme = "dark" | "light";

type ViewTransitionHandle = {
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle;
};

const THEME_STORAGE_KEY = "hentor-admin-theme";

function readStoredTheme(): AdminTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
    ? "dark"
    : "light";
}

function applyTheme(theme: AdminTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.adminTheme = theme;
  root.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function getRevealGeometry(target: HTMLButtonElement, nextTheme: AdminTheme) {
  if (nextTheme === "light") {
    const x = 0;
    const y = window.innerHeight;
    const radius = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight));

    return { radius, x, y };
  }

  const rect = target.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.ceil(
    Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    ),
  );

  return { radius, x, y };
}

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme>("light");
  const isDark = theme === "dark";

  useEffect(() => {
    const nextTheme = readStoredTheme();
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }, []);

  function commitTheme(nextTheme: AdminTheme) {
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    const nextTheme: AdminTheme = isDark ? "light" : "dark";
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const root = document.documentElement;

    if (!reduceMotion) {
      const { radius, x, y } = getRevealGeometry(
        event.currentTarget,
        nextTheme,
      );
      root.style.setProperty("--theme-reveal-x", `${x}px`);
      root.style.setProperty("--theme-reveal-y", `${y}px`);
      root.style.setProperty("--theme-reveal-radius", `${radius}px`);
    }

    const documentWithTransition = document as ViewTransitionDocument;
    const canUseViewTransition =
      !reduceMotion && !!documentWithTransition.startViewTransition;

    if (canUseViewTransition && documentWithTransition.startViewTransition) {
      const transitionClassName = isDark
        ? "theme-transitioning-to-light"
        : "theme-transitioning-to-dark";
      root.classList.add("theme-transitioning", transitionClassName);
      const transition = documentWithTransition.startViewTransition(() => {
        commitTheme(nextTheme);
      });

      transition.finished.finally(() => {
        root.classList.remove("theme-transitioning", transitionClassName);
        root.style.removeProperty("--theme-reveal-x");
        root.style.removeProperty("--theme-reveal-y");
        root.style.removeProperty("--theme-reveal-radius");
      });
      return;
    }

    root.classList.add("theme-fade-transitioning");
    commitTheme(nextTheme);
    window.setTimeout(() => {
      root.classList.remove("theme-fade-transitioning");
      root.style.removeProperty("--theme-reveal-x");
      root.style.removeProperty("--theme-reveal-y");
      root.style.removeProperty("--theme-reveal-radius");
    }, 820);
  }

  return (
    <button
      aria-label={isDark ? "切换浅色主题" : "切换暗色主题"}
      className={cn(
        "group relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-[#dbe6dc] bg-white text-[#1f8f4f] shadow-sm transition hover:border-[#b9d0bf] hover:bg-[#f8fbf7]",
        "dark:border-[#254832] dark:bg-[#102219] dark:text-[#6ee59a] dark:hover:border-[#3f7350] dark:hover:bg-[#132a1d]",
      )}
      onClick={toggleTheme}
      title={isDark ? "浅色主题" : "暗色主题"}
      type="button"
    >
      <span
        className={cn(
          "absolute inset-1 rounded-xl transition-transform duration-300",
          isDark
            ? "translate-x-0 bg-[#193722]"
            : "translate-x-6 bg-[#edf8ef]",
        )}
      />
      <Sun
        className={cn(
          "absolute transition-all duration-300",
          isDark ? "scale-75 opacity-0" : "scale-100 opacity-100",
        )}
        size={18}
      />
      <Moon
        className={cn(
          "absolute transition-all duration-300",
          isDark ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
        size={18}
      />
    </button>
  );
}
