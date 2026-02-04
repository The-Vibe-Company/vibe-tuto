"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  MousePointer2,
  Sparkles,
  ArrowRight,
  Play,
  ChevronRight,
  Zap,
  Brain,
  Share2,
} from "lucide-react";
import {
  AnnouncementBar,
  SocialProofStrip,
  LogoCloud,
  ProblemSection,
  PricingCard,
  FAQAccordion,
  FinalCTA,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Announcement Bar */}
      <AnnouncementBar />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-stone-900">
              Vibe Tuto
            </span>
            <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
              Beta
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-stone-600">
            <a href="#features" className="hover:text-stone-900 transition-colors">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="hover:text-stone-900 transition-colors">
              Comment ça marche
            </a>
            <a href="#pricing" className="hover:text-stone-900 transition-colors">
              Tarifs
            </a>
          </div>
          <div className="flex items-center gap-3">
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
                Essayer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-violet-50/80 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] translate-y-1/4 -translate-x-1/4 rounded-full bg-stone-50 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/50 px-4 py-1.5"
            >
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-700">
                Propulsé par l&apos;IA
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl md:text-6xl"
            >
              Créez des tutoriels<br />
              <span className="relative">
                <span className="relative z-10 text-violet-600">10x plus vite</span>
                <span className="absolute bottom-2 left-0 -z-0 h-3 w-full bg-violet-100/70" />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-8 max-w-xl text-lg text-stone-500 leading-relaxed"
            >
              Enregistrez votre écran, et notre IA génère automatiquement des
              instructions claires. Vos équipes suivent, vous gagnez du temps.
            </motion.p>

            {/* Social Proof Strip */}
            <div className="mb-10">
              <SocialProofStrip />
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="group h-12 bg-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
                >
                  Créer mon premier tutoriel
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-medium border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                <Play className="mr-2 h-4 w-4" />
                Voir en 2 minutes
              </Button>
            </motion.div>

            {/* Trust note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-4 text-sm text-stone-400"
            >
              Aucune carte bancaire requise - Prêt en 30 secondes
            </motion.p>
          </div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
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
                      app.vibetuto.com/editor
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
              {/* Floating elements */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -left-4 top-1/4 rounded-lg border border-stone-200 bg-white p-3 shadow-lg sm:-left-6"
              >
                <MousePointer2 className="h-5 w-5 text-violet-500" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="absolute -right-4 bottom-1/3 rounded-lg border border-stone-200 bg-white p-3 shadow-lg sm:-right-6"
              >
                <Sparkles className="h-5 w-5 text-amber-500" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Logo Cloud */}
      <LogoCloud />

      {/* Problem Section */}
      <ProblemSection />

      {/* Solution Transition */}
      <section className="bg-gradient-to-b from-stone-900 to-stone-800 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 text-lg text-violet-400">La solution</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              Et si créer un tutoriel<br />
              prenait{" "}
              <span className="text-violet-400">2 minutes</span> ?
            </h2>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Benefit Focused */}
      <section id="features" className="border-b border-stone-100 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">
              Les bénéfices
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Ce que Vibe Tuto change pour vous
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Gagnez 10h par semaine",
                description:
                  "L'enregistrement automatique capture chaque clic. Plus besoin de screenshots manuels ni de rédaction fastidieuse.",
                metric: "10h",
                metricLabel: "économisées",
                color: "violet",
              },
              {
                icon: Brain,
                title: "Des instructions parfaites",
                description:
                  "Notre IA rédige des instructions claires et précises que même un débutant peut suivre sans se perdre.",
                metric: "98%",
                metricLabel: "compréhension",
                color: "amber",
              },
              {
                icon: Share2,
                title: "Partagez en 1 clic",
                description:
                  "Lien, PDF, ou intégré dans Notion. Vos tutoriels vont où vous voulez, instantanément.",
                metric: "3 sec",
                metricLabel: "pour partager",
                color: "emerald",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-2xl border border-stone-200 bg-white p-8 transition-all hover:border-stone-300 hover:shadow-lg"
              >
                <div
                  className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                    feature.color === "violet"
                      ? "bg-violet-100 text-violet-600"
                      : feature.color === "amber"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>

                {/* Big metric */}
                <div className="mb-4">
                  <span
                    className={`text-4xl font-bold ${
                      feature.color === "violet"
                        ? "text-violet-600"
                        : feature.color === "amber"
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {feature.metric}
                  </span>
                  <span className="ml-2 text-sm text-stone-400">
                    {feature.metricLabel}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-semibold text-stone-900">
                  {feature.title}
                </h3>
                <p className="text-stone-500 leading-relaxed">
                  {feature.description}
                </p>
                <ChevronRight className="absolute bottom-8 right-8 h-5 w-5 text-stone-300 transition-all group-hover:translate-x-1 group-hover:text-violet-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">
              Comment ça marche
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Trois étapes, deux minutes
            </h2>
          </motion.div>

          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-24 left-1/2 hidden h-0.5 w-2/3 -translate-x-1/2 bg-gradient-to-r from-violet-200 via-violet-300 to-violet-200 md:block" />

            <div className="grid gap-12 md:grid-cols-3">
              {[
                {
                  step: "01",
                  time: "30 sec",
                  title: "Installez l'extension",
                  description:
                    "Un clic pour ajouter Vibe Tuto à Chrome. C'est tout.",
                },
                {
                  step: "02",
                  time: "2 min",
                  title: "Enregistrez vos actions",
                  description:
                    "Faites ce que vous feriez normalement. On capture tout automatiquement.",
                },
                {
                  step: "03",
                  time: "Instant",
                  title: "L'IA génère le tutoriel",
                  description:
                    "Instructions claires, screenshots annotés. Magie.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative text-center"
                >
                  <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-violet-200 bg-white text-2xl font-semibold text-violet-600 shadow-sm">
                    {item.step}
                  </div>
                  <span className="mb-2 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-600">
                    {item.time}
                  </span>
                  <h3 className="mb-3 text-xl font-semibold text-stone-900">
                    {item.title}
                  </h3>
                  <p className="mx-auto max-w-xs text-stone-500">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <div id="pricing">
        <PricingCard />
      </div>

      {/* FAQ Section */}
      <FAQAccordion />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <footer className="border-t border-stone-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
              <span className="text-lg font-semibold text-stone-900">
                Vibe Tuto
              </span>
            </div>
            <p className="text-sm text-stone-500">
              © {new Date().getFullYear()} The Vibe Company. Tous droits
              réservés.
            </p>
            <div className="flex gap-6">
              <Link
                href="#"
                className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                Confidentialité
              </Link>
              <Link
                href="#"
                className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                Conditions
              </Link>
              <Link
                href="#"
                className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
