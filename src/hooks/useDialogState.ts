import { useState, useCallback } from 'react';

export interface DialogState<T = unknown> {
  /** Whether the dialog is open */
  open: boolean;
  /** Set dialog open state */
  setOpen: (open: boolean) => void;
  /** Loading state (e.g., fetching initial data) */
  loading: boolean;
  /** Saving state (e.g., submitting form) */
  saving: boolean;
  /** Dialog data */
  data: T | null;
  /** Set dialog data */
  setData: (data: T | null) => void;
  /** Execute async operation with loading state */
  withLoading: (fn: () => Promise<void>) => Promise<void>;
  /** Execute async operation with saving state */
  withSaving: (fn: () => Promise<void>) => Promise<void>;
  /** Open dialog with optional data */
  openDialog: (data?: T) => void;
  /** Close dialog and reset state */
  closeDialog: () => void;
}

/**
 * Custom hook for managing dialog/modal state
 *
 * Provides consistent state management for dialogs including:
 * - Open/close state
 * - Loading state for data fetching
 * - Saving state for form submission
 * - Data management
 *
 * @template T - Type of data managed by the dialog
 * @param initialData - Optional initial data
 * @returns Dialog state and control methods
 *
 * @example
 * ```tsx
 * const dialog = useDialogState<Workflow>();
 *
 * // Open dialog with data
 * dialog.openDialog(workflow);
 *
 * // Load data
 * await dialog.withLoading(async () => {
 *   const data = await fetchData();
 *   dialog.setData(data);
 * });
 *
 * // Save data
 * await dialog.withSaving(async () => {
 *   await saveData(dialog.data);
 *   dialog.closeDialog();
 * });
 * ```
 */
export function useDialogState<T = unknown>(
  initialData?: T
): DialogState<T> {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<T | null>(initialData || null);

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const withSaving = useCallback(async (fn: () => Promise<void>) => {
    setSaving(true);
    try {
      await fn();
    } finally {
      setSaving(false);
    }
  }, []);

  const openDialog = useCallback((dialogData?: T) => {
    if (dialogData !== undefined) {
      setData(dialogData);
    }
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setLoading(false);
    setSaving(false);
    // Optional: Clear data on close
    // setData(null);
  }, []);

  return {
    open,
    setOpen,
    loading,
    saving,
    data,
    setData,
    withLoading,
    withSaving,
    openDialog,
    closeDialog,
  };
}
