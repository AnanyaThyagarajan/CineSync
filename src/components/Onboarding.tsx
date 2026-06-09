import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Film, LogIn, ChevronRight, Check } from 'lucide-react';
import { User, Preferences } from '../types';

interface OnboardingProps {
  onOnboardComplete: (user: User) => void;
  isLoading: boolean;
}

export default function Onboarding({ onOnboardComplete, isLoading }: OnboardingProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'login' | 'preferences'>('login');
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  // Preference fields
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['English', 'Hindi']);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Comedy', 'Thriller', 'Drama']);
  const [selectedLength, setSelectedLength] = useState<string>('Full Movie (90-150 mins)');

  const genresOptions = [
    'Comedy',
    'Thriller',
    'Drama',
    'Sci-Fi',
    'Mystery',
    'Action',
    'Crime',
    'Social Change',
    'Biopic',
    'Music',
    'Nature / Documentary'
  ];

  const lengthOptions = [
    'Mini Series / Short (<30 mins)',
    'Series Episode (30-60 mins)',
    'Full Movie (90-150 mins)',
    'Long Epic (150+ mins)',
    'Watch in Parts (Flexible)'
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username })
      });
      const data = await response.json();
      
      if (data.user) {
        setCreatedUser(data.user);
        if (data.isNew) {
          // If a new user register, display preferences setup step
          setStep('preferences');
          // Prefill
          setSelectedLangs(data.user.preferences.preferredLanguages || ['English', 'Hindi']);
          setSelectedGenres(data.user.preferences.favoriteGenres || ['Comedy', 'Thriller', 'Drama']);
          setSelectedLength(data.user.preferences.preferredLength || 'Full Movie (90-150 mins)');
        } else {
          // Returning user goes straight to dashboard
          onOnboardComplete(data.user);
        }
      }
    } catch (err) {
      console.error("Login setup failed:", err);
    }
  };

  const handlePreferencesSubmit = async () => {
    if (!createdUser) return;

    const updatedPref: Preferences = {
      preferredLanguages: selectedLangs,
      favoriteGenres: selectedGenres,
      preferredLength: selectedLength
    };

    try {
      const response = await fetch(`/api/user/${encodeURIComponent(createdUser.email)}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPref)
      });
      const data = await response.json();
      if (data.user) {
        onOnboardComplete(data.user);
      }
    } catch (err) {
      console.error("Preferences save failed:", err);
    }
  };

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const toggleLang = (lang: string) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length === 1) return; // Need at least one language
      setSelectedLangs(selectedLangs.filter((l) => l !== lang));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 select-none relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg bg-[#161618] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        id="onboarding-card"
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-800" />

        {step === 'login' ? (
          <div>
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-600/20">C</div>
              <h1 className="text-2xl font-bold text-white tracking-tight" id="onboarding-title">
                CineSync <span className="text-red-500 font-bold text-sm ml-1 uppercase tracking-widest px-1.5 py-0.5 bg-red-950/40 border border-red-905 rounded-md">India</span>
              </h1>
            </div>

            <p className="text-center text-slate-400 mb-8 text-sm sm:text-base leading-relaxed">
              Discover customized content matching your immediate mood, language settings, and active session time-budget.
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-5" id="login-form">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2" htmlFor="login-email">
                  Email Address
                </label>
                <input
                  type="email"
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white text-sm focus:border-red-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2" htmlFor="login-username">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white text-sm focus:border-red-500 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm font-medium mt-4 disabled:opacity-50 shadow-md shadow-red-605/10"
                id="btn-login"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter CineSync Hub</span>
                    <LogIn className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2 text-center" id="pref-onboarding-title">
              Customize Your Theater
            </h2>
            <p className="text-center text-slate-400 mb-6 text-xs sm:text-sm">
              Hey {createdUser?.username || 'Cinephile'}! Set your core playback preferences to connect with Mumbai viewers.
            </p>

            <div className="space-y-6">
              {/* Languages */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                  1. Audio Languages (Select at least one)
                </label>
                <div className="flex gap-4">
                  {['English', 'Hindi'].map((lang) => {
                    const isSelected = selectedLangs.includes(lang);
                    return (
                      <motion.button
                        key={lang}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleLang(lang)}
                        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-between text-sm font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600/10 border-red-500 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                        id={`onboard-lang-${lang.toLowerCase()}`}
                      >
                        <span>{lang}</span>
                        {isSelected && <Check className="w-4 h-4 text-red-500" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Genres */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                  2. Choose Genre Interests
                </label>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1 select-none">
                  {genresOptions.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`text-xs px-3 py-2 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 border-transparent text-white font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                        id={`onboard-genre-${genre.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Watch Style Choice */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                  3. Favorite Movie Watch Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {lengthOptions.map((opt) => {
                    const isSelected = selectedLength === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setSelectedLength(opt)}
                        className={`text-left text-xs py-2 px-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/5 border-red-500 text-white font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                        id={`onboard-opt-${opt.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handlePreferencesSubmit}
                disabled={isLoading || selectedLangs.length === 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm font-medium mt-4 disabled:opacity-50"
                id="btn-onboard-submit"
              >
                <span>Save and Build Dashboard</span>
                <ChevronRight className="w-4 h-4 cursor-pointer" />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
