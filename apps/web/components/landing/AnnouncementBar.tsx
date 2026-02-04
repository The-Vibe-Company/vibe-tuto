"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(47);

  useEffect(() => {
    const dismissed = localStorage.getItem("announcement-dismissed");
    if (!dismissed) {
      setIsVisible(true);
    }
    // Randomize spots slightly for realism
    setSpotsLeft(Math.floor(Math.random() * 20) + 35);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("announcement-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 px-4 py-2.5 text-center text-sm text-white">
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span className="font-medium">
          Offre de lancement : Les 100 premiers utilisateurs bénéficient de{" "}
          <span className="font-bold">50% à vie</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 ml-2 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
          Plus que {spotsLeft} places
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-white/20 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
