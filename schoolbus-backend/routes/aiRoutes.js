// schoolbus-backend/routes/aiRoutes.js
const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post('/ask', async (req, res) => {
    console.log("📩 Received AI Chat Request:", req.body);
    
    try {
        const { question, language = 'en' } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ error: 'Question is required' });
        }

        const langInstruction =
            language === 'am' ? 'Reply in Amharic.' :
            language === 'om' ? 'Reply in Afaan Oromoo.' :
            'Reply in English.';

        const prompt = `${SYSTEM_KNOWLEDGE}\n\n${langInstruction}\n\nUser Question: ${question}`;

        // ✅ These are the CORRECT, currently supported model names
        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        let lastError = null;
        let successAnswer = null;

        for (const modelName of modelsToTry) {
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`🤖 Trying model: ${modelName}, attempt ${attempt}...`);
                    
                    const response = await ai.models.generateContent({
                        model: modelName,
                        contents: prompt,
                    });

                    console.log(`✅ Success with ${modelName}!`);
                    successAnswer = response.text;
                    break; 

                } catch (err) {
                    lastError = err;
                    console.warn(`⚠️ Error on ${modelName}:`, err.message);
                    
                    // Retry only if it's a 503 (Server Busy)
                    if (err.status === 503) {
                        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                        await sleep(waitTime);
                    } else {
                        // If it's a 404 (Model not found) or 400 (Bad request), break and try next model
                        break; 
                    }
                }
            }
            
            if (successAnswer) break;
            console.log(`❌ Model ${modelName} failed. Switching to next...`);
        }

        if (successAnswer) {
            return res.json({ answer: successAnswer });
        }

        console.error('\n🔥🔥🔥 ALL MODELS FAILED 🔥🔥🔥');
        console.error(lastError);
        res.status(503).json({ error: 'AI is temporarily busy or the API key is invalid.' });

    } catch (err) {
        console.error('\n🔥🔥🔥 UNEXPECTED ERROR 🔥🔥🔥');
        console.error(err);
        res.status(500).json({ error: 'AI unavailable. Check server logs.' });
    }
});

module.exports = router;