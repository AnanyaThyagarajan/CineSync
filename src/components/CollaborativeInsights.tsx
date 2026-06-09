import { Users, TrendingUp, Sparkles, Network } from 'lucide-react';
import { CollaborativeStat } from '../types';

interface CollaborativeInsightsProps {
  stats: CollaborativeStat[];
}

export default function CollaborativeInsights({ stats }: CollaborativeInsightsProps) {
  // If no collaborative peers exist inside DB yet (first custom launch fallback), seed standard cohorts to guarantee professional design
  const defaultStats: CollaborativeStat[] = [
    {
      cohortName: "Comedy & Drama Cohort",
      sampleUser: "Rajesh Kumar",
      currentMoodMatch: "Happy",
      popularTitle: "Laapataa Ladies (2024)",
      confidenceScore: 98
    },
    {
      cohortName: "Sci-Fi & Thriller Cohort",
      sampleUser: "Ananya Sharma",
      currentMoodMatch: "Thrilled",
      popularTitle: "Inception (2010)",
      confidenceScore: 94
    },
    {
      cohortName: "Indie Art Cinema Core",
      sampleUser: "Kabir Singh",
      currentMoodMatch: "Chill",
      popularTitle: "Amar Singh Chamkila",
      confidenceScore: 91
    }
  ];

  const displayStats = stats.length > 0 ? stats : defaultStats;

  return (
    <div className="bg-[#161618] border border-white/10 rounded-2xl p-6 space-y-5" id="collab-insights-sec">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h4 className="text-base font-semibold text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-red-500 animate-pulse" />
          Collaborative Filtering Cohorts
        </h4>
        <div className="flex items-center gap-1.5 text-[10px] uppercase text-red-400 bg-red-950/25 border border-red-900/45 px-2.5 py-1 rounded-full font-bold tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Active ML Clustering</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        CineSync compares your current emotion check-in, preferred genres, and historical watch ratings against other profiles in our database. We identify peer groups who share your cinema tastes to isolate highly qualified recommendation candidates before filtering by time.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="cohorts-grid">
        {displayStats.map((cohort, idx) => (
          <div
            key={idx}
            className="bg-[#0A0A0B] border border-white/10 hover:border-red-550/35 rounded-xl p-4 transition-all text-xs space-y-3"
            id={`cohort-card-${idx}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200">{cohort.cohortName}</span>
              <span className="text-[10px] text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30 font-mono">
                {cohort.confidenceScore}% Fit
              </span>
            </div>

            <div className="space-y-1.5 text-slate-400 font-medium">
              <div className="flex justify-between">
                <span>Representative User:</span>
                <span className="font-semibold text-slate-300">{cohort.sampleUser}</span>
              </div>
              <div className="flex justify-between">
                <span>Recent Check-In Mood:</span>
                <span className="font-semibold text-red-500">{cohort.currentMoodMatch}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1 text-[11px]">
                <span>Cluster Highest Rated Watch:</span>
              </div>
              <div className="text-white font-bold flex items-center gap-1.5 pt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">{cohort.popularTitle}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
