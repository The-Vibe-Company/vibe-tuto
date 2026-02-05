"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Is it really free?",
    answer:
      "Yes, for the entire duration of the beta. The first 100 users will keep a 50% reduced rate for life, even after the official launch.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "Just a lightweight Chrome extension (less than 2 MB). No software to download, everything happens in your browser. Installation takes 30 seconds.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. Your captures are end-to-end encrypted and stored on servers in Europe (France). You can delete your data at any time.",
  },
  {
    question: "What tools does it work with?",
    answer:
      "All of them! If it displays in Chrome, we can capture it. Notion, Figma, your CRM, your ERP, any web application. No integration to configure.",
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Of course. No commitment, no credit card required to get started. You can delete your account and all your data in one click.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-stone-100 bg-stone-50/50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">
            FAQ
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-stone-50"
              >
                <span className="font-medium text-stone-900">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-stone-400 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? "max-h-48" : "max-h-0"
                }`}
              >
                <p className="px-6 pb-4 text-stone-500 leading-relaxed">{faq.answer}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
