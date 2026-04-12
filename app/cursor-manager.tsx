"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getCursorUrl() {
  const hour = new Date().getHours();
  const isDay = hour >= 7 && hour < 18;
  return isDay ? "/cursor/day_cursor.png" : "/cursor/night_cursor.png";
}

export function CursorManager() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    const existing = document.getElementById("adelina-cursor");

    if (isAdmin) {
      // Remove cursor style whenever on any admin page
      if (existing) existing.remove();
      return;
    }

    const styleEl = existing ?? document.createElement("style");
    styleEl.id = "adelina-cursor";
    if (!existing) document.head.appendChild(styleEl);

    styleEl.textContent = `* { cursor: url('${getCursorUrl()}') 32 32, auto !important; }`;

    const interval = setInterval(() => {
      styleEl.textContent = `* { cursor: url('${getCursorUrl()}') 32 32, auto !important; }`;
    }, 60_000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  return null;
}
