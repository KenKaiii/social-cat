import { useCallback } from 'react';
import { toast } from 'sonner';

export interface DeleteConfirmationOptions {
  /** Item name to show in confirmation */
  itemName: string;
  /** Item type (e.g., "workflow", "credential") */
  itemType?: string;
  /** Custom confirmation message */
  message?: string;
  /** Custom action label (default: "Delete") */
  actionLabel?: string;
  /** Function to execute on confirmation */
  onConfirm: () => Promise<void> | void;
  /** Function to execute on success */
  onSuccess?: () => void;
  /** Function to execute on error */
  onError?: (error: unknown) => void;
}

/**
 * Custom hook for delete confirmation using toast
 *
 * Provides a consistent UX for delete operations with:
 * - Confirmation dialog via toast
 * - Loading state during deletion
 * - Success/error feedback
 * - Error handling
 *
 * @returns Function to trigger delete confirmation
 *
 * @example
 * ```tsx
 * const confirmDelete = useDeleteConfirmation();
 *
 * const handleDelete = () => {
 *   confirmDelete({
 *     itemName: workflow.name,
 *     itemType: 'workflow',
 *     onConfirm: async () => {
 *       await deleteWorkflow(workflow.id);
 *     },
 *     onSuccess: () => {
 *       router.refresh();
 *     }
 *   });
 * };
 * ```
 */
export function useDeleteConfirmation() {
  const confirmDelete = useCallback((options: DeleteConfirmationOptions) => {
    const {
      itemName,
      itemType = 'item',
      message,
      actionLabel = 'Delete',
      onConfirm,
      onSuccess,
      onError,
    } = options;

    const displayMessage = message || `Delete "${itemName}"?`;
    const description = `This ${itemType} will be permanently deleted. This action cannot be undone.`;

    toast(displayMessage, {
      description,
      action: {
        label: actionLabel,
        onClick: async () => {
          try {
            // Show loading toast
            const loadingToast = toast.loading(`Deleting ${itemType}...`);

            // Execute deletion
            await onConfirm();

            // Dismiss loading toast
            toast.dismiss(loadingToast);

            // Show success toast
            toast.success('Deleted successfully', {
              description: `${itemName} has been deleted.`,
            });

            // Execute success callback
            if (onSuccess) {
              onSuccess();
            }
          } catch (error) {
            // Show error toast
            const errorMessage = error instanceof Error
              ? error.message
              : 'Unknown error occurred';

            toast.error('Failed to delete', {
              description: errorMessage,
            });

            // Execute error callback
            if (onError) {
              onError(error);
            }
          }
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {
          // User cancelled, do nothing
        },
      },
    });
  }, []);

  return confirmDelete;
}
