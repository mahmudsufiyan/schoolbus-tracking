// schoolbus-backend/routes/aiRoutes.js
const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

// Initialize Gemini using the variables from your .env
const apiKey = process.env.GEMINI_API_KEY;
console.log("🔑 AI Route Initialized. Key starts with:", apiKey ? apiKey.substring(0, 5) + "..." : "❌ MISSING KEY");

const ai = new GoogleGenAI({ apiKey: apiKey });

const SYSTEM_KNOWLEDGE = `
BRIGHT FUTURE SCHOOL SYSTEM — Knowledge Base

ABOUT:
- School: Bright Future School, Bole, Addis Ababa, Ethiopia
- Levels: KG through Grade 12
- 1,200+ enrolled students, 4 buses, 12 pickup stops, 15+ years of operation
- Campuses: Bole Central (KG–Grade 8), Gerji (Grades 9–12)

PROGRAMS:
- Kindergarten (KG 1–KG 3) — Bole campus
- Primary School (Grades 1–4) — Bole campus
- Elementary, 2nd Cycle (Grades 5–8) — Bole campus
- High School (Grades 9–12) — Gerji campus

BUS ROUTES (4 total, each with 3 stops):
- BUS-001 Bole Local: Bole → CMC → Bole Michael
- BUS-002 West Corridor: Kera → Sarbet → Wollo Sefer
- BUS-003 North Corridor: Arat Kilo → Megenagna → CMC
- BUS-004 East Corridor: Ayat → Summit → Gerji

HOW BUS TRACKING WORKS:
1. Register online — enroll child, get parent account
2. QR check-in — child scans QR card when boarding, parent gets instant notification
3. Live tracking — parent follows bus on map, gets alerts at 3, 2, and 1 stops away

ENROLLMENT:
- Enrollment open for 2026, seats available
- To enroll: click "Enroll" or go to /register
- Existing users: log in at /login

CONTACT:
- Email: info@brightfutureschool.et
- Phone: +251-11-XXX-XXXX
- Address: Bole, Addis Ababa

RULES:
- Only answer questions related to Bright Future School.
- If you don't know something, say so and direct them to contact the office.
- Keep answers short and friendly.
- If the user writes in Amharic, reply in Amharic. If in Afaan Oromoo, reply in Afaan Oromoo. Otherwise reply in English.
`;

// Helper function for waiting during retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post('/ask', async (req, res) => {
    console.log("📩 Received AI Chat Request:", req.body);
    
    try {
        const { question, language = 'en' } = req.body;

        if (!question || typeof question !== 'string') {
            console.log("⚠️ Error: Question is missing or invalid.");
            return res.status(400).json({ error: 'Question is required' });
        }

        const langInstruction =
            language === 'am' ? 'Reply in Amharic.' :
            language === 'om' ? 'Reply in Afaan Oromoo.' :
            'Reply in English.';

        const prompt = `${SYSTEM_KNOWLEDGE}\n\n${langInstruction}\n\nUser Question: ${question}`;

        // Define the list of models to try: primary model first, then backups
        const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.8-flash'];
        let lastError = null;
        let successAnswer = null;

        // Loop through each model
        for (const modelName of modelsToTry) {
            // For each model, try up to 3 times if it's a 503 error
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`🤖 Trying model: ${modelName}, attempt ${attempt}...`);
                    
                    const response = await ai.models.generateContent({
                        model: modelName,
                        contents: prompt,
                    });

                    console.log(`✅ Success with ${modelName}!`);
                    successAnswer = response.text;
                    break; // Break the retry loop if successful

                } catch (err) {
                    lastError = err;
                    
                    // If it's a 503 (Server Busy), we wait and retry
                    if (err.status === 503) {
                        console.warn(`⚠️ ${modelName} is busy (503). Retrying...`);
                        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                        await sleep(waitTime);
                    } else {
                        // If it's an API key error or other bad request, don't retry, switch model immediately
                        console.error(`❌ Non-503 error on ${modelName}:`, err.message);
                        break; 
                    }
                }
            }
            
            // If we got an answer from this model, stop looping through other models
            if (successAnswer) break;
            
            console.log(`❌ Model ${modelName} failed after 3 attempts. Switching to next model...`);
        }

        // If we successfully got an answer
        if (successAnswer) {
            return res.json({ answer: successAnswer });
        }

        // If all models and retries failed
        console.error('\n🔥🔥🔥 ALL MODELS FAILED 🔥🔥🔥');
        console.error(lastError);
        res.status(503).json({ error: 'AI is temporarily busy. Please try again in a moment.' });

    } catch (err) {
        // Catch any general code errors
        console.error('\n🔥🔥🔥 UNEXPECTED ERROR 🔥🔥🔥');
        console.error(err);
        res.status(500).json({ error: 'AI unavailable. Check server logs.' });
    }
});

module.exports = router;