"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Shield, Zap, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Zap, text: "10x faster" },
  { icon: Check, text: "Perfect instructions" },
  { icon: Clock, text: "Instant sharing" },
];

const badges = [
  "No credit card required",
  "30 sec setup",
  "Cancel anytime",
];

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-500 to-indigo-600 py-24">
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float" />
        <div
          className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-60 w-60 rounded-full bg-white/5 blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-6 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to revolutionize
            <br />
            your documentation?
          </h2>

          <p className="mx-auto mb-10 max-w-lg text-lg text-white/70">
            Join hundreds of teams already saving hours every week with
            AI-powered tutorials.
          </p>

          {/* Benefits */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-white/90"
              >
                <div className="rounded-full bg-white/20 p-1.5">
                  <benefit.icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{benefit.text}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <Link href="/login">
              <Button
                size="lg"
                className="group cursor-pointer h-14 bg-white px-10 text-lg font-semibold text-indigo-600 shadow-2xl hover:bg-stone-50 transition-all duration-200"
              >
                Start for free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            {badges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90"
              >
                <Shield className="h-4 w-4" />
                {badge}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
