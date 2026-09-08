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
    color: "bg-brand-600",
    shadow: "shadow-brand",
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
  },
  {
    number: 2,
    icon: MousePointer2,
    title: "Record",
    headline: "Do your workflow",
    description:
      "Click Record, then navigate normally. We capture everything.",
    color: "bg-teal-600",
    shadow: "shadow-lg shadow-teal-500/25",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    number: 3,
    icon: Wand2,
    title: "Generate",
    headline: "AI writes your tutorial",
    description:
      "AI analyzes your actions and creates polished step-by-step instructions.",
    color: "bg-cyan-600",
    shadow: "shadow-lg shadow-cyan-500/25",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
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
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-brand-300" />
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
              How it works
            </p>
            <span className="h-px w-8 bg-brand-300" />
          </div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Three steps.{" "}
            <span
              className="font-serif italic font-normal bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--brand-gradient)" }}
            >
              That&apos;s all.
            </span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="absolute left-0 right-0 top-[56px] hidden md:block">
            <div className="mx-auto h-0.5 max-w-2xl bg-gradient-to-r from-brand-200 via-teal-200 to-cyan-200" />
          </div>

          {/* Vertical connecting line - mobile only */}
          <div className="absolute left-[35px] top-[56px] bottom-[56px] md:hidden">
            <div className="h-full w-0.5 bg-gradient-to-b from-brand-200 via-teal-200 to-cyan-200" />
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
