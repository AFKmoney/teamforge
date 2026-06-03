/**
 * Toast utility functions for common toast patterns.
 * Uses the sonner toast system already configured in the project.
 */

import { toast } from 'sonner'

/**
 * Green success toast
 */
export function toastSuccess(title: string, description?: string) {
  toast.success(title, {
    description,
    className: 'border-emerald-500/30 dark:border-emerald-500/20',
  })
}

/**
 * Red error toast
 */
export function toastError(title: string, description?: string) {
  toast.error(title, {
    description,
    className: 'border-destructive/30 dark:border-destructive/20',
  })
}

/**
 * Amber warning toast
 */
export function toastWarning(title: string, description?: string) {
  toast.warning(title, {
    description,
    className: 'border-amber-500/30 dark:border-amber-500/20',
  })
}

/**
 * Blue info toast
 */
export function toastInfo(title: string, description?: string) {
  toast.info(title, {
    description,
    className: 'border-blue-500/30 dark:border-blue-500/20',
  })
}

/**
 * Toast with an action button
 */
export function toastAction(
  title: string,
  description: string,
  actionLabel: string,
  onAction: () => void
) {
  toast(title, {
    description,
    action: {
      label: actionLabel,
      onClick: onAction,
    },
  })
}
