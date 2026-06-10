import { User } from '../types';

export interface SyncResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  error?: string;
}

/**
 * Searches, creates, structures, clears, and updates a Google Sheet in the user's Drive.
 */
export async function syncUserDataToGoogleSheets(
  user: User,
  accessToken: string
): Promise<SyncResult> {
  try {
    // 1. Search for existing tracker sheet
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='CineSync%20India%20Watch%20Tracker'%20and%20mimeType='application/vnd.google-apps.spreadsheet'%20and%20trashed=false`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!searchRes.ok) {
      throw new Error(`Failed to search Google Drive: ${searchRes.statusText}`);
    }
    
    const searchData = await searchRes.json();
    let spreadsheetId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;
    
    // 2. Clear & create spreadsheet if it doesn't exist
    if (!spreadsheetId) {
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'CineSync India Watch Tracker',
          mimeType: 'application/vnd.google-apps.spreadsheet',
        }),
      });
      
      if (!createRes.ok) {
        throw new Error(`Failed to create Google Sheet: ${createRes.statusText}`);
      }
      
      const createData = await createRes.json();
      spreadsheetId = createData.id;
    }
    
    // 3. Fetch layout details
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!metaRes.ok) {
      throw new Error(`Failed to read layout: ${metaRes.statusText}`);
    }
    
    const metaData = await metaRes.json();
    const sheets = metaData.sheets || [];
    const sheetTitles = sheets.map((s: any) => s.properties.title);
    
    const requests: any[] = [];
    
    // Set up tabs
    if (!sheetTitles.includes('User Profile') && sheets.length > 0) {
      const firstSheetId = sheets[0].properties.sheetId;
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: firstSheetId,
            title: 'User Profile',
          },
          fields: 'title',
        },
      });
    }
    
    if (!sheetTitles.includes('Watch History')) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Watch History',
          },
        },
      });
    }
    
    if (!sheetTitles.includes('Mood History')) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Mood History',
          },
        },
      });
    }
    
    if (requests.length > 0) {
      const updateLayoutRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      
      if (!updateLayoutRes.ok) {
        throw new Error(`Failed to configure tabs: ${updateLayoutRes.statusText}`);
      }
    }
    
    // 4. Batch Clear Ranges to start clean
    const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          'User Profile!A1:F100',
          'Watch History!A1:I1000',
          'Mood History!A1:E1000'
        ]
      }),
    });
    
    if (!clearRes.ok) {
      throw new Error(`Failed to clear old ranges: ${clearRes.statusText}`);
    }
    
    // 5. Structure values
    const profileHeaders = ["Username", "Email", "Preferred Languages", "Favorite Genres", "Preferred Watch Style", "Last Sync Timestamp"];
    const profileValues = [
      profileHeaders,
      [
        user.username || '',
        user.email || '',
        (user.preferences?.preferredLanguages || []).join(", "),
        (user.preferences?.favoriteGenres || []).join(", "),
        user.preferences?.preferredLength || '',
        new Date().toISOString()
      ]
    ];
    
    const watchHeaders = ["Movie Title", "Release Year", "Watched On", "Status", "Progress (Mins)", "Total Length (Mins)", "Rating (1-5)", "Review", "Genres"];
    const watchValues = [
      watchHeaders,
      ...(user.watchHistory || []).map((item) => [
        item.title || '',
        item.year?.toString() || '',
        item.watchedOn || '',
        item.status || '',
        item.progressMinutes?.toString() || '0',
        item.totalMinutes?.toString() || '0',
        item.rating?.toString() || '',
        item.review || '',
        (item.genre || []).join(", ")
      ])
    ];
    
    const moodHeaders = ["Timestamp", "Mood", "Energy Level", "Time Budget (Mins)", "Personal Notes"];
    const moodValues = [
      moodHeaders,
      ...(user.moodHistory || []).map((item) => [
        item.timestamp || '',
        item.mood || '',
        item.energyLevel || '',
        item.timeBudget?.toString() || '0',
        item.additionalNotes || ''
      ])
    ];
    
    // 6. Write to sheet
    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'User Profile!A1',
            values: profileValues,
          },
          {
            range: 'Watch History!A1',
            values: watchValues,
          },
          {
            range: 'Mood History!A1',
            values: moodValues,
          },
        ],
      }),
    });
    
    if (!writeRes.ok) {
      throw new Error(`Failed to populate layout values: ${writeRes.statusText}`);
    }
    
    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (err: any) {
    console.error("Error writing sheets sync:", err);
    return {
      success: false,
      error: err && err.message ? err.message : "Google Sheets Sync Failed",
    };
  }
}
