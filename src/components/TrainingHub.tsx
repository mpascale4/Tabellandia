/**
 * TrainingHub – Modale principale della modalità Allenamento.
 * Gestisce il routing interno: lista tabelline → sessione esercizio.
 */

import React, { useState } from 'react';
import { UserProfile, WorldConfig } from '../types';
import { WORLDS_DATA } from '../data';

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface TrainingHubProps {
  profile: UserProfile;
  compactLayout?: boolean;
}

// ─── Helper: stelle per mondo ─────────────────────────────────────────────────

function getStars(profile: UserProfile, worldId: number): number {
  return profile.worldProgress?.[worldId]?.stars ?? 0;
}

function StarRow({ stars }: { stars: number }) {
  return (
    <span aria-label={`${stars} stelle su 3`} className="flex gap-0.5 justify-center">
      {[1, 2, 3].map(n => (
        <span
          key={n}
          aria-hidden="true"
          className={`text-base leading-none ${n <= stars ? 'opacity-100' : 'opacity-20'}`}
        >
          ⭐
        </span>
      ))}
    </span>
  );
}

// ─── Card singola tabellina ───────────────────────────────────────────────────

interface WorldCardProps {
  world: WorldConfig;
  stars: number;
  onSelect: (id: number) => void;
}

function WorldCard({ world, stars, onSelect }: WorldCardProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(world.id)}
        className="w-full h-full rounded-3xl border-2 border-white/60 bg-white/50 backdrop-blur-sm shadow-md
                   hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer
                   focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                   flex flex-col items-center justify-center gap-2 py-5 px-3"
        aria-label={`Allena tabellina del ${world.id}: ${world.name}`}
      >
        {/* Emoji */}
        <span className="text-5xl leading-none select-none" aria-hidden="true">
          {world.symbol}
        </span>

        {/* Numero tabellina */}
        <span className="text-2xl font-black text-sky-950 leading-none">×{world.id}</span>

        {/* Nome mascotte */}
        <span className="text-[11px] font-bold text-sky-700/80 font-sans text-center leading-tight">
          {world.mascotName}
        </span>

        {/* Stelle (solo se il mondo è stato giocato in avventura) */}
        {stars > 0 && <StarRow stars={stars} />}
      </button>
    </li>
  );
}

// ─── Placeholder sessione esercizio (step 2) ─────────────────────────────────

function TrainingSession({
  world,
  onBack,
}: {
  world: WorldConfig;
  onBack: () => void;
}) {
  return (
    <section
      aria-labelledby="training-session-title"
      className="min-h-[400px] flex flex-col items-center justify-center text-center gap-4 p-8
                 rounded-3xl bg-white/40 backdrop-blur-sm border border-white/50 shadow-md"
    >
      <p className="text-6xl leading-none select-none" aria-hidden="true">{world.symbol}</p>
      <h2 id="training-session-title" className="text-2xl font-black text-sky-950 font-sans">
        Allenamento ×{world.id}
      </h2>
      <p className="text-sm text-sky-900/75 font-medium max-w-xs leading-relaxed">
        La sessione di esercizio è in costruzione. Torna presto! 🚧
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95
                   text-white font-black text-sm transition-all cursor-pointer shadow-md
                   focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        ← Torna alla lista
      </button>
    </section>
  );
}

// ─── Home: lista tabelline ────────────────────────────────────────────────────

function TrainingHome({
  profile,
  compactLayout,
  onSelect,
}: {
  profile: UserProfile;
  compactLayout?: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className={`bg-white/40 backdrop-blur-sm rounded-3xl border border-white/40 shadow-sm
                    p-4 ${compactLayout ? '' : 'md:p-5'} space-y-1`}
      >
        <span className="inline-block text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200
                         px-2.5 py-0.5 rounded-full uppercase tracking-widest font-sans">
          Allenamento libero
        </span>
        <h2 className="text-xl font-black text-sky-950 font-sans">
          Quale tabellina vuoi allenare?
        </h2>
        <p className="text-xs text-sky-900/75 font-medium leading-relaxed">
          Tutte le tabelline sono disponibili. Scegli quella che vuoi esercitare!
        </p>
      </div>

      {/* Griglia tabelline */}
      <ul
        role="list"
        aria-label="Lista tabelline disponibili"
        className={`grid gap-3 ${
          compactLayout
            ? 'grid-cols-3'
            : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
        }`}
      >
        {WORLDS_DATA.map(world => (
          <WorldCard
            key={world.id}
            world={world}
            stars={getStars(profile, world.id)}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

// ─── Hub principale (routing interno) ────────────────────────────────────────

export default function TrainingHub({ profile, compactLayout }: TrainingHubProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedWorld = selectedId !== null
    ? WORLDS_DATA.find(w => w.id === selectedId) ?? null
    : null;

  if (selectedWorld) {
    return (
      <TrainingSession
        world={selectedWorld}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <TrainingHome
      profile={profile}
      compactLayout={compactLayout}
      onSelect={setSelectedId}
    />
  );
}

