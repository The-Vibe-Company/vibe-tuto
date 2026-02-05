'use client';

import { Share2, Clock, Calendar, Play, Check, ChevronDown, Sparkles } from 'lucide-react';
import { DocStepCard } from '@/components/editor/DocStepCard';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface PublicTutorial {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  status: string;
  visibility: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PublicTutorialViewerProps {
  tutorial: PublicTutorial;
  steps: StepWithSignedUrl[];
  shareUrl?: string;
  isEmbed?: boolean;
}

export function PublicTutorialViewer({
  tutorial,
  steps,
  shareUrl,
  isEmbed = false,
}: PublicTutorialViewerProps) {
  const [copied, setCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    const url = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const visibleSteps = steps;
  let stepCounter = 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Count total image/text steps
  const totalSteps = steps.filter(s => s.step_type === 'image' || s.step_type === 'text').length;

  // Embed mode - simplified version
  if (isEmbed) {
    return (
      <TooltipProvider delayDuration={100}>
        <div className="min-h-screen bg-white">
          <main className="p-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-stone-900">{tutorial.title}</h1>
              {tutorial.description && (
                <p className="mt-2 text-sm text-stone-600">{tutorial.description}</p>
              )}
            </div>
            <div className="space-y-4">
              {visibleSteps.map((step) => {
                const isCountedStep = step.step_type === 'image' || step.step_type === 'text';
                if (isCountedStep) stepCounter++;
                return (
                  <DocStepCard
                    key={step.id}
                    step={step}
                    stepNumber={isCountedStep ? stepCounter : 0}
                    readOnly
                  />
                );
              })}
            </div>
            {visibleSteps.length === 0 && (
              <div className="rounded-lg border border-stone-200 bg-white p-12 text-center">
                <p className="text-stone-500">Ce tutoriel n'a pas encore de contenu.</p>
              </div>
            )}
          </main>
          {shareUrl && (
            <footer className="border-t border-stone-200 bg-stone-50 p-3">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-stone-600 hover:text-violet-600"
              >
                <span>Voir le tutoriel complet sur CapTuto</span>
              </a>
            </footer>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen bg-stone-50">
        {/* Floating Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-100'
              : 'bg-transparent'
          }`}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-200/50 transition-transform group-hover:scale-105">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
              <span className={`text-lg font-semibold tracking-tight transition-colors ${
                scrolled ? 'text-stone-900' : 'text-stone-800'
              }`}>
                CapTuto
              </span>
            </Link>

            <Button
              variant={scrolled ? "outline" : "secondary"}
              size="sm"
              onClick={handleShare}
              className={`gap-2 transition-all ${
                scrolled
                  ? 'border-stone-200 hover:border-violet-300 hover:bg-violet-50'
                  : 'bg-white/80 backdrop-blur-sm hover:bg-white'
              }`}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-emerald-600"
                  >
                    <Check className="h-4 w-4" />
                    Copié !
                  </motion.span>
                ) : (
                  <motion.span
                    key="share"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5"
                  >
                    <Share2 className="h-4 w-4" />
                    Partager
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </motion.header>

        {/* Hero Section */}
        <motion.section
          ref={heroRef}
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative pt-28 pb-16 overflow-hidden"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-violet-100/60 blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-amber-100/40 blur-[80px]" />
          </div>

          <div className="mx-auto max-w-5xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              {/* Meta badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 text-sm text-stone-600 shadow-sm border border-stone-100"
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-violet-500" />
                  <span>{totalSteps} étape{totalSteps > 1 ? 's' : ''}</span>
                </div>
                {tutorial.publishedAt && (
                  <>
                    <span className="text-stone-300">•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-violet-500" />
                      <span>{formatDate(tutorial.publishedAt)}</span>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 tracking-tight leading-[1.1] mb-6"
              >
                {tutorial.title}
              </motion.h1>

              {/* Description */}
              {tutorial.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed"
                >
                  {tutorial.description}
                </motion.p>
              )}

              {/* Scroll indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-12"
              >
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex flex-col items-center gap-2 text-stone-400"
                >
                  <span className="text-xs uppercase tracking-wider">Découvrir</span>
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Main Content */}
        <main className="relative">
          {/* Content container with subtle side gradient */}
          <div className="relative mx-auto max-w-4xl px-6 pb-24">
            {/* Vertical timeline line */}
            <div className="absolute left-[2.35rem] sm:left-1/2 top-0 bottom-24 w-px bg-gradient-to-b from-violet-200 via-stone-200 to-transparent hidden sm:block" />

            {/* Steps */}
            <div className="space-y-8 sm:space-y-12">
              {visibleSteps.map((step, index) => {
                const isCountedStep = step.step_type === 'image' || step.step_type === 'text';
                if (isCountedStep) stepCounter++;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.05,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className="relative"
                  >
                    {/* Timeline dot for larger screens */}
                    {isCountedStep && (
                      <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 -top-2 z-10">
                        <div className="h-4 w-4 rounded-full bg-violet-500 ring-4 ring-stone-50 shadow-lg shadow-violet-200/50" />
                      </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 border border-stone-100 overflow-hidden hover:shadow-md hover:border-stone-200 transition-all duration-300">
                      <DocStepCard
                        step={step}
                        stepNumber={isCountedStep ? stepCounter : 0}
                        readOnly
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Empty state */}
            {visibleSteps.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-stone-200 bg-white p-16 text-center"
              >
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 mb-4">
                  <Play className="h-8 w-8 text-stone-400" />
                </div>
                <p className="text-stone-500 text-lg">Ce tutoriel n'a pas encore de contenu.</p>
              </motion.div>
            )}
          </div>
        </main>

        {/* CTA Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative border-t border-stone-200 bg-gradient-to-b from-white to-stone-50"
        >
          <div className="mx-auto max-w-4xl px-6 py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm text-violet-600 mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>Créé avec CapTuto</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4"
            >
              Créez vos propres tutoriels
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-stone-500 mb-8 max-w-md mx-auto"
            >
              Enregistrez votre écran, l'IA génère les instructions. C'est aussi simple que ça.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="h-12 bg-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-violet-200 hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-200 transition-all"
                >
                  Essayer gratuitement
                </Button>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-12 text-sm text-stone-400"
            >
              © {new Date().getFullYear()} The Vibe Company
            </motion.p>
          </div>
        </motion.footer>
      </div>
    </TooltipProvider>
  );
}
