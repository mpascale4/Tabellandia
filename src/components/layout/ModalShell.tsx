/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalShellProps {
  isOpen: boolean;
  onBackdropClick?: () => void;
  /** Tailwind classes for the backdrop, e.g. 'bg-black/40 backdrop-blur-sm'. */
  backdropClassName?: string;
  /** Tailwind classes for the centered card, e.g. max-width/border/shadow/background. */
  cardClassName?: string;
  zIndexClassName?: string;
  paddingClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared backdrop + centered-card modal shell, extracted from the repeated
 * `fixed inset-0 ... backdrop-blur-sm ... flex items-center justify-center`
 * pattern found in ParentPinModal, CurrencyInfoModal, and similar popups.
 * Callers own their own card content/animation variants for the inner card
 * if they need something other than the default scale/opacity transition.
 */
export default function ModalShell({
  isOpen,
  onBackdropClick,
  backdropClassName = 'bg-black/40 backdrop-blur-sm',
  cardClassName = 'bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-indigo-200',
  zIndexClassName = 'z-50',
  paddingClassName = 'p-4',
  children,
}: ModalShellProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center ${paddingClassName} ${backdropClassName}`}
          onClick={onBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cardClassName}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
