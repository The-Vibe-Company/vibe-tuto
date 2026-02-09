"use client";

import { motion } from "framer-motion";
import { Clock, RefreshCw, Users } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Hours wasted",
    description:
      "You spend 3 hours creating a tutorial that no one really reads.",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    hoverBorder: "hover:border-red-500/40",
    glow: "group-hover:shadow-red-500/5",
  },
  {
    icon: RefreshCw,
    title: "Always redoing",
    description:
      "Every update to your tool = entire tutorial to recreate.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    hoverBorder: "hover:border-orange-500/40",
    glow: "group-hover:shadow-orange-500/5",
  },
  {
    icon: Users,
    title: "Lost teams",
    description:
      "Your colleagues always ask the same questions. Over and over.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    hoverBorder: "hover:border-amber-500/40",
    glow: "group-hover:shadow-amber-500/5",
  },
];

export function ProblemSection() {
  return (
    <section className="relative bg-stone-950 py-24 overflow-hidden">
      {/* Dot grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-red-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-stone-400">
            The problem
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Documenting your processes
            <br />
            <span className="text-stone-500">is a nightmare</span>
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {problems.map((problem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group rounded-2xl border border-stone-800 bg-stone-900/50 p-8 transition-all duration-300 hover:bg-stone-900/80 hover:shadow-xl ${problem.hoverBorder} ${problem.glow}`}
            >
              <div
                className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl ${problem.bgColor} border ${problem.borderColor}`}
              >
                <problem.icon className={`h-6 w-6 ${problem.color}`} />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">
                {problem.title}
              </h3>
              <p className="text-stone-400 leading-relaxed">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center text-lg text-stone-400"
        >
          Result? You stop documenting.{" "}
          <span className="text-white font-medium">
            Knowledge stays in people&apos;s heads.
          </span>
        </motion.p>
      </div>
    </section>
  );
}
