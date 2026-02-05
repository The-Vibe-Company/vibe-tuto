"use client";

import { motion } from "framer-motion";
import { Clock, RefreshCw, Users } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Hours wasted",
    description: "You spend 3 hours creating a tutorial that no one really reads.",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    icon: RefreshCw,
    title: "Always redoing",
    description: "Every update to your tool = entire tutorial to recreate.",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    icon: Users,
    title: "Lost teams",
    description: "Your colleagues always ask the same questions. Over and over.",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
];

export function ProblemSection() {
  return (
    <section className="bg-stone-900 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-stone-400">
            The problem
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Documenting your processes<br />
            <span className="text-stone-400">is a nightmare</span>
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
              className="rounded-2xl border border-stone-800 bg-stone-800/50 p-8"
            >
              <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl ${problem.bgColor}`}>
                <problem.icon className={`h-6 w-6 ${problem.color}`} />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">{problem.title}</h3>
              <p className="text-stone-400 leading-relaxed">{problem.description}</p>
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
          <span className="text-white">Knowledge stays in people&apos;s heads.</span>
        </motion.p>
      </div>
    </section>
  );
}
