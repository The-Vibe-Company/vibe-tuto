"use client";

import { motion } from "framer-motion";
import {
  Wand2,
  Camera,
  PenTool,
  Link2,
  Highlighter,
} from "lucide-react";

const features = [
  {
    title: "AI-Generated Instructions",
    description:
      "AI analyzes your clicks and writes clear, step-by-step instructions. Edit and refine as needed.",
    icon: Wand2,
    badge: "AI-Powered",
    colSpan: "md:col-span-2",
    gradient: true,
    iconBg: "bg-indigo-50 group-hover:bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    title: "Auto Screenshots",
    description:
      "Every important click is captured automatically. HD screenshots integrated right into your tutorial.",
    icon: Camera,
    colSpan: "md:col-span-1",
    iconBg: "bg-violet-50 group-hover:bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    title: "Rich Editor",
    description:
      "Full-featured editor to reorder steps, edit text, and perfect your tutorials.",
    icon: PenTool,
    colSpan: "md:col-span-1",
    iconBg: "bg-purple-50 group-hover:bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    title: "1-Click Sharing",
    description:
      "Share your tutorials with a unique link. No sign-up required to view.",
    icon: Link2,
    colSpan: "md:col-span-1",
    iconBg: "bg-emerald-50 group-hover:bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    title: "Annotations",
    description:
      "Add arrows, highlights, and blur effects to your screenshots for extra clarity.",
    icon: Highlighter,
    colSpan: "md:col-span-1",
    iconBg: "bg-amber-50 group-hover:bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export function FeatureBento() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-indigo-500">
            Features
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Everything you need to create
            <br />
            <span className="text-stone-400">perfect tutorials</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className={`group relative overflow-hidden rounded-2xl border border-stone-200/60 p-8 transition-all duration-300 hover:shadow-xl hover:shadow-stone-200/40 hover:border-stone-300/60 ${
                feature.colSpan
              } ${
                feature.gradient
                  ? "bg-gradient-to-br from-indigo-50/50 to-white"
                  : "bg-white"
              }`}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-violet-500/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative">
                {feature.badge && (
                  <span className="mb-4 inline-flex items-center rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 px-3 py-1 text-xs font-medium text-indigo-700">
                    {feature.badge}
                  </span>
                )}

                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200 ${feature.iconBg}`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>

                <h3 className="mb-2 text-lg font-semibold text-stone-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {feature.description}
                </p>

                {/* Visual area for hero card */}
                {feature.gradient && (
                  <div className="mt-6 rounded-xl bg-white/80 border border-stone-100 p-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <div className="h-2 w-3/4 rounded bg-gradient-to-r from-stone-200 to-stone-100" />
                      </div>
                      <div className="h-2 w-full rounded bg-stone-100" />
                      <div className="h-2 w-5/6 rounded bg-stone-100" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
