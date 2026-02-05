"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Play,
  ArrowLeft,
  Mail,
  ChevronDown,
  Chrome,
  Mic,
  Upload,
  RefreshCw,
} from "lucide-react";

const faqs = [
  {
    question: "The extension won't install, what should I do?",
    answer:
      "Make sure you are using Google Chrome (version 100+). The extension is not compatible with other browsers at the moment. If the problem persists, try temporarily disabling your other extensions.",
  },
  {
    question: "I can't log in to my account",
    answer:
      "Make sure you are using the same credentials as on the website. If you forgot your password, use the 'Forgot password' feature on the login page. Also check that cookies are enabled in Chrome.",
  },
  {
    question: "Recording doesn't start",
    answer:
      "The extension needs permission to access your microphone. Click on the lock icon in the address bar and allow microphone access. If the problem persists, reload the page and try again.",
  },
  {
    question: "My screenshots are black or empty",
    answer:
      "Some sites (like Netflix or banking apps) block screenshots for security reasons. This is a technical limitation that we cannot bypass.",
  },
  {
    question: "How do I delete my account and data?",
    answer:
      "Log in to your dashboard, go to Settings, then click 'Delete my account'. All your data will be permanently deleted within 24 hours.",
  },
  {
    question: "The AI generates incorrect text",
    answer:
      "AI does its best but can sometimes make mistakes. You can edit the generated text directly in the editor. The clearer your voice explanations, the better the result will be.",
  },
];

const troubleshooting = [
  {
    icon: Chrome,
    title: "Reinstall the extension",
    description:
      "Remove the extension from chrome://extensions, then reinstall it from the Chrome Web Store.",
  },
  {
    icon: Mic,
    title: "Microphone issues",
    description:
      "Check permissions in Chrome Settings > Privacy > Site Settings > Microphone.",
  },
  {
    icon: Upload,
    title: "Upload fails",
    description:
      "Check your internet connection. Large files may take time to upload.",
  },
  {
    icon: RefreshCw,
    title: "Update the extension",
    description:
      "Go to chrome://extensions, enable developer mode, then click 'Update'.",
  },
];

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-stone-900">
              CapTuto
            </span>
          </Link>

          <Link href="/">
            <Button variant="ghost" className="text-stone-600 hover:text-stone-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-4xl font-semibold tracking-tight text-stone-900"
          >
            Help Center
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-stone-500"
          >
            Find answers to your questions or contact our team.
          </motion.p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="border-t border-stone-100 bg-violet-50 py-12">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
              <Mail className="h-7 w-7 text-violet-600" />
            </div>
            <h2 className="text-xl font-semibold text-stone-900">
              Need help?
            </h2>
            <p className="text-stone-500">
              Our team responds within 24 hours on weekdays.
            </p>
            <a
              href="mailto:support@thevibecompany.co"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700"
            >
              <Mail className="h-4 w-4" />
              support@thevibecompany.co
            </a>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-stone-100 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">
              FAQ
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
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
                    className={`h-5 w-5 flex-shrink-0 text-stone-400 transition-transform ${
                      openIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === i ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <p className="px-6 pb-4 text-stone-500 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Troubleshooting Section */}
      <section className="border-t border-stone-100 bg-stone-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Quick Troubleshooting
            </h2>
            <p className="mt-2 text-stone-500">
              Solutions to the most common problems
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {troubleshooting.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-stone-200 bg-white p-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
                  <item.icon className="h-5 w-5 text-stone-600" />
                </div>
                <h3 className="mb-1 font-semibold text-stone-900">{item.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
              <span className="text-lg font-semibold text-stone-900">
                CapTuto
              </span>
            </div>
            <p className="text-sm text-stone-500">
              © {new Date().getFullYear()} The Vibe Company
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
