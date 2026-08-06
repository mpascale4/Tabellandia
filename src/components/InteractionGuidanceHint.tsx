import React from 'react';

type InteractionGuidanceKind = 'touch' | 'avoid';
type InteractionGuidancePlacement = 'offset' | 'center';

interface InteractionGuidanceHintProps {
  kind: InteractionGuidanceKind;
  reducedMotion: boolean;
  placement?: InteractionGuidancePlacement;
}

const TOUCH_ICON = '👆';
const AVOID_ICON = '☠️';

export default function InteractionGuidanceHint({ kind, reducedMotion, placement = 'offset' }: InteractionGuidanceHintProps) {
  const isTouch = kind === 'touch';
  const badgeClass = isTouch
    ? 'border-cyan-100 bg-cyan-500 text-white'
    : 'border-rose-100 bg-rose-600 text-white';
  const animationClass = reducedMotion
    ? 'animate-[pulse_2.6s_ease-in-out_infinite]'
    : 'animate-[pulse_0.9s_ease-in-out_infinite]';
  const placementClass = placement === 'center'
    ? 'inline-flex'
    : 'absolute -top-4 -left-4 inline-flex';

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none h-10 min-w-10 items-center justify-center rounded-full border-2 px-1 text-xl font-black shadow-xl ${placementClass} ${badgeClass} ${animationClass}`}
    >
      {isTouch ? TOUCH_ICON : AVOID_ICON}
    </span>
  );
}
