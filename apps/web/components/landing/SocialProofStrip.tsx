"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function SocialProofStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-stone-500"
    >
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-stone-900">+500</span>
        <span>tutorials created</span>
      </div>

      <div className="hidden sm:block h-4 w-px bg-stone-200" />

      <div className="flex items-center gap-1">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <span className="ml-1">
          <span className="font-semibold text-stone-900">4.9/5</span>
        </span>
      </div>

      <div className="hidden sm:block h-4 w-px bg-stone-200" />

      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-stone-900">50+</span>
        <span>active teams</span>
      </div>
    </motion.div>
  );
}
