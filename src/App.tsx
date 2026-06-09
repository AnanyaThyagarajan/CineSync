import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, User as UserIcon, LogOut, Settings, PlusCircle, Check, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { User, Preferences, MovieRecommendation, CollaborativeStat, WatchHistoryItem } from './types';
import Onboarding from './components/Onboarding';
import MoodCheckIn from './components/MoodCheckIn';
import RecommendationList from './components/RecommendationList';
import WatchHistory from './components/WatchHistory';
import CollaborativeInsights from './components/CollaborativeInsights';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [collaborativeStats, setCollaborativeStats] = useState<CollaborativeStat[]>([]);
  const [engineUsed, setEngineUsed] = useState<string>('Local Companion Seed');
  
  // Interface loadings
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecommendLoading, setIsRecommendLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Settings pane expand
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Load from localStorage local caching to prevent loss of state on quick refreshes
  useEffect(() => {
    const cachedUser = localStorage.getItem('cinematch_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        fetchUserDetails(parsed.email);
      } catch (err) {
        console.error("Cached session corrupt:", err);
      }
    }
  }, []);

  const fetchUserDetails = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('cinematch_user', JSON.stringify(data.user));
        // Get initial suggestions immediately based on general preferences
        getInitialRecommendations(data.user);
      }
    } catch (e) {
      console.error("User fetch failed: ", e);
      setErrorMessage("Network issue syncing with CineMatch cluster.");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitialRecommendations = async (currentUser: User) => {
    setIsRecommendLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          currentMood: currentUser.moodHistory[0]?.mood || 'Chill',
          energyLevel: currentUser.moodHistory[0]?.energyLevel || 'Medium',
          timeBudget: currentUser.moodHistory[0]?.timeBudget || 120
        })
      });
      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setCollaborativeStats(data.collaborativeStats || []);
      setEngineUsed(data.engine || 'Fallback Companion');
      setApiWarning(data.warning || null);
    } catch (err) {
      console.error("Initial rec fetch failed:", err);
    } finally {
      setIsRecommendLoading(false);
    }
  };

  const handleOnboardComplete = (onboardedUser: User) => {
    setUser(onboardedUser);
    localStorage.setItem('cinematch_user', JSON.stringify(onboardedUser));
    getInitialRecommendations(onboardedUser);
  };

  const handleLogout = () => {
    setUser(null);
    setRecommendations([]);
    setCollaborativeStats([]);
    localStorage.removeItem('cinematch_user');
    setShowSettings(false);
  };

  // Perform a direct mood run check-in recommendations calculation
  const handleMoodCheckIn = async (mood: string, energyLevel: 'Low' | 'Medium' | 'High', timeBudget: number, note: string) => {
    if (!user) return;
    setIsRecommendLoading(true);
    setErrorMessage(null);

    try {
      // 1. Log mood check-in to server
      const responseMood = await fetch(`/api/user/${encodeURIComponent(user.email)}/moodLog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, energyLevel, timeBudget, additionalNotes: note })
      });
      const dataMood = await responseMood.json();

      // 2. Fetch fresh matches
      const responseRecs = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          currentMood: mood,
          energyLevel,
          timeBudget,
          additionalNotes: note
        })
      });
      const dataRecs = await responseRecs.json();

      if (dataMood.success) {
        // Sync user state
        const updatedUser: User = {
          ...user,
          moodHistory: dataMood.moodHistory
        };
        setUser(updatedUser);
        localStorage.setItem('cinematch_user', JSON.stringify(updatedUser));
      }

      setRecommendations(dataRecs.recommendations || []);
      setCollaborativeStats(dataRecs.collaborativeStats || []);
      setEngineUsed(dataRecs.engine || 'Fallback Companion');
      setApiWarning(dataRecs.warning || null);

    } catch (err) {
      console.error("Mood recomendation fetch failed: ", err);
      setErrorMessage("Could not calculate matches. Fetching offline rules instead.");
    } finally {
      setIsRecommendLoading(false);
    }
  };

  // Callback to log watch item
  const handleMarkWatched = async (movie: MovieRecommendation, rating: number, review: string) => {
    if (!user) return;
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/user/${encodeURIComponent(user.email)}/watchHistory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
          title: movie.title,
          year: movie.year,
          status: 'Completed',
          progressMinutes: parseInt(movie.duration) || 120,
          totalMinutes: parseInt(movie.duration) || 120,
          rating,
          review,
          genre: movie.genre
        })
      });
      const data = await response.json();

      if (data.success) {
        const updatedUser: User = {
          ...user,
          watchHistory: data.watchHistory
        };
        setUser(updatedUser);
        localStorage.setItem('cinematch_user', JSON.stringify(updatedUser));
        
        // Remove from current suggestions list to make space for remaining recommendations
        setRecommendations((prev) => prev.filter((r) => r.title.toLowerCase() !== movie.title.toLowerCase()));
      }
    } catch (err) {
      console.error("Failed to log watch item: ", err);
      setErrorMessage("Failed to sync watch history with CineMatch cluster.");
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/user/${encodeURIComponent(user.email)}/reset`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('cinematch_user', JSON.stringify(data.user));
        setRecommendations([]);
      }
    } catch (err) {
      console.error("failed clearing logs: ", err);
    }
  };

  // Preference Settings Editor Action
  const handleUpdatePreferences = async (updatedPref: Preferences) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/user/${encodeURIComponent(user.email)}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPref)
      });
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('cinematch_user', JSON.stringify(data.user));
        setShowSettings(false);
        // Refresh recommendations
        getInitialRecommendations(data.user);
      }
    } catch (err) {
      console.error("Preferences change failed:", err);
    }
  };

  // Form states for inline editing
  const [prefLangs, setPrefLangs] = useState<string[]>(['English', 'Hindi']);
  const [prefGenres, setPrefGenres] = useState<string[]>([]);
  const [prefLength, setPrefLength] = useState<string>('');

  const openSettings = () => {
    if (!user) return;
    setPrefLangs(user.preferences.preferredLanguages || ['English', 'Hindi']);
    setPrefGenres(user.preferences.favoriteGenres || []);
    setPrefLength(user.preferences.preferredLength || '');
    setShowSettings(true);
  };

  const toggleGenre = (genre: string) => {
    if (prefGenres.includes(genre)) {
      setPrefGenres(prefGenres.filter((g) => g !== genre));
    } else {
      setPrefGenres([...prefGenres, genre]);
    }
  };

  const toggleLang = (lang: string) => {
    if (prefLangs.includes(lang)) {
      if (prefLangs.length === 1) return;
      setPrefLangs(prefLangs.filter((l) => l !== lang));
    } else {
      setPrefLangs([...prefLangs, lang]);
    }
  };

  const saveSettingsInline = () => {
    handleUpdatePreferences({
      preferredLanguages: prefLangs,
      favoriteGenres: prefGenres,
      preferredLength: prefLength
    });
  };

  if (!user) {
    return (
      <div className="bg-[#0A0A0B] min-h-screen text-slate-200 flex flex-col items-center justify-center font-sans py-12 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-rose-950/10 rounded-full blur-[100px] pointer-events-none" />
        <Onboarding onOnboardComplete={handleOnboardComplete} isLoading={isLoading} />
        
        {/* Subtle Watermark */}
        <div className="absolute bottom-6 text-[11px] text-slate-500 font-medium tracking-wide z-20">
          Created by <span className="text-slate-350 font-semibold text-red-500/90">Ananya Krithika Thyagarajan</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0B] min-h-screen text-slate-200 font-sans flex flex-col justify-between">
      <div>
        {/* Header Navigation with backdrop blur */}
        <header className="bg-[#0A0A0B]/85 border-b border-white/10 sticky top-0 z-40 px-4 py-3 sm:px-8 backdrop-blur-md transition-all" id="app-header">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-600/20">C</div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5" id="header-logo">
                CineSync <span className="text-xs text-red-500 font-bold uppercase tracking-wider">India</span>
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              {/* Account Card info */}
              <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/15 px-4 py-1.5 rounded-full text-xs">
                <div className="text-right">
                  <p className="font-semibold text-slate-200 text-xs leading-tight">{user.username}</p>
                  <p className="text-[10px] text-slate-500 font-mono leading-none">{user.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 border border-white/20 flex items-center justify-center font-black text-white text-xs shrink-0 select-none">
                  {(user.username || 'U').charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Preferences Button */}
              <button
                onClick={openSettings}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
                title="Edit Theatre Settings"
                id="header-settings-btn"
              >
                <Settings className="w-4 h-4 cursor-pointer" />
              </button>

              {/* Log out */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-950/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg border border-red-900/40 hover:border-transparent transition-all text-xs font-bold cursor-pointer"
                id="header-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5 cursor-pointer" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 space-y-10" id="app-main">
          {/* Error Handler block */}
          {errorMessage && (
            <div className="bg-red-950/40 border border-red-900/55 p-4 rounded-xl flex items-center gap-2.5 text-xs text-red-400" id="error-banner">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          {/* API Warning block (e.g. Quota/Rate Limit limits) */}
          {apiWarning && (
            <div className="bg-amber-950/30 border border-amber-900/40 p-4 rounded-xl flex items-start gap-2.5 text-xs text-amber-400" id="api-warning-banner">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-350">CineSync Engine Notice</p>
                <p className="mt-0.5 text-slate-300 leading-relaxed font-semibold">{apiWarning}</p>
              </div>
            </div>
          )}

          {/* Core Row: Mood Check-In */}
          <section id="moodcheck-section">
            <MoodCheckIn onCheckIn={handleMoodCheckIn} isRecommendLoading={isRecommendLoading} />
          </section>

          {/* Recommendations shelves list */}
          <section id="recs-shelves-section">
            <RecommendationList
              recommendations={recommendations}
              onMarkWatched={handleMarkWatched}
              onRefresh={() => getInitialRecommendations(user)}
              isLoading={isRecommendLoading}
              engineUsed={engineUsed}
            />
          </section>

          {/* Collaborative clustering stats insight */}
          <section id="collaborative-insights-section">
            <CollaborativeInsights stats={collaborativeStats} />
          </section>

          {/* Watch History Log Section */}
          <section id="watch-history-section">
            <WatchHistory history={user.watchHistory || []} onClearHistory={handleClearHistory} />
          </section>
        </main>
      </div>

      {/* Footer copyright styled like the sleek system status footer */}
      <footer className="border-t border-white/5 bg-[#080809] py-5 px-8 mt-12 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3" id="app-footer">
        <div className="flex gap-4">
          <span>ML Engine: Stable v4.2</span>
          <span>Collaborative Filtering: Active</span>
        </div>
        <div className="text-center">
          <p className="max-w-md text-[10px] text-slate-500 leading-normal">
            CineSync India is built as an independent companion. Netflix trademarks remain property of Netflix, Inc.
          </p>
          <p className="mt-1 text-[10px] text-slate-400 font-medium">
            Created by <span className="text-slate-200 font-semibold text-red-500/90">Ananya Krithika Thyagarajan</span>
          </p>
        </div>
        <div className="flex gap-4 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Connected to Netflix API
          </span>
          <span>Credits: Daily Active</span>
        </div>
      </footer>

      {/* Inline Settings Dialog Modal popup */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161618] border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative"
              id="settings-overlay-dialog"
            >
              <h3 className="text-xl font-semibold text-white tracking-tight mb-1">
                Edit Playback Preferences
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-medium">
                Adjust languages and genres to recalibrate your CineSync India collaborative matches.
              </p>

              <div className="space-y-5">
                {/* Languages */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                    Audio Languages
                  </label>
                  <div className="flex gap-3">
                    {['English', 'Hindi'].map((lang) => {
                      const isSelected = prefLangs.includes(lang);
                      return (
                        <button
                          key={lang}
                          onClick={() => toggleLang(lang)}
                          className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-600 border-transparent text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                          }`}
                          id={`pref-lang-${lang.toLowerCase()}`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                    Genre Filters
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1 select-none">
                    {[
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
                    ].map((g) => {
                      const isSelected = prefGenres.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => toggleGenre(g)}
                          className={`text-[10px] px-2.5 py-1.5 rounded-full border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-red-600 border-transparent text-white font-bold'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                          id={`pref-genre-${g.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Favorite Style */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                    Standard Watch Style
                  </label>
                  <select
                    value={prefLength}
                    onChange={(e) => setPrefLength(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:border-red-500 focus:outline-none"
                    id="pref-length-select"
                  >
                    <option value="Mini Series / Short (<30 mins)">Mini Series / Short (&lt;30 mins)</option>
                    <option value="Series Episode (30-60 mins)">Series Episode (30-60 mins)</option>
                    <option value="Full Movie (90-150 mins)">Full Movie (90-150 mins)</option>
                    <option value="Long Epic (150+ mins)">Long Epic (150+ mins)</option>
                    <option value="Watch in Parts (Flexible)">Watch in Parts (Flexible)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/5 mt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    onClick={saveSettingsInline}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                    id="pref-save-btn"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
