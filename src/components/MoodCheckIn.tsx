import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Smile, Heart, Coffee, Shield, Zap, Sparkles, BrainCircuit, Hourglass } from 'lucide-react';

interface MoodCheckInProps {
  onCheckIn: (mood: string, energyLevel: 'Low' | 'Medium' | 'High', timeBudget: number, note: string) => void;
  isRecommendLoading: boolean;
}

const MOODS = [
  { name: 'Happy', icon: Smile, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', desc: 'Upbeat, lighthearted' },
  { name: 'Romantic', icon: Heart, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', desc: 'Heartfelt, emotional' },
  { name: 'Chill', icon: Coffee, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', desc: 'Relaxed, calm content' },
  { name: 'Thrilled', icon: Zap, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', desc: 'Action, suspense' },
  { name: 'Comfy', icon: Shield, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', desc: 'Cozy, nostalgic comfort' },
  { name: 'Mindblown', icon: BrainCircuit, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', desc: 'Mind-bending puzzle' },
  { name: 'Stressed', icon: Sparkles, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', desc: 'Stress-busting humor' }
];

export default function MoodCheckIn({ onCheckIn, isRecommendLoading }: MoodCheckInProps) {
  const [selectedMood, setSelectedMood] = useState<string>('Chill');
  const [energyLevel, setEnergyLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [timeBudget, setTimeBudget] = useState<number>(120);
  const [note, setNote] = useState<string>('');

  const getTimeGuidance = (mins: number) => {
    if (mins <= 45) return '⏰ Perfect for short series episodes, nature shorts, or starting a film in parts!';
    if (mins <= 90) return '🍿 Fits a standard short feature film or documentary easily.';
    if (mins <= 130) return '🎬 Standard movie lengths. Plenty of time for full films.';
    return '👑 Cinematic epic! Perfect for long stories or immersive Bollywood hits.';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckIn(selectedMood, energyLevel, timeBudget, note);
  };

  return (
    <div className="bg-[#161618] border border-white/10 rounded-2xl p-6 sm:p-8" id="mood-checkin-wrapper">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5" id="mood-heading">
            <Hourglass className="w-5 h-5 text-red-500" />
            What is your current vibe?
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Setting your immediate mood and time budget informs CineSync to select content suited for this exact session.
          </p>
        </div>
        <div className="hidden md:block">
          <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-900/40 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Netflix India Companion
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="mood-form">
        {/* Mood Selection */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">
            1. Active Feeling / State
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 select-none">
            {MOODS.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMood === m.name;
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setSelectedMood(m.name)}
                  className={`py-3 px-4 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all text-xs cursor-pointer ${
                    isSelected
                      ? `bg-red-600/10 border-red-500 ${m.color.split(' ')[0]} scale-[1.02]`
                      : 'bg-[#0A0A0B] border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                  id={`mood-option-${m.name.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-xs text-white">{m.name}</span>
                  <span className="text-[9px] opacity-65 leading-none">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Sliders and Energy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Budget Selector */}
          <div className="bg-[#0A0A0B] border border-white/10 p-5 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                2. How much watch time do you have?
              </label>
              <span className="text-sm text-red-500 font-extrabold" id="budget-display">
                {timeBudget} Mins
              </span>
            </div>

            <input
              type="range"
              min="30"
              max="180"
              step="15"
              value={timeBudget}
              onChange={(e) => setTimeBudget(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600 mb-3 focus:outline-none"
              id="time-range-slider"
            />

            <div className="flex justify-between text-[9px] text-slate-500 mb-4 font-mono select-none">
              <span>30m (Fragment)</span>
              <span>100m (Standard Movie)</span>
              <span>180m+ (Long Narrative)</span>
            </div>

            <div className="text-[11px] text-slate-300 leading-relaxed font-medium bg-red-950/20 text-red-400 border border-red-900/30 p-2.5 rounded-lg">
              {getTimeGuidance(timeBudget)}
            </div>
          </div>

          {/* Energy level & Notes */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                3. Energy Level
              </label>
              <div className="flex gap-2">
                {(['Low', 'Medium', 'High'] as const).map((energy) => {
                  const isSelected = energyLevel === energy;
                  return (
                    <button
                      key={energy}
                      type="button"
                      onClick={() => setEnergyLevel(energy)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-red-600 border-transparent text-white font-bold'
                          : 'bg-[#0A0A0B] border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                      }`}
                      id={`energy-opt-${energy.toLowerCase()}`}
                    >
                      {energy} Energy
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2" htmlFor="mood-notes">
                4. Focus or search hints (Optional)
              </label>
              <input
                type="text"
                id="mood-notes"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. detective, mystery, family comedy"
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-lg py-2.5 px-3.5 text-slate-200 text-xs focus:border-red-500 focus:outline-none placeholder:text-slate-650"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isRecommendLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer text-xs uppercase tracking-wider disabled:opacity-50"
            id="btn-mood-submit"
          >
            {isRecommendLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Invoking Active Recommendation Net...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Find Perfect Match Suggestions</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
