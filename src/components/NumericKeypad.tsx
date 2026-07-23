import React from 'react';
import { motion } from 'motion/react';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  submitLabel?: string;
  maxDigits?: number;
  disabled?: boolean;
}

export default function NumericKeypad({
  value,
  onChange,
  onSubmit,
  submitLabel = 'Verifica',
  maxDigits = 3,
  disabled = false
}: NumericKeypadProps) {
  const handleDigitClick = (digit: string) => {
    if (value.length < maxDigits) {
      const newValue = value + digit;
      onChange(newValue);
      // Auto-submit when reaching maxDigits (e.g., 4 digits for PIN)
      if (newValue.length === maxDigits) {
        // Call onSubmit with the complete value
        setTimeout(() => {
          onSubmit(newValue);
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Display */}
      <div className="flex items-center justify-center">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-2xl px-6 py-4 min-w-[200px] text-center shadow-sm">
          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
            Risultato
          </div>
          <div className="text-4xl font-black text-indigo-900 font-mono tracking-wider">
            {value || '0'}
          </div>
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <motion.button
            key={digit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleDigitClick(String(digit))}
            disabled={disabled}
            className="bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-2xl py-4 rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-sans"
          >
            {digit}
          </motion.button>
        ))}
      </div>

      {/* Bottom row: 0, Backspace, Clear */}
      <div className="grid grid-cols-3 gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleDigitClick('0')}
          disabled={disabled}
          className="bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-2xl py-4 rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-sans"
        >
          0
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className="bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black py-4 rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
        >
          <Delete className="w-6 h-6" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClear}
          disabled={disabled || value.length === 0}
          className="bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-sm py-4 rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-sans"
        >
          C
        </motion.button>
      </div>

      {/* Submit Button - Hidden when maxDigits is 4 (PIN auto-submit) */}
      {maxDigits !== 4 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSubmit}
          disabled={disabled || value.length === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-sans"
        >
          {submitLabel}
        </motion.button>
      )}
    </div>
  );
}
