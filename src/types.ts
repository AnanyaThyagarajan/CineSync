export interface Preferences {
  preferredLanguages: string[]; // e.g. "English", "Hindi"
  favoriteGenres: string[];
  preferredLength: string; // e.g. "Full Movie (90-150 mins)", "Series Episode (30-60 mins)", "Mini Series / Short (<30 mins)", "Watch in Parts"
}

export interface WatchHistoryItem {
  id: string;
  movieId: string;
  title: string;
  year?: string | number;
  watchedOn: string; // ISO date string
  status: 'Completed' | 'In Progress';
  progressMinutes: number;
  totalMinutes: number;
  rating?: number; // 1-5 rating
  review?: string;
  genre?: string[];
  backdrop?: string;
}

export interface MoodLog {
  id: string;
  timestamp: string;
  mood: string; // "Happy" | "Romantic" | "Chill" | "Thrilled" | "Comfy" | "Mindblown" | "Stressed" | "Melancholic"
  energyLevel: 'Low' | 'Medium' | 'High';
  timeBudget: number; // in minutes
  additionalNotes?: string;
}

export interface User {
  username: string;
  email: string;
  preferences: Preferences;
  watchHistory: WatchHistoryItem[];
  moodHistory: MoodLog[];
}

export interface MovieRecommendation {
  id: string;
  title: string;
  year: string | number;
  genre: string[];
  languages: string[];
  duration: string;
  description: string;
  relevanceScore: number; // 0-100 multiplier
  matchReason: string; // Why it matches current mood and history
  netflixUrl: string;
  backdrop?: string;
  stars?: string[];
  isOriginal?: boolean;
}

export interface CollaborativeStat {
  cohortName: string;
  sampleUser: string;
  currentMoodMatch: string;
  popularTitle: string;
  confidenceScore: number;
}
