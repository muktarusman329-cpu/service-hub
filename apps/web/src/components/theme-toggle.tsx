"use client";
import { useEffect, useState } from "react";
import { Button } from "@servicehub/ui/components";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("servicehub-theme");
    const isDark = stored === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    setDark(isDark);
  }, []);
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("servicehub-theme", next ? "dark" : "light");
    setDark(next);
  }
  return <Button tone="secondary" onClick={toggle} aria-label="Switch colour theme">{dark ? "Dark theme" : "Light theme"}</Button>;
}
