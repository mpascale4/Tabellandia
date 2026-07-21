import React from 'react';
import { motion } from 'motion/react';

interface CombinationCarouselProps {
  completed: Set<number>;
  onSelect: (factor: number) => void;
  worldId: number;
  stepColor: 'indigo' | 'purple' | 'emerald' | 'amber';
}

export default function CombinationCarousel({
  completed,
  onSelect,
  worldId,
  stepColor,
}: CombinationCarouselProps) {
  const colorMap = {
    indigo: 'border-indigo-300',
    purple: 'border-purple-300',
    emerald: 'border-emerald-300',
    amber: 'border-amber-300',
  };

  return (
    <motion.div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none justify-start px-6 py-4">
      {Array.from({ length: 10 }).map((_, idx) => {
        const factor = idx + 1;
        const isCompleted = completed.has(factor);

        return (
          <motion.button
            key={factor}
            whileHover={{ scale: 1.05 }}
            onClick={() => onSelect(factor)}
            className={`flex-shrink-0 py-3 px-4 rounded-2xl font-bold transition-all cursor-pointer text-sm min-w-max ${
              isCompleted
                ? 'bg-emerald-500 text-white shadow-md'
                : `bg-white text-slate-800 border-2 ${colorMap[stepColor]} hover:bg-slate-50`
            }`}
          >
            {isCompleted && '✅ '}
            {worldId}×{factor}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
