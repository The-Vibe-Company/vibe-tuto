"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import Link from "next/link";

const SPOTS_LEFT = 53;

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("announcement-dismissed");
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("announcement-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600 px-4 py-2.5 text-center text-sm text-white">
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 cursor-pointer"
      >
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span className="font-medium">
          Launch offer:{" "}
          <span
            className="font-bold bg-gradient-to-r from-white via-amber-200 to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer"
          >
            50% off while in Beta
          </span>
          . Unlimited usage.
        </span>
      </Link>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
