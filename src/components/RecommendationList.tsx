import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, Star, RefreshCw, Sparkles, X, Info } from 'lucide-react';
import { MovieRecommendation } from '../types';

interface RecommendationListProps {
  recommendations: MovieRecommendation[];
  onMarkWatched: (movie: MovieRecommendation, rating: number, review: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  engineUsed: string;
}

export default function RecommendationList({
  recommendations,
  onMarkWatched,
  onRefresh,
  isLoading,
  engineUsed
}: RecommendationListProps) {
  const [watchedDialogItem, setWatchedDialogItem] = useState<MovieRecommendation | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [review, setReview] = useState<string>('');

  const handleMarkWatchedSubmit = () => {
    if (!watchedDialogItem) return;
    onMarkWatched(watchedDialogItem, rating, review);
    // Reset state
    setWatchedDialogItem(null);
    setRating(5);
    setReview('');
  };

  return (
    <div className="space-y-5" id="recommendation-sec">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2" id="recs-title">
            <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
            Your Tailored Match Suggestions
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Smart matching engine: <span className="text-red-500 font-bold">{engineUsed}</span>
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 self-start sm:self-center px-4 py-2 bg-white/5 hover:bg-white/10 text-xs text-slate-200 font-bold border border-white/10 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
          id="btn-recs-refresh"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync & Match Again</span>
        </motion.button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#161618] border border-white/5 rounded-2xl p-6 h-[200px] animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-6 bg-white/5 rounded-full w-20" />
              </div>
              <div className="h-3 bg-white/5 rounded w-5/6" />
              <div className="h-3 bg-white/5 rounded w-4/6" />
              <div className="h-10 bg-white/5 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-[#161618] border border-white/10 rounded-2xl p-10 text-center" id="empty-recs">
          <Info className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 text-sm font-semibold">No suggestions available yet.</p>
          <p className="text-slate-500 text-xs mt-1">Submit your current mood check-in above to fetch personalized matches!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" id="recommendations-container">
          {recommendations.map((rec, index) => {
            const matchColor = rec.relevanceScore >= 90 ? 'text-emerald-400 bg-emerald-950/20 border-emerald-920' : 'text-amber-400 bg-amber-950/20 border-amber-920';

            return (
              <motion.div
                key={rec.id || `rec-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="bg-[#161618] hover:bg-[#1E1E21] border border-white/10 hover:border-white/20 rounded-2xl p-5 sm:p-6 transition-all flex flex-col justify-between group h-full relative"
                id={`rec-item-${rec.id}`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="space-y-1">
                      {rec.isOriginal && (
                        <span className="text-[9px] uppercase font-bold text-red-500 tracking-wider block font-sans">
                          Netflix Original
                        </span>
                      )}
                      <h4 className="text-base font-semibold text-white group-hover:text-red-500 transition-colors leading-snug">
                        {rec.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {rec.year} • {rec.duration}
                      </p>
                    </div>

                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold shrink-0 ${matchColor}`} id={`match-val-${rec.id}`}>
                      {rec.relevanceScore}% Similarity
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3.5 select-none">
                    {rec.languages.map((l) => (
                      <span key={l} className="text-[9px] px-2 py-0.5 rounded bg-[#0A0A0B] text-slate-400 font-bold border border-white/5">
                        {l}
                      </span>
                    ))}
                    {rec.genre.map((g) => (
                      <span key={g} className="text-[9px] px-2 py-0.5 rounded bg-red-950/20 text-red-400 font-medium border border-red-900/30">
                        {g}
                      </span>
                    ))}
                  </div>

                  <p className="text-slate-400 text-xs sm:text-sm line-clamp-3 mb-4 leading-relaxed">
                    {rec.description}
                  </p>

                  {/* AI Companion Match Reason Advice */}
                  <div className="bg-[#0A0A0B] border border-white/10 p-3 rounded-lg mb-5 text-[11px] sm:text-xs">
                    <span className="text-red-500 font-bold block mb-1">CineSync Recommendation Advice:</span>
                    <p className="text-slate-300 italic font-medium leading-normal">{rec.matchReason}</p>
                  </div>
                </div>

                <div className="flex gap-2" id={`actions-${rec.id}`}>
                  {/* Direct Netflix Play Query */}
                  <a
                    href={rec.netflixUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white hover:bg-slate-200 text-[#0A0A0B] font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    id={`play-net-${rec.id}`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>View on Netflix</span>
                  </a>

                  {/* Mark Watched Trigger */}
                  <button
                    onClick={() => setWatchedDialogItem(rec)}
                    className="px-3.5 py-2.5 border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer grow-0 shrink-0"
                    id={`watch-add-${rec.id}`}
                    title="Mark Movie Watched"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Watched Already</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Watched dialog Modal Popup */}
      <AnimatePresence>
        {watchedDialogItem && (
          <div className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161618] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl"
              id="watch-review-dialog"
            >
              <button
                onClick={() => setWatchedDialogItem(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-lg font-semibold text-white tracking-tight mb-2" id="dial-title">
                Mark as Watched
              </h4>
              <p className="text-xs text-slate-400 mb-5">
                Log <span className="text-red-500 font-bold">{watchedDialogItem.title}</span> to your permanent account watch history to improve future collaborative matches.
              </p>

              <div className="space-y-4">
                {/* Interactive Star Rating */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                    Rate Your Experience
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-slate-600 hover:text-yellow-400 transition-colors cursor-pointer"
                        id={`star-btn-${star}`}
                      >
                        <Star className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-500' : 'text-slate-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Micro written review */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2" htmlFor="dial-review">
                    Leave a quick review (Optional)
                  </label>
                  <textarea
                    id="dial-review"
                    rows={3}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="e.g. Loved the suspense and unexpected climax!"
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-lg py-2.5 px-3 text-slate-200 text-xs focus:border-red-500 focus:outline-none placeholder:text-slate-600 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setWatchedDialogItem(null)}
                    className="px-4 py-2 border border-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkWatchedSubmit}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                    id="dial-btn-save"
                  >
                    Confirm & Save Watch
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
