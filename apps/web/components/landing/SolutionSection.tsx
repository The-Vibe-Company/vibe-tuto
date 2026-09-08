"use client";

import { motion } from "framer-motion";
import { Check, FileText, MousePointer2, Wand2, ArrowRight } from "lucide-react";

export function SolutionSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
            The solution
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            What if documentation{" "}
            <span
              className="font-serif italic font-normal bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--brand-gradient-hero)" }}
            >
              wrote itself?
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-stone-500 leading-relaxed">
            Record your workflow once, then edit the AI draft into a polished,
            shareable tutorial.
          </p>
        </motion.div>

        {/* Flow visual */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12"
        >
          <div className="mx-auto max-w-md">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {/* Record */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 shadow-sm shadow-brand-100/50">
                  <MousePointer2 className="h-6 w-6 text-brand-600" />
                </div>
                <span className="text-xs font-medium text-stone-500">
                  Record
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-brand-300 to-teal-300" />
                <ArrowRight className="h-3 w-3 -ml-1 text-teal-400" />
              </div>

              {/* AI Process */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 border border-teal-100 shadow-sm">
                  <Wand2 className="h-6 w-6 text-teal-600" />
                </div>
                <span className="text-xs font-medium text-stone-500">
                  Draft
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-teal-300 to-emerald-300" />
                <ArrowRight className="h-3 w-3 -ml-1 text-emerald-400" />
              </div>

              {/* Tutorial */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm shadow-emerald-100/50">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-stone-500">
                  Tutorial
                </span>
              </div>
            </div>
          </div>

          {/* Completed tutorial preview */}
          <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-stone-200/60 bg-gradient-to-b from-stone-50 to-white p-6 shadow-sm">
            <div className="space-y-3">
              {[
                "Navigate to Settings > Team",
                "Click the Invite button",
                "Enter the email address and select role",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-sm text-stone-600 text-left">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
