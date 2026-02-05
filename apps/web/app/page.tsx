"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  MousePointer2,
  ArrowRight,
  Play,
  Monitor,
  Wand2,
  Menu,
  X,
} from "lucide-react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
              Beta
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm text-stone-600">
            <a href="#how-it-works" className="hover:text-stone-900 transition-colors">
              Comment ça marche
            </a>
          </div>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-stone-600 hover:text-stone-900"
              >
                Se connecter
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-violet-600 text-white hover:bg-violet-700 shadow-sm">
                Essayer
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-stone-600 hover:text-stone-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-stone-100 bg-white"
            >
              <div className="px-6 py-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <a
                    href="#how-it-works"
                    className="py-2 text-stone-600 hover:text-stone-900 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Comment ça marche
                  </a>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                    >
                      Se connecter
                    </Button>
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full justify-center bg-violet-600 text-white hover:bg-violet-700">
                      Essayer
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-violet-50/80 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl"
            >
              Créez des tutoriels<br />
              <span className="text-violet-600">à partir de votre écran</span>
            </motion.h1>

            {/* Subheadline - honest description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mb-10 max-w-xl text-lg text-stone-500 leading-relaxed"
            >
              CapTuto est une extension Chrome qui enregistre vos clics et
              utilise l&apos;IA pour générer des instructions étape par étape.
              C&apos;est tout.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="group h-12 bg-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                >
                  Essayer
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative mt-16 sm:mt-20"
          >
            <div className="relative mx-auto max-w-4xl">
              {/* Browser mockup */}
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl shadow-stone-200/50">
                {/* Browser header */}
                <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="ml-4 flex-1 rounded-md bg-stone-100 px-3 py-1.5">
                    <span className="text-xs text-stone-400">
                      app.captuto.com/editor
                    </span>
                  </div>
                </div>
                {/* Preview content */}
                <div className="aspect-[16/9] bg-gradient-to-br from-stone-50 to-stone-100 p-8">
                  <div className="flex h-full gap-6">
                    {/* Sidebar mockup */}
                    <div className="w-48 space-y-3 rounded-lg border border-stone-200 bg-white p-4">
                      <div className="h-3 w-20 rounded bg-stone-200" />
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-md bg-stone-50 p-2"
                          >
                            <div className="h-8 w-8 rounded bg-violet-100" />
                            <div className="h-2 w-16 rounded bg-stone-200" />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Main content mockup */}
                    <div className="flex-1 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-medium text-white">
                          1
                        </div>
                        <div className="h-3 w-48 rounded bg-stone-200" />
                      </div>
                      <div className="aspect-video rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 p-4">
                        <div className="relative h-full rounded bg-white/50">
                          {/* Click indicator */}
                          <div className="absolute left-1/3 top-1/2 flex h-8 w-8 items-center justify-center">
                            <div className="absolute h-8 w-8 animate-ping rounded-full bg-violet-400/30" />
                            <MousePointer2 className="h-5 w-5 text-violet-500" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded bg-stone-100" />
                        <div className="h-2 w-3/4 rounded bg-stone-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="border-t border-stone-100 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Comment ça marche
            </h2>
          </motion.div>

          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                icon: Monitor,
                title: "1. Installez l'extension",
                description:
                  "Ajoutez l'extension CapTuto à Chrome. Connectez-vous avec votre compte.",
              },
              {
                icon: MousePointer2,
                title: "2. Enregistrez vos actions",
                description:
                  "Cliquez sur « Enregistrer » puis faites ce que vous voulez documenter. On capture chaque clic et screenshot.",
              },
              {
                icon: Wand2,
                title: "3. L'IA génère le tutoriel",
                description:
                  "L'IA analyse vos actions et écrit les instructions correspondantes. Vous pouvez les modifier ensuite.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-stone-900">
                  {item.title}
                </h3>
                <p className="text-stone-500 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get Section */}
      <section className="border-t border-stone-100 bg-stone-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Ce que vous obtenez
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                title: "Instructions générées par IA",
                description:
                  "L'IA écrit les étapes à suivre basées sur vos clics. La qualité dépend de la complexité de ce que vous documentez.",
              },
              {
                title: "Screenshots automatiques",
                description:
                  "Un screenshot est capturé à chaque clic important. Ils sont intégrés dans le tutoriel.",
              },
              {
                title: "Éditeur pour modifier",
                description:
                  "Vous pouvez modifier le texte généré, réorganiser les étapes, supprimer ce qui ne vous convient pas.",
              },
              {
                title: "Partage par lien",
                description:
                  "Chaque tutoriel a un lien unique que vous pouvez partager avec qui vous voulez.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-stone-200 bg-white p-6"
              >
                <h3 className="mb-2 text-lg font-semibold text-stone-900">
                  {item.title}
                </h3>
                <p className="text-stone-500 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simple CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-6 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Envie d&apos;essayer ?
            </h2>
            <p className="mx-auto mb-8 max-w-md text-lg text-stone-500">
              C&apos;est gratuit pendant la beta. On verra pour la suite.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="h-12 bg-violet-600 px-8 text-base font-medium text-white hover:bg-violet-700"
              >
                Créer un compte
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
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
