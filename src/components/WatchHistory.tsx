import { Star, Clock, Trash2, Library, BarChart, Eye } from 'lucide-react';
import { WatchHistoryItem } from '../types';

interface WatchHistoryProps {
  history: WatchHistoryItem[];
  onClearHistory: () => void;
}

export default function WatchHistory({ history, onClearHistory }: WatchHistoryProps) {
  // Aggregate stats
  const totalWatchMinutes = history.reduce((acc, h) => acc + (h.progressMinutes || 120), 0);
  const totalEpisodes = history.length;
  const averageRating =
    history.length > 0
      ? (history.reduce((acc, h) => acc + (h.rating || 5), 0) / history.length).toFixed(1)
      : '0.0';

  // extract top genre
  const genreCount: Record<string, number> = {};
  history.forEach((h) => {
    if (h.genre) {
      h.genre.forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    }
  });
  const sortedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
  const favoriteGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : 'None logged';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="watch-history-sec">
      {/* Metrics Card */}
      <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 lg:col-span-1" id="metrics-card">
        <h4 className="text-base font-semibold text-white flex items-center gap-2 mb-2 pb-3 border-b border-white/5">
          <BarChart className="w-5 h-5 text-red-500" />
          Lifetime Watch Analytics
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0A0A0B] p-3.5 rounded-xl border border-white/10 text-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Time</span>
            <div className="flex items-center justify-center gap-1 mt-1 text-white">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-base font-black">{(totalWatchMinutes / 60).toFixed(1)} hrs</span>
            </div>
          </div>

          <div className="bg-[#0A0A0B] p-3.5 rounded-xl border border-white/10 text-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Logged Titles</span>
            <div className="flex items-center justify-center gap-1 mt-1 text-white">
              <Eye className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-base font-black">{totalEpisodes} titles</span>
            </div>
          </div>

          <div className="bg-[#0A0A0B] p-3.5 rounded-xl border border-white/10 text-center">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Average Rating</span>
            <div className="flex items-center justify-center gap-1 mt-1 text-white">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-base font-black">{averageRating} / 5</span>
            </div>
          </div>

          <div className="bg-[#0A0A0B] p-3.5 rounded-xl border border-white/10 text-center col-span-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Favorite Genre Cluster</span>
            <div className="mt-1 text-white text-xs font-bold font-mono">
              🍿 <span className="text-red-400 font-extrabold">{favoriteGenre}</span>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-dashed border-red-900/40 hover:border-red-600 bg-red-950/10 hover:bg-red-950/20 text-red-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            id="clear-hist-btn"
          >
            <Trash2 className="w-3.5 h-3.5 cursor-pointer" />
            <span>Reset User History Archive</span>
          </button>
        )}
      </div>

      {/* Logged lists */}
      <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 sm:p-6 lg:col-span-2 space-y-4" id="log-list-card">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h4 className="text-base font-semibold text-white flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-400" />
            Chronological Watch Logs
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">Real-time DB synced</span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center" id="empty-history">
            <div className="text-slate-600 text-3xl mb-2">🎞️</div>
            <p className="text-slate-400 text-sm font-semibold">No session logs recorded yet.</p>
            <p className="text-slate-500 text-xs mt-1">Mark suggest entries "Watched Already" to view details here.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2" id="history-scroller">
            {history.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-[#0A0A0B] border border-white/10 hover:border-white/15 rounded-xl p-3.5 transition-all text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                id={`hist-row-${item.id}`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white text-sm leading-tight">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">({item.year})</span>
                    {item.genre && item.genre.slice(0, 2).map((g) => (
                      <span key={g} className="text-[9px] px-1.5 py-0.2 bg-[#161618] border border-white/5 rounded text-slate-400">
                        {g}
                      </span>
                    ))}
                  </div>
                  {item.review && (
                    <p className="text-slate-400 mt-1 italic pr-3 leading-normal">
                      &quot;{item.review}&quot;
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                    Watched on: {new Date(item.watchedOn).toLocaleString()} • length: {item.progressMinutes} mins
                  </p>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end justify-between shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                  <div className="flex gap-0.5 text-yellow-500 mb-1">
                    {Array.from({ length: item.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current text-yellow-500" />
                    ))}
                  </div>
                  <span className="text-[10px] bg-red-950/20 text-red-500 font-bold border border-red-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider scale-90">
                    Complete
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
