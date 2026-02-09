"use client";

import { motion } from "framer-motion";
import { Monitor, MousePointer2, Wand2 } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Monitor,
    title: "Install",
    headline: "Add our Chrome extension",
    description: "One click install, 2MB, done in 30 seconds.",
    color: "bg-indigo-600",
    shadow: "shadow-indigo-500/25",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    number: 2,
    icon: MousePointer2,
    title: "Record",
    headline: "Do your workflow",
    description:
      "Click Record, then navigate normally. We capture everything.",
    color: "bg-violet-600",
    shadow: "shadow-violet-500/25",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    number: 3,
    icon: Wand2,
    title: "Generate",
    headline: "AI writes your tutorial",
    description:
      "AI analyzes your actions and creates polished step-by-step instructions.",
    color: "bg-purple-600",
    shadow: "shadow-purple-500/25",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-stone-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-indigo-500">
            How it works
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Three steps. That&apos;s all.
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="absolute left-0 right-0 top-[56px] hidden md:block">
            <div className="mx-auto h-0.5 max-w-2xl bg-gradient-to-r from-indigo-200 via-violet-200 to-purple-200" />
          </div>

          {/* Vertical connecting line - mobile only */}
          <div className="absolute left-[35px] top-[56px] bottom-[56px] md:hidden">
            <div className="h-full w-0.5 bg-gradient-to-b from-indigo-200 via-violet-200 to-purple-200" />
          </div>

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex gap-4 md:flex-col md:items-center md:text-center"
              >
                {/* Step badge */}
                <div
                  className={`relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${step.color} text-lg font-bold text-white shadow-lg ${step.shadow}`}
                >
                  {step.number}
                </div>

                <div className="flex-1 md:mt-6">
                  {/* Icon */}
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${step.iconBg} md:mx-auto`}
                  >
                    <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-stone-900">
                    {step.headline}
                  </h3>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
