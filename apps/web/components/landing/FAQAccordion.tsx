"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Est-ce vraiment gratuit ?",
    answer:
      "Oui, pendant toute la durée de la beta. Les 100 premiers utilisateurs garderont un tarif réduit de 50% à vie, même après le lancement officiel.",
  },
  {
    question: "Faut-il installer quelque chose ?",
    answer:
      "Juste une extension Chrome légère (moins de 2 Mo). Aucun logiciel à télécharger, tout se passe dans votre navigateur. L'installation prend 30 secondes.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Absolument. Vos captures sont chiffrées de bout en bout et stockées sur des serveurs en Europe (France). Vous pouvez supprimer vos données à tout moment.",
  },
  {
    question: "Ça marche avec quels outils ?",
    answer:
      "Tous ! Si ça s'affiche dans Chrome, on peut le capturer. Notion, Figma, votre CRM, votre ERP, n'importe quelle application web. Aucune intégration à configurer.",
  },
  {
    question: "Je peux annuler à tout moment ?",
    answer:
      "Bien sûr. Aucun engagement, aucune carte bancaire requise pour commencer. Vous pouvez supprimer votre compte et toutes vos données en un clic.",
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
