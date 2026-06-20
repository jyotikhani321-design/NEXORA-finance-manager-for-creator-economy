import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so our React frontend (typically on port 5173) can communicate with this server
app.use(cors());

// Enable JSON body parsing for incoming requests
app.use(express.json());

// Resolve __dirname since we are using ES Modules ("type": "module")
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

// Helper to read data from our local database file (db.json)
async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file does not exist, return a default empty state
    return {
      creatorName: '',
      niche: 'Tech',
      incomeStreams: []
    };
  }
}

// Helper to write data back to our local database file (db.json)
async function writeDatabase(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

// 1. GET: Load Creator Profile & Streams
app.get('/api/creator', async (req, res) => {
  try {
    const data = await readDatabase();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read database records' });
  }
});

// 2. POST: Save Creator Profile & Streams
app.post('/api/creator', async (req, res) => {
  try {
    const { creatorName, niche, incomeStreams } = req.body;
    
    // Read current data first to maintain any extra fields, or write clean structure
    const currentData = await readDatabase();
    const updatedData = {
      ...currentData,
      creatorName: creatorName || '',
      niche: niche || 'Tech',
      incomeStreams: incomeStreams || []
    };

    await writeDatabase(updatedData);
    res.json({ message: 'Creator profile saved successfully!', data: updatedData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save creator data' });
  }
});

// 3. POST: Get recommendations from Claude AI
app.post('/api/recommendations', async (req, res) => {
  try {
    const { userMessage, systemPrompt } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Check if the API key exists on the backend server
    if (!apiKey || apiKey.trim() === '') {
      console.log('No Anthropic API key found in server .env. Requesting fallback responses.');
      return res.status(400).json({ 
        error: 'No API Key configured on server', 
        shouldUseFallback: true 
      });
    }

    console.log('Forwarding recommendation request to Anthropic Claude API...');
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API responded with error status ${response.status}:`, errorText);
      return res.status(response.status).json({ 
        error: `Claude API error: ${response.status}`, 
        shouldUseFallback: true 
      });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Clean up response string if the model wrapped it in markdown code blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedRecommendations = JSON.parse(cleanText);

    res.json({
      recommendations: parsedRecommendations,
      isUsingFallback: false
    });
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to process AI recommendations', 
      shouldUseFallback: true 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 NEXORA Backend server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📁 Database location: ${DB_PATH}`);
  console.log(`=================================================`);
});
