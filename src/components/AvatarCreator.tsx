/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, ShopItem, AvatarConfig } from '../types';
import { SHOP_ITEMS, WORLDS_DATA } from '../data';
import { sound } from './SoundManager';
import { Sparkles, Coins, ShoppingBag, Palette, Shirt, Award, Check } from 'lucide-react';
import CurrencyInfoModal from './CurrencyInfoModal';
import { getGenderedText, getPlayerGender } from '../utils/playerCopy';

interface AvatarCreatorProps {
  profile: UserProfile;
  updateProfile: (updater: (p: UserProfile) => UserProfile) => void;
  compactLayout?: boolean;
}

export default function AvatarCreator({ profile, updateProfile, compactLayout = false }: AvatarCreatorProps) {
  const [activeTab, setActiveTab] = useState<'customize' | 'shop'>('customize');
  const [shopCategory, setShopCategory] = useState<'hair' | 'shirt' | 'pants' | 'hat' | 'backpack'>('hair');
  const [custCategory, setCustCategory] = useState<'base' | 'hair' | 'shirt' | 'pants' | 'hat' | 'backpack' | 'mascot'>('base');
  const [currencyModalType, setCurrencyModalType] = useState<'drops' | 'coins' | null>(null);
  const playerGender = getPlayerGender(profile);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const scrollables = document.querySelectorAll('.overflow-y-auto');
    scrollables.forEach(el => {
      el.scrollTop = 0;
    });
  }, [activeTab, shopCategory, custCategory]);

  // Available free selections
  const FREE_HAIR_COLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#7c3aed", "#1f2937"];
  const FREE_SHIRT_COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#8b5cf6"];
  const FREE_PANTS_COLORS = ["#4b5563", "#2563eb", "#059669", "#dc2626", "#d97706", "#7c3aed"];

  const totalCoins = Object.values(profile.worldProgress || {}).reduce((sum, wp) => sum + (wp.coins ?? wp.devCoins ?? 0), 0);
  const totalDrops = Object.values(profile.worldProgress || {}).reduce((sum, wp) => sum + (wp.lightDrops ?? wp.devLightDrops ?? 0), 0);

  const handleBuyItem = (item: ShopItem) => {
    if (totalCoins < item.cost) {
      sound.playError();
      return;
    }

    sound.playPowerUp();
    updateProfile(p => {
      let costToDeduct = item.cost;
      const updatedWorldProgress = { ...p.worldProgress };
      for (const wIdStr of Object.keys(updatedWorldProgress)) {
        if (costToDeduct <= 0) break;
        const wId = Number(wIdStr);
        const wp = updatedWorldProgress[wId];
        const currentWCoins = wp.coins ?? wp.devCoins ?? 0;
        const deduct = Math.min(costToDeduct, currentWCoins);
        const newWCoins = currentWCoins - deduct;
        updatedWorldProgress[wId] = {
          ...wp,
          coins: newWCoins,
          devCoins: newWCoins,
        };
        costToDeduct -= deduct;
      }
      return {
        ...p,
        worldProgress: updatedWorldProgress,
        unlockedAccessories: [...p.unlockedAccessories, item.id],
        avatar: {
          ...p.avatar,
          [item.category === 'hair' ? 'hairStyle' : item.category]: item.name
        }
      };
    });
  };

  const handleEquipFreeColor = (category: 'hairColor' | 'shirtColor' | 'pantsColor', color: string) => {
    sound.playClick();
    updateProfile(p => ({
      ...p,
      avatar: {
        ...p.avatar,
        [category]: color
      }
    }));
  };

  const handleEquipItem = (category: keyof AvatarConfig, value: string) => {
    sound.playClick();
    updateProfile(p => ({
      ...p,
      avatar: {
        ...p.avatar,
        [category]: value
      }
    }));
  };

  // Get active companion creature emoji or graphic
  const getMascotEmoji = () => {
    const activeMascot = profile.avatar.mascot;
    if (!activeMascot || activeMascot === 'Nessuna') return "✨";
    const foundWorld = WORLDS_DATA.find(w => w.creatureName === activeMascot);
    if (!foundWorld) return "🐱";
    // Check creature evolution
    const worldProg = profile.worldProgress[foundWorld.id];
    const evolution = worldProg?.creatureEvolution || 'egg';
    if (evolution === 'egg') return "🥚";
    if (evolution === 'child') return "👶";
    return "🐉";
  };

  // Render a visual miniature avatar based on equipped specs
  const renderAvatarGraphic = (size: 'sm' | 'md' | 'lg' = 'lg') => {
    const isLg = size === 'lg';
    const faceBg = profile.avatar.gender === 'kid1' ? '#ffedd5' : '#fef3c7';
    
    return (
      <div className={`relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-sky-100 to-indigo-100/40 p-4 border-2 border-indigo-200/50 ${isLg ? 'w-56 h-64' : 'w-24 h-28'}`}>
        
        {/* Companion Mascot Floating */}
        {profile.avatar.mascot && profile.avatar.mascot !== 'Nessuna' && (
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute -right-1 top-2 bg-white/80 px-2 py-1 rounded-full shadow-md border border-indigo-100 flex items-center gap-1 text-sm font-bold"
          >
            <span>{getMascotEmoji()}</span>
            {isLg && <span className="text-[10px] text-indigo-700 font-sans">{profile.avatar.mascot}</span>}
          </motion.div>
        )}

        {/* Hat / Accessory */}
        {profile.avatar.hat && profile.avatar.hat !== 'Nessuno' && (
          <div className="absolute top-2 z-30 text-3xl select-none filter drop-shadow">
            {profile.avatar.hat.includes("Corona") && "👑"}
            {profile.avatar.hat.includes("Mago") && "🧙‍♂️"}
            {profile.avatar.hat.includes("Elmo") && "🪖"}
            {profile.avatar.hat.includes("Aviatore") && "🧢"}
          </div>
        )}

        {/* Head Container */}
        <div className="relative flex flex-col items-center">
          
          {/* Hair Style */}
          <div className="z-10 absolute -top-3 text-3xl select-none filter drop-shadow" style={{ color: profile.avatar.hairColor }}>
            {profile.avatar.hairStyle.includes("Punk") && "🔥"}
            {profile.avatar.hairStyle.includes("Treccine") && "👧"}
            {profile.avatar.hairStyle.includes("Ciuffo") && "💇"}
            {profile.avatar.hairStyle.includes("Chioma") && "👱"}
            {!profile.avatar.hairStyle || profile.avatar.hairStyle === 'Nessuno' ? "🧑" : ""}
          </div>

          {/* Face */}
          <div 
            className="w-16 h-16 rounded-full relative shadow-inner flex flex-col justify-center items-center z-0 border border-amber-200/40"
            style={{ backgroundColor: faceBg }}
          >
            {/* Eyes */}
            <div className="flex gap-4 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 animate-pulse"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 animate-pulse"></div>
            </div>
            {/* Smile */}
            <div className="w-6 h-2.5 border-b-2 border-slate-700 rounded-b-full"></div>
            {/* Cheeks */}
            <div className="flex justify-between w-10 absolute bottom-3">
              <div className="w-2 h-1 rounded-full bg-rose-400/40"></div>
              <div className="w-2 h-1 rounded-full bg-rose-400/40"></div>
            </div>
          </div>
        </div>

        {/* Body (Shirt & Pants) */}
        <div className="flex flex-col items-center -mt-1.5 z-10">
          {/* Shirt */}
          <div 
            className="w-14 h-12 rounded-t-xl relative shadow-md flex justify-center items-center border-t border-white/20"
            style={{ backgroundColor: profile.avatar.shirtColor }}
          >
            {/* Backpack decoration */}
            {profile.avatar.backpack && profile.avatar.backpack !== 'Nessuno' && (
              <span className="absolute -left-2 text-xl filter drop-shadow">
                {profile.avatar.backpack.includes("Jetpack") && "🚀"}
                {profile.avatar.backpack.includes("Guscio") && "🐢"}
                {profile.avatar.backpack.includes("Scudo") && "🛡️"}
              </span>
            )}
            <div className="text-white text-[9px] font-bold tracking-wide uppercase opacity-75 font-mono">
              {profile.level > 1 ? `LV ${profile.level}` : getGenderedText(playerGender, 'HERO', 'HEROINA')}
            </div>
          </div>

          {/* Pants */}
          <div 
            className="w-12 h-8 rounded-b-lg flex justify-around p-0.5 border-t border-black/10 shadow-inner"
            style={{ backgroundColor: profile.avatar.pantsColor }}
          >
            <div className="w-3 h-full bg-black/10 rounded-b"></div>
            <div className="w-3 h-full bg-black/10 rounded-b"></div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <span className="text-xs font-bold text-slate-700 bg-white/70 px-2.5 py-1 rounded-full shadow-sm border border-indigo-100/50">
            {profile.name}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full flex flex-col gap-4 p-1 h-full ${compactLayout ? '' : 'md:flex-row md:gap-6'}`} id="avatar-creator-panel">
      {/* Left side: Avatar Preview & Stats */}
      <div className={`flex flex-col items-center bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl justify-center ${compactLayout ? 'w-full' : 'md:w-1/3 min-w-[240px]'}`}>
        <h3 className="text-lg font-bold text-indigo-950 flex items-center gap-1.5 mb-1 font-sans">
          <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
          {getGenderedText(playerGender, 'Il Mio Eroe', 'La Mia Eroina')}
        </h3>
        <p className="text-xs text-slate-500 mb-4 text-center">
          Personalizza il tuo aspetto usando le monete guadagnate con la matematica!
        </p>

        {renderAvatarGraphic('lg')}

        <div className="mt-5 w-full bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-3 flex justify-around items-center">
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Livello</span>
            <span className="text-xl font-black text-indigo-700 font-mono">{profile.level}</span>
          </div>
          <div className="h-8 w-px bg-indigo-100"></div>
          <div className="text-center p-1 rounded-xl group">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium font-sans group-hover:text-amber-800">Monete</span>
            <span className="text-xl font-black text-amber-600 font-mono flex items-center gap-1 justify-center">
              <Coins className="w-5 h-5 text-amber-500 fill-amber-500 animate-bounce" />
              {totalCoins}
            </span>
          </div>
          <div className="h-8 w-px bg-indigo-100"></div>
          <div className="text-center p-1 rounded-xl group">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium group-hover:text-sky-800">Gocce</span>
            <span className="text-xl font-black text-sky-600 font-mono flex items-center gap-1 justify-center">
              💧 {totalDrops}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Options / Shop Tabs */}
      <div className="flex-1 bg-white rounded-3xl p-5 border border-indigo-100 shadow-xl flex flex-col min-h-[400px]">
        {/* Navigation Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl mb-4">
          <button
            onClick={() => { sound.playClick(); setActiveTab('customize'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'customize'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
            id="avatar-tab-customize"
          >
            <Palette className="w-4 h-4 text-indigo-600" />
            Armadio Magico
          </button>
          <button
            onClick={() => { sound.playClick(); setActiveTab('shop'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
            id="avatar-tab-shop"
          >
            <ShoppingBag className="w-4 h-4" />
            Emporio Reale ({SHOP_ITEMS.length} Oggetti)
          </button>
        </div>

        {/* Tab 1: Customize Unlocked & Free Items */}
        {activeTab === 'customize' && (
          <div className="flex-1 flex flex-col">
            {/* Customizer Sub-categories */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3 border-b border-slate-100 scrollbar-none">
              {[
                { id: 'base', name: 'Corpo', emoji: '🧑' },
                { id: 'hair', name: 'Capelli', emoji: '💇' },
                { id: 'shirt', name: 'Veste', emoji: '👕' },
                { id: 'pants', name: 'Pantaloni', emoji: '👖' },
                { id: 'hat', name: 'Cappello', emoji: '🎩' },
                { id: 'backpack', name: 'Zaino', emoji: '🎒' },
                { id: 'mascot', name: 'Mascot', emoji: '🐉' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { sound.playClick(); setCustCategory(cat.id as any); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    custCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                  id={`cust-category-${cat.id}`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Customizer Selection Content */}
            <div className="flex-1 overflow-y-auto max-h-[300px] p-1">
              {custCategory === 'base' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Base del profilo</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 leading-relaxed">
                      La base del profilo si sceglie all'ingresso. Qui puoi solo vedere il modello attivo.
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-xl border-2 text-center font-bold ${profile.avatar.gender === 'kid1' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                          🧒 Bimbo 1
                        </div>
                        <div className={`p-3 rounded-xl border-2 text-center font-bold ${profile.avatar.gender === 'kid2' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                          👧 Bimbo 2
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {custCategory === 'hair' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Colore Capelli (Gratis)</h4>
                    <div className="flex flex-wrap gap-2">
                      {FREE_HAIR_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => handleEquipFreeColor('hairColor', color)}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer relative"
                          style={{ backgroundColor: color }}
                          id={`free-hair-color-${color}`}
                        >
                          {profile.avatar.hairColor === color && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Taglio Capelli Sbloccato</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEquipItem('hairStyle', 'Nessuno')}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                          profile.avatar.hairStyle === 'Nessuno' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600'
                        }`}
                        id="hair-default-btn"
                      >
                        🧑 Classico
                      </button>
                      {SHOP_ITEMS.filter(i => i.category === 'hair').map(item => {
                        const isUnlocked = profile.unlockedAccessories.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            disabled={!isUnlocked}
                            onClick={() => handleEquipItem('hairStyle', item.name)}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                              !isUnlocked 
                                ? 'opacity-50 border-gray-100 bg-gray-50/50 cursor-not-allowed' 
                                : profile.avatar.hairStyle === item.name 
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer' 
                                  : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600 cursor-pointer'
                            }`}
                            id={`equip-${item.id}`}
                          >
                            <span>{item.previewEmoji} {item.name}</span>
                            {!isUnlocked && <span className="text-[10px] text-amber-600 font-bold font-mono">🔒 Shop</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {custCategory === 'shirt' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Colore Maglietta (Gratis)</h4>
                    <div className="flex flex-wrap gap-2">
                      {FREE_SHIRT_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => handleEquipFreeColor('shirtColor', color)}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer relative"
                          style={{ backgroundColor: color }}
                          id={`free-shirt-color-${color}`}
                        >
                          {profile.avatar.shirtColor === color && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Abiti Speciali Sbloccati</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEquipItem('shirtColor', '#3b82f6')}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                          profile.avatar.shirtColor === '#3b82f6' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600'
                        }`}
                        id="shirt-default-btn"
                      >
                        👕 Classica Azzurra
                      </button>
                      {SHOP_ITEMS.filter(i => i.category === 'shirt').map(item => {
                        const isUnlocked = profile.unlockedAccessories.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            disabled={!isUnlocked}
                            onClick={() => handleEquipItem('shirtColor', item.value)}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                              !isUnlocked 
                                ? 'opacity-50 border-gray-100 bg-gray-50/50 cursor-not-allowed' 
                                : profile.avatar.shirtColor === item.value 
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer' 
                                  : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600 cursor-pointer'
                            }`}
                            id={`equip-${item.id}`}
                          >
                            <span>{item.previewEmoji} {item.name}</span>
                            {!isUnlocked && <span className="text-[10px] text-amber-600 font-bold font-mono">🔒 Shop</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {custCategory === 'pants' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Colore Calzoni (Gratis)</h4>
                    <div className="flex flex-wrap gap-2">
                      {FREE_PANTS_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => handleEquipFreeColor('pantsColor', color)}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer relative"
                          style={{ backgroundColor: color }}
                          id={`free-pants-color-${color}`}
                        >
                          {profile.avatar.pantsColor === color && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Abiti Inferiori Speciali</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEquipItem('pantsColor', '#4b5563')}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                          profile.avatar.pantsColor === '#4b5563' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600'
                        }`}
                        id="pants-default-btn"
                      >
                        👖 Jeans Comuni
                      </button>
                      {SHOP_ITEMS.filter(i => i.category === 'pants').map(item => {
                        const isUnlocked = profile.unlockedAccessories.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            disabled={!isUnlocked}
                            onClick={() => handleEquipItem('pantsColor', item.value)}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                              !isUnlocked 
                                ? 'opacity-50 border-gray-100 bg-gray-50/50 cursor-not-allowed' 
                                : profile.avatar.pantsColor === item.value 
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer' 
                                  : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600 cursor-pointer'
                            }`}
                            id={`equip-${item.id}`}
                          >
                            <span>{item.previewEmoji} {item.name}</span>
                            {!isUnlocked && <span className="text-[10px] text-amber-600 font-bold font-mono">🔒 Shop</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {custCategory === 'hat' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Copricapo Equipaggiato</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEquipItem('hat', 'Nessuno')}
                      className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        profile.avatar.hat === 'Nessuno' || !profile.avatar.hat ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600'
                      }`}
                      id="hat-none-btn"
                    >
                      ❌ Nessun cappello
                    </button>
                    {SHOP_ITEMS.filter(i => i.category === 'hat').map(item => {
                      const isUnlocked = profile.unlockedAccessories.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          disabled={!isUnlocked}
                          onClick={() => handleEquipItem('hat', item.name)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                            !isUnlocked 
                              ? 'opacity-50 border-gray-100 bg-gray-50/50 cursor-not-allowed' 
                              : profile.avatar.hat === item.name 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer' 
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600 cursor-pointer'
                          }`}
                          id={`equip-${item.id}`}
                        >
                          <span>{item.previewEmoji} {item.name}</span>
                          {!isUnlocked && <span className="text-[10px] text-amber-600 font-bold font-mono">🔒 Shop</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {custCategory === 'backpack' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Zaino Equipaggiato</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEquipItem('backpack', 'Nessuno')}
                      className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        profile.avatar.backpack === 'Nessuno' || !profile.avatar.backpack ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600'
                      }`}
                      id="backpack-none-btn"
                    >
                      ❌ Nessuno zaino
                    </button>
                    {SHOP_ITEMS.filter(i => i.category === 'backpack').map(item => {
                      const isUnlocked = profile.unlockedAccessories.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          disabled={!isUnlocked}
                          onClick={() => handleEquipItem('backpack', item.name)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                            !isUnlocked 
                              ? 'opacity-50 border-gray-100 bg-gray-50/50 cursor-not-allowed' 
                              : profile.avatar.backpack === item.name 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer' 
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600 cursor-pointer'
                          }`}
                          id={`equip-${item.id}`}
                        >
                          <span>{item.previewEmoji} {item.name}</span>
                          {!isUnlocked && <span className="text-[10px] text-amber-600 font-bold font-mono">🔒 Shop</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {custCategory === 'mascot' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Compagno di Viaggio Attivo</h4>
                  <p className="text-[11px] text-slate-500">
                    Sblocca nuove creature magiche imparando le tabelline! Esse ti seguiranno in volo.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEquipItem('mascot', 'Nessuna')}
                      className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        profile.avatar.mascot === 'Nessuna' || !profile.avatar.mascot ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600'
                      }`}
                      id="mascot-none-btn"
                    >
                      ❌ Nessuna Mascotte
                    </button>
                    {WORLDS_DATA.map(world => {
                      // Check if they unlocked step 1 'comprendo' or finished world
                      const worldProg = profile.worldProgress[world.id];
                      const isUnlocked = worldProg?.completedSteps?.includes('comprendo') || false;
                      const activeMascot = profile.avatar.mascot === world.creatureName;

                      return (
                        <button
                          key={world.id}
                          disabled={!isUnlocked}
                          onClick={() => handleEquipItem('mascot', world.creatureName)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                            !isUnlocked 
                              ? 'opacity-40 border-gray-100 bg-gray-50/50 cursor-not-allowed' 
                              : activeMascot 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer' 
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-slate-600 cursor-pointer'
                          }`}
                          id={`mascot-equip-${world.id}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{worldProg?.creatureEvolution === 'egg' ? '🥚' : worldProg?.creatureEvolution === 'child' ? '👶' : '🐉'}</span>
                            <span>{world.creatureName}</span>
                          </span>
                          {!isUnlocked && <span className="text-[9px] text-slate-400 font-bold font-sans">Mondo {world.id}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: The Emporio Shop */}
        {activeTab === 'shop' && (
          <div className="flex-1 flex flex-col">
            {/* Shop Categories */}
            <div className="flex gap-2 mb-3">
              {[
                { id: 'hair', name: 'Capelli', emoji: '🦱' },
                { id: 'shirt', name: 'Veste', emoji: '👕' },
                { id: 'pants', name: 'Calzoni', emoji: '👖' },
                { id: 'hat', name: 'Copricapo', emoji: '👑' },
                { id: 'backpack', name: 'Zaini', emoji: '🚀' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { sound.playClick(); setShopCategory(cat.id as any); }}
                  className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    shopCategory === cat.id
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                  id={`shop-category-${cat.id}`}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-[10px] mt-0.5">{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Shop Items List */}
            <div className="flex-1 overflow-y-auto max-h-[250px] p-1 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
              {SHOP_ITEMS.filter(item => item.category === shopCategory).map(item => {
                const isBought = profile.unlockedAccessories.includes(item.id);
                const canAfford = totalCoins >= item.cost;

                return (
                  <div 
                    key={item.id} 
                    className={`border rounded-2xl p-3 flex items-center justify-between transition-all ${
                      isBought 
                        ? 'border-indigo-100 bg-indigo-50/20' 
                        : 'border-slate-200 bg-white hover:shadow-md'
                    }`}
                    id={`shop-item-${item.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shadow-inner border border-white">
                        {item.previewEmoji}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">{item.name}</h5>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-[11px] font-bold font-mono text-amber-600">{item.cost} monete</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isBought ? (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Sbloccato
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyItem(item)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm cursor-pointer transition-colors ${
                            canAfford 
                              ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          id={`buy-btn-${item.id}`}
                        >
                          Compra
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <CurrencyInfoModal
        type={currencyModalType}
        isOpen={!!currencyModalType}
        onClose={() => setCurrencyModalType(null)}
        lightDrops={totalDrops}
        coins={totalCoins}
      />
    </div>
  );
}
