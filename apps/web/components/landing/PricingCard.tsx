"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  "Unlimited tutorials",
  "AI-generated instructions",
  "HD screenshots",
  "1-click sharing",
  "PDF & Notion export",
  "Priority support",
];

export function PricingCard() {
  const spotsTaken = 53;
  const totalSpots = 100;
  const spotsLeft = totalSpots - spotsTaken;

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">
            Launch offer
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Join the early adopters
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-md"
        >
          <div className="relative overflow-hidden rounded-3xl border-2 border-violet-500 bg-white p-8 shadow-xl shadow-violet-100">
            {/* Badge */}
            <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-violet-600 to-indigo-600 px-12 py-1 text-xs font-semibold text-white">
              Popular
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
              <Sparkles className="h-4 w-4" />
              Free Beta Access
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-stone-900">$0</span>
                <span className="text-lg text-stone-400 line-through">$29/month</span>
              </div>
              <p className="mt-2 text-sm text-stone-500">Free during beta</p>
            </div>

            <ul className="mb-8 space-y-3">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-stone-600">
                  <Check className="h-5 w-5 flex-shrink-0 text-violet-500" />
                  {feature}
                </li>
              ))}
            </ul>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-stone-500">{spotsTaken} spots taken</span>
                <span className="font-semibold text-violet-600">Only {spotsLeft} left!</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(spotsTaken / totalSpots) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                />
              </div>
            </div>

            <Link href="/login" className="block">
              <Button
                size="lg"
                className="group w-full h-12 bg-violet-600 text-base font-medium text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
              >
                Join the free beta
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            <p className="mt-4 text-center text-xs text-stone-400">
              No credit card required
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
