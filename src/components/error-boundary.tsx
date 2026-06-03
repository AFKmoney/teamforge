'use client'

import React from 'react'
import { AlertTriangle, RotateCcw, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional custom fallback UI to render on error */
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  /** Callback when the error boundary resets */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ---------------------------------------------------------------------------
// Error Boundary Class Component
// ---------------------------------------------------------------------------

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  resetError = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      // Default fallback UI
      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Default Error Fallback
// ---------------------------------------------------------------------------

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  // Sanitize the error message — don't show raw stack traces
  const message = error.message || 'An unexpected error occurred'
  const sanitizedMessage = message.split('\n')[0].slice(0, 200)

  const handleReportIssue = () => {
    toast.success('Issue reported', {
      description: 'Thank you for reporting this issue. Our team will investigate.',
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <div className="flex items-center justify-center size-16 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-1">
        The application encountered an unexpected error.
      </p>
      <p className="text-sm text-muted-foreground/80 max-w-md mb-6 font-mono bg-muted/50 px-3 py-1.5 rounded-md">
        {sanitizedMessage}
      </p>
      <div className="flex items-center gap-3">
        <Button
          onClick={resetError}
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={handleReportIssue}
          className="gap-2"
        >
          <Flag className="size-4" />
          Report Issue
        </Button>
      </div>
    </div>
  )
}
