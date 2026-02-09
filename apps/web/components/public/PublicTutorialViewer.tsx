'use client';

import {
  Share2,
  Calendar,
  Play,
  Check,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Globe,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { DocStepCard } from '@/components/editor/DocStepCard';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { formatSourceUrl, getSourceActionType } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';
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
}

export function PublicTutorialViewer({
  tutorial,
  steps,
  shareUrl,
}: PublicTutorialViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Hero parallax
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(heroProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(heroProgress, [0, 1], [0, 80]);

  // Global reading progress
  const { scrollYProgress: readingProgress } = useScroll();

  // Show floating header after hero
  useMotionValueEvent(heroProgress, 'change', (latest) => {
    setShowFloatingHeader(latest > 0.4);
  });

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalSteps = steps.filter(
    (s) => s.step_type === 'image' || s.step_type === 'text'
  ).length;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen bg-stone-50">
        {/* Reading Progress Bar - always visible at top */}
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] h-[3px]"
          style={{ scaleX: readingProgress, transformOrigin: '0%' }}
        >
          <div className="h-full w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        </motion.div>

        {/* Floating Header */}
        <AnimatePresence>
          {showFloatingHeader && (
            <motion.header
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-[3px] left-0 right-0 z-50 border-b border-stone-200/60 bg-white/80 backdrop-blur-xl backdrop-saturate-150"
            >
              <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Link href="/" className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-200/50">
                      <Play className="h-3.5 w-3.5 fill-white text-white" />
                    </div>
                  </Link>
                  <div className="h-5 w-px bg-stone-200" />
                  <p className="truncate text-sm font-medium text-stone-700">
                    {tutorial.title}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex-shrink-0 gap-2 border-stone-200 bg-white hover:border-violet-300 hover:bg-violet-50"
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
                        <Check className="h-3.5 w-3.5" />
                        Copied!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="share"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        {/* Initial header (visible before scroll) */}
        <div className="fixed top-[3px] left-0 right-0 z-40">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/50 transition-transform group-hover:scale-105">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-stone-800">
                CapTuto
              </span>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="gap-2 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
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
                    Copied!
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
                    Share
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <motion.section
          ref={heroRef}
          style={{ opacity: heroOpacity }}
          className="relative overflow-hidden pt-24 pb-20 sm:pt-28 sm:pb-24"
        >
          {/* Animated mesh gradient background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />

            {/* Animated orbs */}
            <motion.div
              animate={{
                x: [0, 30, -20, 0],
                y: [0, -40, 20, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-20 left-[15%] h-[500px] w-[500px] rounded-full bg-violet-200/40 blur-[120px]"
            />
            <motion.div
              animate={{
                x: [0, -40, 30, 0],
                y: [0, 30, -20, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: 'linear',
                delay: 5,
              }}
              className="absolute -bottom-20 right-[10%] h-[400px] w-[400px] rounded-full bg-fuchsia-200/30 blur-[100px]"
            />
            <motion.div
              animate={{
                x: [0, 20, -30, 0],
                y: [0, -20, 40, 0],
              }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: 'linear',
                delay: 10,
              }}
              className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/30 blur-[100px]"
            />

            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #6d28d9 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            {/* Decorative floating elements */}
            <motion.div
              animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute right-[20%] top-[20%] h-16 w-16 rounded-2xl border border-violet-200/50 bg-gradient-to-br from-white/80 to-violet-50/80 shadow-lg backdrop-blur-sm sm:h-20 sm:w-20"
            />
            <motion.div
              animate={{ y: [0, 12, 0], rotate: [0, -3, 0] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
              }}
              className="absolute left-[12%] bottom-[25%] h-12 w-12 rounded-xl border border-purple-200/50 bg-gradient-to-br from-white/80 to-purple-50/80 shadow-lg backdrop-blur-sm sm:h-16 sm:w-16"
            />
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 4,
              }}
              className="absolute right-[8%] bottom-[30%] hidden h-10 w-10 rounded-lg border border-fuchsia-200/50 bg-gradient-to-br from-white/80 to-fuchsia-50/80 shadow-md backdrop-blur-sm sm:block"
            />
          </div>

          <motion.div style={{ y: heroY }} className="relative mx-auto max-w-4xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              {/* Meta badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="mb-8 flex flex-wrap items-center justify-center gap-3"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/90 px-4 py-2 text-sm text-stone-600 shadow-sm backdrop-blur-sm">
                  <Layers className="h-3.5 w-3.5 text-violet-500" />
                  <span className="font-medium">
                    {totalSteps} step{totalSteps !== 1 ? 's' : ''}
                  </span>
                </div>
                {tutorial.publishedAt && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-stone-100 bg-white/90 px-4 py-2 text-sm text-stone-500 shadow-sm backdrop-blur-sm">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    <span>{formatDate(tutorial.publishedAt)}</span>
                  </div>
                )}
              </motion.div>

              {/* Title with gradient */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.7 }}
                className="text-4xl font-bold tracking-tight leading-[1.1] sm:text-5xl lg:text-6xl"
              >
                <span className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-600 bg-clip-text text-transparent">
                  {tutorial.title}
                </span>
              </motion.h1>

              {/* Description */}
              {tutorial.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.6 }}
                  className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-500 sm:text-xl"
                >
                  {tutorial.description}
                </motion.p>
              )}

              {/* Scroll indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-14"
              >
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="inline-flex flex-col items-center gap-2 text-stone-400"
                >
                  <span className="text-xs font-medium uppercase tracking-[0.2em]">
                    Scroll to explore
                  </span>
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Main Content */}
        <main ref={contentRef} className="relative pb-8">
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
            {/* Steps with timeline */}
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-6 top-0 bottom-0 hidden w-px sm:block">
                <div className="h-full w-full bg-gradient-to-b from-violet-300/80 via-violet-200/50 to-transparent" />
              </div>

              <div className="space-y-6 sm:space-y-10">
                {visibleSteps.map((step, index) => {
                  const isCountedStep =
                    step.step_type === 'image' || step.step_type === 'text';
                  if (isCountedStep) stepCounter++;
                  const currentStepNum = stepCounter;

                  // Determine step metadata
                  const stepUrl = step.url || step.source?.url || null;
                  const actionType = step.source
                    ? getSourceActionType(step.source)
                    : null;
                  const isNavigation = actionType === 'navigation';
                  const isTabChange = actionType === 'tab_change';

                  // Find previous step's URL (skip headings/dividers)
                  let previousStepUrl: string | null = null;
                  for (let i = index - 1; i >= 0; i--) {
                    const prev = visibleSteps[i];
                    if (prev.step_type === 'heading' || prev.step_type === 'divider') continue;
                    previousStepUrl = prev.url || prev.source?.url || null;
                    break;
                  }
                  const isUrlRedundant = stepUrl != null && previousStepUrl != null && stepUrl === previousStepUrl;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{
                        duration: 0.6,
                        delay: Math.min(index * 0.08, 0.4),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      {isCountedStep && (
                        <div className="absolute left-6 top-6 z-10 hidden -translate-x-1/2 sm:block">
                          <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{
                              delay: Math.min(index * 0.08, 0.4) + 0.2,
                              type: 'spring',
                              stiffness: 300,
                              damping: 20,
                            }}
                            className="relative"
                          >
                            <div className="h-3 w-3 rounded-full bg-violet-500 ring-[3px] ring-stone-50 shadow-md shadow-violet-200/50" />
                            <div className="absolute inset-0 animate-ping rounded-full bg-violet-400 opacity-20" />
                          </motion.div>
                        </div>
                      )}

                      {/* Step card with decorative number */}
                      <div className="sm:pl-16">
                        {/* Navigation/Tab change badge above card - hidden when URL is same as previous */}
                        {stepUrl && (isNavigation || isTabChange) && !isUrlRedundant && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{
                              delay: Math.min(index * 0.08, 0.4) + 0.1,
                            }}
                            className="mb-3 flex items-center gap-2"
                          >
                            <div
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                                isTabChange
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                              }`}
                            >
                              <Globe className="h-3 w-3" />
                              <span>
                                {isTabChange ? 'Switched to' : 'Navigated to'}
                              </span>
                              <span className="max-w-[200px] truncate font-normal opacity-80 sm:max-w-xs">
                                {formatSourceUrl(stepUrl)}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Card wrapper */}
                        <div className="group relative">
                          {/* Decorative step number (large, behind the card) */}
                          {isCountedStep && (
                            <div className="absolute -left-2 -top-4 z-0 select-none pointer-events-none sm:-left-4 sm:-top-6">
                              <span className="text-6xl font-black text-violet-100/60 sm:text-7xl lg:text-8xl">
                                {String(currentStepNum).padStart(2, '0')}
                              </span>
                            </div>
                          )}

                          {/* The actual card */}
                          <div className="relative z-10 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-200/50 transition-all duration-300 hover:border-stone-300/80 hover:shadow-lg hover:shadow-stone-200/60">
                            {/* URL chip inside card (for non-navigation steps that have a URL) - hidden when redundant */}
                            {stepUrl && !isNavigation && !isTabChange && !isUrlRedundant && (
                              <div className="border-b border-stone-100 bg-stone-50/50 px-4 py-2">
                                <a
                                  href={stepUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-md text-xs text-stone-500 transition-colors hover:text-violet-600"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="max-w-[300px] truncate">
                                    {formatSourceUrl(stepUrl)}
                                  </span>
                                </a>
                              </div>
                            )}

                            <DocStepCard
                              step={step}
                              stepNumber={isCountedStep ? currentStepNum : 0}
                              previousStepUrl={previousStepUrl}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Empty state */}
            {visibleSteps.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-stone-200 bg-white p-16 text-center"
              >
                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
                  <Play className="h-8 w-8 text-stone-400" />
                </div>
                <p className="text-lg text-stone-500">
                  This tutorial has no content yet.
                </p>
              </motion.div>
            )}
          </div>
        </main>

        {/* CTA Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden border-t border-stone-200/50"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-violet-50/30 to-violet-50/50" />
          <div className="absolute inset-0">
            <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-200/20 blur-[80px]" />
          </div>

          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/80 px-4 py-2 text-sm text-violet-600 shadow-sm backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Created with CapTuto</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl"
            >
              Create your own tutorials
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mx-auto mt-4 max-w-lg text-stone-500 leading-relaxed"
            >
              Record your screen and let AI generate the instructions.
              Beautiful tutorials in minutes, not hours.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="group h-12 gap-2 bg-gradient-to-r from-violet-600 to-purple-600 px-8 text-base font-medium text-white shadow-lg shadow-violet-300/40 transition-all hover:shadow-xl hover:shadow-violet-300/50 hover:from-violet-700 hover:to-purple-700"
                >
                  Try for free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-16 text-sm text-stone-400"
            >
              &copy; {new Date().getFullYear()} The Vibe Company
            </motion.p>
          </div>
        </motion.footer>
      </div>
    </TooltipProvider>
  );
}
