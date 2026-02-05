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
    question: "L'extension ne s'installe pas, que faire ?",
    answer:
      "Vérifiez que vous utilisez Google Chrome (version 100+). L'extension n'est pas compatible avec d'autres navigateurs pour le moment. Si le problème persiste, essayez de désactiver vos autres extensions temporairement.",
  },
  {
    question: "Je n'arrive pas à me connecter à mon compte",
    answer:
      "Assurez-vous d'utiliser les mêmes identifiants que sur le site web. Si vous avez oublié votre mot de passe, utilisez la fonction 'Mot de passe oublié' sur la page de connexion. Vérifiez aussi que les cookies sont activés dans Chrome.",
  },
  {
    question: "L'enregistrement ne démarre pas",
    answer:
      "L'extension a besoin de l'autorisation d'accéder au microphone. Cliquez sur l'icône de cadenas dans la barre d'adresse et autorisez l'accès au micro. Si le problème persiste, rechargez la page et réessayez.",
  },
  {
    question: "Mes captures d'écran sont noires ou vides",
    answer:
      "Certains sites (comme Netflix ou des applications bancaires) bloquent les captures d'écran pour des raisons de sécurité. C'est une limitation technique que nous ne pouvons pas contourner.",
  },
  {
    question: "Comment supprimer mon compte et mes données ?",
    answer:
      "Connectez-vous à votre tableau de bord, allez dans Paramètres, puis cliquez sur 'Supprimer mon compte'. Toutes vos données seront supprimées définitivement sous 24h.",
  },
  {
    question: "L'IA génère du texte incorrect",
    answer:
      "L'IA fait de son mieux mais peut parfois se tromper. Vous pouvez modifier le texte généré directement dans l'éditeur. Plus vos explications vocales sont claires, meilleur sera le résultat.",
  },
];

const troubleshooting = [
  {
    icon: Chrome,
    title: "Réinstaller l'extension",
    description:
      "Supprimez l'extension depuis chrome://extensions, puis réinstallez-la depuis le Chrome Web Store.",
  },
  {
    icon: Mic,
    title: "Problèmes de micro",
    description:
      "Vérifiez les permissions dans Paramètres Chrome > Confidentialité > Paramètres de site > Microphone.",
  },
  {
    icon: Upload,
    title: "Upload qui échoue",
    description:
      "Vérifiez votre connexion internet. Les fichiers volumineux peuvent prendre du temps à uploader.",
  },
  {
    icon: RefreshCw,
    title: "Actualiser l'extension",
    description:
      "Allez sur chrome://extensions, activez le mode développeur, puis cliquez sur 'Mettre à jour'.",
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
              Retour à l&apos;accueil
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
            Centre d&apos;aide
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-stone-500"
          >
            Trouvez des réponses à vos questions ou contactez notre équipe.
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
              Besoin d&apos;aide ?
            </h2>
            <p className="text-stone-500">
              Notre équipe vous répond sous 24h en semaine.
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
              Questions fréquentes
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
              Dépannage rapide
            </h2>
            <p className="mt-2 text-stone-500">
              Solutions aux problèmes les plus courants
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
