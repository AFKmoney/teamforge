'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Activity,
  Dna,
  Users,
  MessageSquare,
  Settings,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore, type Page } from '@/lib/store'

// ---------------------------------------------------------------------------
// Tour Step Type
// ---------------------------------------------------------------------------

export interface TourStep {
  id: string
  title: string
  description: string
  targetSelector: string
  position: 'top' | 'bottom' | 'left' | 'right'
  icon?: React.ComponentType<{ className?: string }>
  navigateTo?: Page
}

// ---------------------------------------------------------------------------
// Tour Steps Definition
// ---------------------------------------------------------------------------

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to EvoAI',
    description:
      'Your Self-Evolving AI System dashboard gives you full visibility into autonomous AI improvement. Let us show you around!',
    targetSelector: '[data-tour="main-content"]',
    position: 'bottom',
    icon: Sparkles,
  },
  {
    id: 'navigation',
    title: 'Sidebar Navigation',
    description:
      'Navigate between 12 panels covering agents, evolution, memory, knowledge, and more. Each section gives you deep control over a different aspect of the system.',
    targetSelector: '[data-tour="sidebar-nav"]',
    position: 'right',
    icon: LayoutDashboard,
  },
  {
    id: 'dashboard',
    title: 'System Overview',
    description:
      'Monitor active agents, memories, evolution events, and safety scores at a glance. These cards update in real-time with simulation data.',
    targetSelector: '[data-tour="metric-cards"]',
    position: 'bottom',
    icon: Activity,
  },
  {
    id: 'health',
    title: 'System Health',
    description:
      'Real-time CPU, memory, network, and agent load monitoring with live simulation. Watch the gauges animate as your system evolves.',
    targetSelector: '[data-tour="health-gauges"]',
    position: 'bottom',
    icon: Activity,
  },
  {
    id: 'evolution',
    title: 'Evolution Engine',
    description:
      'Watch the self-improvement cycle: Observe → Analyze → Hypothesize → Implement → Evaluate → Deploy. This is the heart of autonomous AI improvement.',
    targetSelector: '[data-tour="evolution-pipeline"]',
    position: 'bottom',
    icon: Dna,
    navigateTo: 'dashboard',
  },
  {
    id: 'agents',
    title: 'Agent Management',
    description:
      'View, create, and manage 7 specialized AI agents with performance tracking. Each agent has unique capabilities and tools.',
    targetSelector: '[data-tour="nav-agents"]',
    position: 'right',
    icon: Users,
    navigateTo: 'dashboard',
  },
  {
    id: 'chat',
    title: 'AI Assistant',
    description:
      'Ask questions about your system and get intelligent responses from the AI. It understands your entire system context.',
    targetSelector: '[data-tour="nav-chat"]',
    position: 'right',
    icon: MessageSquare,
    navigateTo: 'dashboard',
  },
  {
    id: 'settings',
    title: 'Configuration',
    description:
      'Customize simulation speed, safety thresholds, and system parameters. Fine-tune how your self-evolving system operates.',
    targetSelector: '[data-tour="nav-settings"]',
    position: 'right',
    icon: Settings,
    navigateTo: 'dashboard',
  },
]

// ---------------------------------------------------------------------------
// Spotlight / Overlay Component
// ---------------------------------------------------------------------------

function TourOverlay({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) return null

  const padding = 8
  const top = targetRect.top - padding
  const left = targetRect.left - padding
  const width = targetRect.width + padding * 2
  const height = targetRect.height + padding * 2
  const borderRadius = 12

  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Spotlight cutout using box-shadow technique */}
      <div
        className="absolute"
        style={{
          top,
          left,
          width,
          height,
          borderRadius,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          border: '2px solid rgba(16,185,129,0.4)',
          position: 'absolute',
          zIndex: 1,
        }}
      />
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Tooltip Arrow Component
// ---------------------------------------------------------------------------

function TooltipArrow({ position }: { position: TourStep['position'] }) {
  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full',
  }

  const arrowRotation = {
    top: 'rotate-180',
    bottom: 'rotate-0',
    left: 'rotate-90',
    right: '-rotate-90',
  }

  return (
    <div className={cn('absolute', arrowClasses[position])}>
      <svg
        width="14"
        height="8"
        viewBox="0 0 14 8"
        className={cn('text-background dark:text-background', arrowRotation[position])}
      >
        <path
          d="M7 0L14 8H0L7 0Z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tooltip Component
// ---------------------------------------------------------------------------

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}: {
  step: TourStep
  stepIndex: number
  totalSteps: number
  targetRect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onFinish: () => void
}) {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) return

    const tooltip = tooltipRef.current.getBoundingClientRect()
    const gap = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top = 0
    let left = 0

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + gap
        left = targetRect.left + targetRect.width / 2 - tooltip.width / 2
        break
      case 'top':
        top = targetRect.top - tooltip.height - gap
        left = targetRect.left + targetRect.width / 2 - tooltip.width / 2
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltip.height / 2
        left = targetRect.left - tooltip.width - gap
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltip.height / 2
        left = targetRect.right + gap
        break
    }

    // Clamp to viewport
    const margin = 16
    left = Math.max(margin, Math.min(left, vw - tooltip.width - margin))
    top = Math.max(margin, Math.min(top, vh - tooltip.height - margin))

    setTooltipStyle({ top, left })
  }, [targetRect, step.position])

  const Icon = step.icon
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const progress = ((stepIndex + 1) / totalSteps) * 100

  return (
    <motion.div
      ref={tooltipRef}
      className="fixed z-[102] w-[340px] sm:w-[380px]"
      style={tooltipStyle}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="relative bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        <TooltipArrow position={step.position} />

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 shrink-0">
                  <Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {step.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Step {stepIndex + 1} of {totalSteps}
                </p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
            >
              <X className="size-3.5" />
              <span className="sr-only">Skip tour</span>
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i < stepIndex
                    ? 'size-2 bg-emerald-500'
                    : i === stepIndex
                      ? 'size-2.5 bg-primary'
                      : 'size-2 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  className="gap-1.5 text-muted-foreground hover:text-foreground h-8"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground h-8"
              >
                Skip
              </Button>
              {isLast ? (
                <Button
                  size="sm"
                  onClick={onFinish}
                  className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  Get Started
                  <Sparkles className="size-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onNext}
                  className="gap-1.5 h-8"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main OnboardingTour Component
// ---------------------------------------------------------------------------

export function OnboardingTour() {
  const tourActive = useAppStore((s) => s.tourActive)
  const tourStep = useAppStore((s) => s.tourStep)
  const startTour = useAppStore((s) => s.startTour)
  const nextTourStep = useAppStore((s) => s.nextTourStep)
  const prevTourStep = useAppStore((s) => s.prevTourStep)
  const endTour = useAppStore((s) => s.endTour)
  const completeTour = useAppStore((s) => s.completeTour)
  const tourCompleted = useAppStore((s) => s.tourCompleted)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  // Derive current step from store state
  const currentStep = TOUR_STEPS[tourStep] ?? TOUR_STEPS[0]

  // Auto-start tour on first visit
  useEffect(() => {
    if (!tourCompleted && !tourActive) {
      const timer = setTimeout(() => {
        startTour()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [tourCompleted, tourActive, startTour])

  // Navigate when tour step requires it
  useEffect(() => {
    if (!tourActive) return
    const step = TOUR_STEPS[tourStep]
    if (!step) {
      endTour()
      return
    }
    if (step.navigateTo) {
      setCurrentPage(step.navigateTo)
    }
  }, [tourActive, tourStep, setCurrentPage, endTour])

  // Scroll target element into view and compute its rect
  useEffect(() => {
    if (!tourActive) return

    const step = TOUR_STEPS[tourStep]
    if (!step) return

    const el = document.querySelector(step.targetSelector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      // Wait for scroll to settle then read rect
      const timer = setTimeout(() => {
        const updated = el.getBoundingClientRect()
        setTargetRect(updated)
      }, 300)
      return () => clearTimeout(timer)
    }
    // Element not found — schedule rect clear asynchronously
    const timer = setTimeout(() => setTargetRect(null), 0)
    return () => clearTimeout(timer)
  }, [tourActive, tourStep])

  // Update rect on resize/scroll
  useEffect(() => {
    if (!tourActive) return

    const handleUpdate = () => {
      const step = TOUR_STEPS[tourStep]
      if (!step) return
      const el = document.querySelector(step.targetSelector)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
      }
    }

    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)

    // Also update periodically (for animated elements)
    const interval = setInterval(handleUpdate, 500)

    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
      clearInterval(interval)
    }
  }, [tourActive, tourStep])

  const handleNext = useCallback(() => {
    if (tourStep >= TOUR_STEPS.length - 1) {
      completeTour()
    } else {
      nextTourStep()
    }
  }, [tourStep, nextTourStep, completeTour])

  const handlePrev = useCallback(() => {
    if (tourStep > 0) {
      prevTourStep()
    }
  }, [tourStep, prevTourStep])

  const handleSkip = useCallback(() => {
    endTour()
  }, [endTour])

  const handleFinish = useCallback(() => {
    completeTour()
  }, [completeTour])

  // Keyboard navigation
  useEffect(() => {
    if (!tourActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleSkip()
          break
        case 'ArrowRight':
        case 'Enter':
          handleNext()
          break
        case 'ArrowLeft':
          handlePrev()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tourActive, handleNext, handlePrev, handleSkip])

  if (!tourActive) return null

  return (
    <AnimatePresence mode="wait">
      {tourActive && (
        <>
          <TourOverlay targetRect={targetRect} />
          <TourTooltip
            key={currentStep.id}
            step={currentStep}
            stepIndex={tourStep}
            totalSteps={TOUR_STEPS.length}
            targetRect={targetRect}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            onFinish={handleFinish}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Help Button Component (for header)
// ---------------------------------------------------------------------------

export function TourHelpButton() {
  const startTour = useAppStore((s) => s.startTour)
  const tourActive = useAppStore((s) => s.tourActive)

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'size-8 text-muted-foreground hover:text-foreground transition-colors',
        tourActive && 'text-emerald-500'
      )}
      onClick={startTour}
      title="Restart guided tour"
    >
      <HelpCircle className="size-4" />
      <span className="sr-only">Help & Tour</span>
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Welcome Card for Dashboard (shown to first-time users)
// ---------------------------------------------------------------------------

export function TourWelcomeCard() {
  const startTour = useAppStore((s) => s.startTour)
  const tourCompleted = useAppStore((s) => s.tourCompleted)

  // Only show to users who haven't completed the tour
  if (tourCompleted) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 24 }}
    >
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-500/10 shrink-0">
            <Sparkles className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground mb-1">
              Welcome to EvoAI!
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              New here? Take a quick guided tour to learn about all the features
              your Self-Evolving AI System has to offer.
            </p>
            <Button
              size="sm"
              onClick={startTour}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Sparkles className="size-3.5" />
              Take the Tour
            </Button>
          </div>
        </div>
        {/* Decorative gradient accent */}
        <div className="absolute -top-12 -right-12 size-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 size-24 rounded-full bg-teal-500/5 blur-2xl pointer-events-none" />
      </div>
    </motion.div>
  )
}
