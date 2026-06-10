import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { NETFLIX_INDIA_SEED_CATALOG } from "./src/netflixIndiaCatalog";
import { User, Preferences, WatchHistoryItem, MoodLog, MovieRecommendation, CollaborativeStat } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to file-based JSON DB
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Establish baseline directory and db file
function initDb() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialData = {
        users: {
          "demo@netflixindiancompanion.in": {
            username: "Rajesh Kumar",
            email: "demo@netflixindiancompanion.in",
            preferences: {
              preferredLanguages: ["Hindi", "English"],
              favoriteGenres: ["Drama", "Thriller", "Comedy"],
              preferredLength: "Full Movie (90-150 mins)"
            },
            watchHistory: [
              {
                id: "hist-1",
                movieId: "seed-1",
                title: "Laapataa Ladies",
                year: "2024",
                watchedOn: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
                status: "Completed",
                progressMinutes: 122,
                totalMinutes: 122,
                rating: 5,
                review: "Brilliant storytelling. Heartwarming, simple, yet so deep!",
                genre: ["Comedy", "Drama", "Social Change"]
              },
              {
                id: "hist-2",
                movieId: "seed-2",
                title: "Jaane Jaan",
                year: "2023",
                watchedOn: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
                status: "In Progress",
                progressMinutes: 45,
                totalMinutes: 139,
                rating: 4,
                review: "Excellent suspense. Bebo is superb, but the math teacher's character is amazing.",
                genre: ["Thriller", "Mystery", "Crime"]
              }
            ],
            moodHistory: [
              {
                id: "mood-1",
                timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
                mood: "Happy",
                energyLevel: "High",
                timeBudget: 150,
                additionalNotes: "Weekend movie night with family"
              }
            ]
          },
          "ananya@cinecompanion.in": {
            username: "Ananya Sharma",
            email: "ananya@cinecompanion.in",
            preferences: {
              preferredLanguages: ["English"],
              favoriteGenres: ["Sci-Fi", "Mystery", "Thriller"],
              preferredLength: "Watch in Parts"
            },
            watchHistory: [
              {
                id: "hist-3",
                movieId: "seed-7",
                title: "Inception",
                year: "2010",
                watchedOn: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
                status: "Completed",
                progressMinutes: 148,
                totalMinutes: 148,
                rating: 5,
                review: "Absolutely brain melting! Nolans masterpiece.",
                genre: ["Sci-Fi", "Action", "Mind-bending"]
              }
            ],
            moodHistory: [
              {
                id: "mood-2",
                timestamp: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
                mood: "Mindblown",
                energyLevel: "High",
                timeBudget: 180
              }
            ]
          }
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed to initialize file DB: ", err);
  }
}

initDb();

// Helper to read DB safely
function readDb(): { users: Record<string, User> } {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database: ", err);
  }
  return { users: {} };
}

// Helper to write DB safely
function writeDb(data: { users: Record<string, User> }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to database: ", err);
  }
}

// Instantiate Gemini SDK lazily for robust startup
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return geminiClient;
}

// Custom Collaborative Filtering Layer
function performCollaborativeFiltering(
  currentUserEmail: string,
  preferredLanguages: string[],
  favoriteGenres: string[]
): {
  collaborativeRecommendations: MovieRecommendation[];
  collaborativeStats: CollaborativeStat[];
} {
  const db = readDb();
  const allUsers = Object.values(db.users);
  if (allUsers.length <= 1) {
    return { collaborativeRecommendations: [], collaborativeStats: [] };
  }

  const currentUser = db.users[currentUserEmail.toLowerCase().trim()];
  const currentWatchedTitles = new Set(
    currentUser ? currentUser.watchHistory.map((h) => h.title.toLowerCase()) : []
  );

  // Compute Jaccard/Overlap scores of favorite genres and languages with other users
  const userScores = allUsers
    .filter((u) => u.email.toLowerCase().trim() !== currentUserEmail.toLowerCase().trim())
    .map((otherUser) => {
      // Intersection of favorite genres
      const commonGenres = otherUser.preferences.favoriteGenres.filter((g) =>
        favoriteGenres.includes(g)
      );
      const commonLanguages = otherUser.preferences.preferredLanguages.filter((l) =>
        preferredLanguages.includes(l)
      );

      // Score weight (higher common genres + languages overlap)
      const overlapScore = commonGenres.length * 2 + commonLanguages.length * 3;
      return { otherUser, overlapScore };
    })
    .sort((a, b) => b.overlapScore - a.overlapScore);

  // Retrieve movies liked (rated 4+) by these highly overlapping comparable users, which the current user hasn't watched yet
  const suggestions: MovieRecommendation[] = [];
  const cohortStats: CollaborativeStat[] = [];

  for (const { otherUser, overlapScore } of userScores) {
    if (overlapScore <= 0 || suggestions.length >= 3) continue;

    // find good ratings
    const goodRatings = otherUser.watchHistory.filter((item) => (item.rating || 0) >= 4);
    for (const item of goodRatings) {
      if (currentWatchedTitles.has(item.title.toLowerCase())) continue;
      // Ensure we don't suggest duplicates
      if (suggestions.some((s) => s.title.toLowerCase() === item.title.toLowerCase())) continue;

      // Find in seed catalog or construct dynamic entry
      const seedMatch = NETFLIX_INDIA_SEED_CATALOG.find(
        (s) => s.title.toLowerCase() === item.title.toLowerCase()
      );

      const recItem: MovieRecommendation = seedMatch
        ? {
            ...seedMatch,
            relevanceScore: Math.min(98, 85 + overlapScore * 4),
            matchReason: `Highly recommended by viewers like ${otherUser.username} who share your exact movie taste.`
          }
        : {
            id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: item.title,
            year: item.year || "N/A",
            genre: item.genre || ["Drama"],
            languages: otherUser.preferences.preferredLanguages,
            duration: `${item.totalMinutes}m`,
            description: `A favorite watch of ${otherUser.username}, who rated it ${item.rating}/5 stars. Available on Netflix India.`,
            relevanceScore: Math.min(95, 80 + overlapScore * 4),
            matchReason: `Collaborative Match: Profile overlap with ${otherUser.username} (${commonGenreCount(otherUser.preferences.favoriteGenres, favoriteGenres)} shared genres).`,
            netflixUrl: `https://www.netflix.com/search?q=${encodeURIComponent(item.title)}`
          };

      suggestions.push(recItem);

      cohortStats.push({
        cohortName: `${otherUser.preferences.favoriteGenres.slice(0, 2).join(" & ")} Cohort`,
        sampleUser: otherUser.username,
        currentMoodMatch: otherUser.moodHistory[0]?.mood || "Chill",
        popularTitle: item.title,
        confidenceScore: Math.min(98, 85 + overlapScore * 3)
      });

      if (suggestions.length >= 3) break;
    }
  }

  return {
    collaborativeRecommendations: suggestions,
    collaborativeStats: cohortStats
  };
}

function commonGenreCount(arr1: string[], arr2: string[]): number {
  return arr1.filter((x) => arr2.includes(x)).length;
}

// --- ENDPOINTS ---

// Check Status/Connection
app.get("/api/health", (req, res) => {
  const isKeyAvailable = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({
    status: "ok",
    hasApiConfig: isKeyAvailable,
    timestamp: new Date().toISOString()
  });
});

// Authentication / Login & Register Combo
app.post("/api/auth/login", (req, res) => {
  const { email, username } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  const db = readDb();
  const lowerEmail = email.toLowerCase().trim();

  let user = db.users[lowerEmail];
  let isNew = false;

  if (!user) {
    isNew = true;
    user = {
      username: username || email.split("@")[0],
      email: lowerEmail,
      preferences: {
        preferredLanguages: ["English", "Hindi"],
        favoriteGenres: ["Drama", "Comedy", "Thriller"],
        preferredLength: "Full Movie (90-150 mins)"
      },
      watchHistory: [],
      moodHistory: []
    };
    db.users[lowerEmail] = user;
    writeDb(db);
  }

  res.json({ user, isNew });
});

// Save user preferences
app.post("/api/user/:email/preferences", (req, res) => {
  const { email } = req.params;
  const { preferredLanguages, favoriteGenres, preferredLength }: Preferences = req.body;

  const db = readDb();
  const user = db.users[email.toLowerCase().trim()];
  if (!user) {
    return res.status(444).json({ error: "User profile not found." });
  }

  user.preferences = {
    preferredLanguages: preferredLanguages || ["English"],
    favoriteGenres: favoriteGenres || [],
    preferredLength: preferredLength || "Full Movie (90-150 mins)"
  };

  db.users[email.toLowerCase().trim()] = user;
  writeDb(db);
  res.json({ success: true, user });
});

// Log watch item
app.post("/api/user/:email/watchHistory", (req, res) => {
  const { email } = req.params;
  const { title, year, status, progressMinutes, totalMinutes, rating, review, genre } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Movie title is required." });
  }

  const db = readDb();
  const user = db.users[email.toLowerCase().trim()];
  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const newItem: WatchHistoryItem = {
    id: `hist-${Date.now()}`,
    movieId: req.body.movieId || `custom-${Date.now()}`,
    title,
    year: year || "2024",
    watchedOn: new Date().toISOString(),
    status: status || "Completed",
    progressMinutes: progressMinutes || totalMinutes || 120,
    totalMinutes: totalMinutes || 120,
    rating: rating || 5,
    review: review || "",
    genre: genre || ["Drama"]
  };

  user.watchHistory.unshift(newItem);
  db.users[email.toLowerCase().trim()] = user;
  writeDb(db);

  res.json({ success: true, watchHistory: user.watchHistory });
});

// Log mood checkin
app.post("/api/user/:email/moodLog", (req, res) => {
  const { email } = req.params;
  const { mood, energyLevel, timeBudget, additionalNotes } = req.body;

  if (!mood) {
    return res.status(400).json({ error: "Mood selection is required." });
  }

  const db = readDb();
  const user = db.users[email.toLowerCase().trim()];
  if (!user) {
    return res.status(444).json({ error: "User profile not found." });
  }

  const newLog: MoodLog = {
    id: `mood-${Date.now()}`,
    timestamp: new Date().toISOString(),
    mood,
    energyLevel: energyLevel || "Medium",
    timeBudget: timeBudget || 120,
    additionalNotes: additionalNotes || ""
  };

  user.moodHistory.unshift(newLog);
  db.users[email.toLowerCase().trim()] = user;
  writeDb(db);

  res.json({ success: true, moodHistory: user.moodHistory });
});

// Clear/Reset logs for current user (handy testing)
app.post("/api/user/:email/reset", (req, res) => {
  const { email } = req.params;
  const db = readDb();
  const user = db.users[email.toLowerCase().trim()];
  if (user) {
    user.watchHistory = [];
    user.moodHistory = [];
    db.users[email.toLowerCase().trim()] = user;
    writeDb(db);
  }
  res.json({ success: true, user });
});

// GET Recommendations (AI machine-learning matching + Collaborative filtering)
app.post("/api/recommendations", async (req, res) => {
  const { email, currentMood, energyLevel, timeBudget, additionalNotes } = req.body;

  if (!email) {
    return res.status(400).json({ error: "User email contextual identification is required." });
  }

  const db = readDb();
  const user = db.users[email.toLowerCase().trim()];
  if (!user) {
    return res.status(444).json({ error: "User account missing. Create profile first." });
  }

  const preferredLanguages = user.preferences.preferredLanguages || ["English"];
  const favoriteGenres = user.preferences.favoriteGenres || ["Drama"];
  const watchHistory = user.watchHistory || [];

  // 1. Perform local Collaborative Filtering overlap
  const { collaborativeRecommendations, collaborativeStats } = performCollaborativeFiltering(
    email,
    preferredLanguages,
    favoriteGenres
  );

  // 2. Select initial catalog matches as base filter candidates (cost optimization & fast matching)
  const catalogCandidates = NETFLIX_INDIA_SEED_CATALOG.filter((m) => {
    // Language check
    const matchesLang = m.languages.some((l) => preferredLanguages.includes(l));
    // Check if user already watched it
    const alreadyWatched = watchHistory.some((h) => h.title.toLowerCase() === m.title.toLowerCase());
    return matchesLang && !alreadyWatched;
  });

  // Take up to 10 candidates to limit prompt size and cost
  const finalCatalogCandidates = catalogCandidates.length > 0 ? catalogCandidates.slice(0, 10) : NETFLIX_INDIA_SEED_CATALOG.slice(0, 8);

  const gemini = getGeminiClient();

  if (!gemini) {
    console.warn("GEMINI_API_KEY missing or invalid. Invoking high-fidelity rule-based companion model.");
    // Generate beautiful custom recommendations locally to avoid crashing without key
    const mockRecs = buildLocalRuleRecommendations(
      finalCatalogCandidates,
      collaborativeRecommendations,
      currentMood,
      timeBudget,
      preferredLanguages
    );
    return res.json({
      recommendations: mockRecs,
      collaborativeStats,
      engine: "Local Collaborative Core"
    });
  }

  try {
    // Generate intelligent companion suggestions
    const prompt = `
      You are the companion AI recommender for CineSync India, matching users perfectly with content available on Netflix India version.
      
      User Profile:
      - Preferred Audio Languages: ${preferredLanguages.join(", ")}
      - Liked Genres: ${favoriteGenres.join(", ")}
      - Watch History: ${watchHistory.map((h) => `${h.title} (${h.year}) - rated ${h.rating}/5`).join("; ") || "New user (No history)"}
      
      Current Mood Context:
      - Quick Active Mood: ${currentMood}
      - Energy Level: ${energyLevel}
      - Strict Time Limit: ${timeBudget} minutes (Filter movies/series that fit nicely. If they have short time, prioritize series episodes or specify they can watch in parts!)
      - Log note: ${additionalNotes || "None"}
      
      Peer Profile Collaborative Overlap matches:
      ${collaborativeRecommendations.map((r) => `${r.title} - Overlap match explanation: ${r.matchReason}`).join("\n")}

      Local Netflix India Seed Catalog items:
      ${JSON.stringify(finalCatalogCandidates, null, 2)}

      Tasks:
      1. Analyze the user's specific mood ($currentMood), watch history, and preferences to output the absolute best 4-5 Netflix India available movies or series recommendations.
      2. Keep recommended items highly tailored to the watch time budget of ${timeBudget} mins.
      3. For each recommendation, provide an elegant text reason "matchReason" explaining why it matches BOTH their current mood check-in and connects collaboratively to their watch history preferences or other similar users' tastes (collaborative analysis).
      4. Ensure all recommended content is verified to be available on the Netflix India catalog.
      5. Strictly output a clean structured array of recommendations matching the schema provided.
    `;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are CineSync India's premier cinephile assistant. Your suggestions must reside on Netflix India. Be precise with metadata. Optimize relevance scores (from 75 to 99). Generate beautiful and human-like custom 'matchReason' entries referencing collaborative clusters and individual watch history context.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique dynamic string id (e.g. rec-1, rec-2)" },
              title: { type: Type.STRING, description: "Title of the movie or series" },
              year: { type: Type.STRING, description: "Year of release" },
              genre: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of matching genres"
              },
              languages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Available languages (usually English, Hindi, or both)"
              },
              duration: { type: Type.STRING, description: "Movie duration e.g. 118m or Series episode length" },
              description: { type: Type.STRING, description: "A highly intriguing 1-2 sentence overview" },
              relevanceScore: { type: Type.NUMBER, description: "Percentage similarity metric e.g. 96" },
              matchReason: { type: Type.STRING, description: "Custom collaborative matching summary explaining the emotional, profile, and length compatibility for this session" },
              netflixUrl: { type: Type.STRING, description: "Direct search link to query on Netflix" },
              isOriginal: { type: Type.BOOLEAN, description: "Whether it is a Netflix Original" }
            },
            required: ["id", "title", "year", "genre", "languages", "duration", "description", "relevanceScore", "matchReason", "netflixUrl"]
          }
        },
    }
    });

    const parsedRecommendations: MovieRecommendation[] = JSON.parse(response.text || "[]");

    // Clean up IDs & attach default search URLs if missing
    const sanitized = parsedRecommendations.map((rec, idx) => {
      return {
        ...rec,
        id: rec.id || `rec-${idx}-${Date.now()}`,
        netflixUrl: rec.netflixUrl || `https://www.netflix.com/search?q=${encodeURIComponent(rec.title)}`
      };
    });

    res.json({
      recommendations: sanitized,
      collaborativeStats,
      engine: "Gemini 3.5 Flash",
      warning: null
    });
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isRateLimit = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED");
    const isUnavailable = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("high demand") || errorMsg.includes("temporary");
    
    console.warn(
      `[Gemini Status] ${isRateLimit ? "Quota Limit (429) hit." : isUnavailable ? "Temporary 503 High Demand hit." : "Generation failed."} Defaulting to CineSync Local Matching Core. Info: ${errorMsg}`
    );

    // Fallback gracefully
    const fallbackRecs = buildLocalRuleRecommendations(
      finalCatalogCandidates,
      collaborativeRecommendations,
      currentMood,
      timeBudget,
      preferredLanguages
    );
    
    let warningMessage = "Gemini API is temporarily offline. CineSync Mumbai Local matches are fully active.";
    if (isRateLimit) {
      warningMessage = "Gemini API key has exceeded its rate/quota limit. CineSync Mumbai Local matches are fully active.";
    } else if (isUnavailable) {
      warningMessage = "The matching neural network is experiencing high demand spikes. CineSync's high-fidelity Mumbai Offline Engine has temporarily assumed routing.";
    }

    res.json({
      recommendations: fallbackRecs,
      collaborativeStats,
      engine: "CineSync Offline Engine",
      warning: warningMessage
    });
  }
});

// Helper for high fidelity rule-based recommendations locally
function buildLocalRuleRecommendations(
  catalog: MovieRecommendation[],
  collabRecs: MovieRecommendation[],
  mood: string,
  timeBudget: number,
  languages: string[]
): MovieRecommendation[] {
  // Combine custom collaborative matches with catalog
  const merged = [...collabRecs, ...catalog];
  
  // Sort or adjust score dynamically based on fit
  const processed = merged.map((movie, index) => {
    let score = movie.relevanceScore || (90 - index * 2);
    let matchReason = movie.matchReason || "";

    // Adjust for timeBudget
    const isSeries = movie.duration.toLowerCase().includes("series") || movie.duration.toLowerCase().includes("episode");
    let movieMinutesOffset = 110;
    const minutesMatch = movie.duration.match(/(\d+)/);
    if (minutesMatch) {
      movieMinutesOffset = parseInt(minutesMatch[1], 10);
    }

    if (timeBudget < 60 && isSeries) {
      score += 8;
      matchReason = `Fits perfectly in your short ${timeBudget}-minute limit. These bite-sized series parts keep you moving.`;
    } else if (movieMinutesOffset <= timeBudget) {
      score += 5;
      matchReason = movie.matchReason || `Perfect match. At ${movie.duration}, you can finish this in one comfortable session without interruption.`;
    } else {
      score -= 5;
      matchReason = `A great fit for your ${mood} mood. Note: at ${movie.duration}, we suggest split-watching across 2 comfortable parts.`;
    }

    // Adjust for mood match
    const lowercaseMood = mood.toLowerCase();
    const isThriller = movie.genre.some((g) => g.toLowerCase() === "thriller" || g.toLowerCase() === "crime" || g.toLowerCase() === "mystery");
    const isComedy = movie.genre.some((g) => g.toLowerCase() === "comedy" || g.toLowerCase() === "satire");
    const isDrama = movie.genre.some((g) => g.toLowerCase() === "drama" || g.toLowerCase() === "nature");

    if (lowercaseMood === "thrilled") {
      if (isThriller) {
        score += 7;
        matchReason = `Thrilled mood match! Your adrenaline needs are met with this high stakes Netflix suspense mystery.`;
      }
    } else if (lowercaseMood === "happy" || lowercaseMood === "romantic") {
      if (isComedy) {
        score += 8;
        matchReason = `Wholesome match! Perfectly designed to lift spirits and keep things cheerful.`;
      }
    } else if (lowercaseMood === "chill" || lowercaseMood === "comfy") {
      if (isDrama) {
        score += 5;
        matchReason = `Relaxing pick! Ideal companion content to kick back, relax, and wind down contentedly.`;
      }
    }

    return {
      ...movie,
      relevanceScore: Math.min(99, Math.max(70, score)),
      matchReason: matchReason || `Personalized selection from Netflix India based on language and mood profiles.`
    };
  });

  // Unique elements
  const seenTitles = new Set<string>();
  const uniqueRecs: MovieRecommendation[] = [];
  for (const r of processed) {
    if (seenTitles.has(r.title.toLowerCase())) continue;
    seenTitles.add(r.title.toLowerCase());
    uniqueRecs.push(r);
  }

  return uniqueRecs.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 4);
}

// --- VITE MIDDLEWARE SETUP ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CineSync India Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
