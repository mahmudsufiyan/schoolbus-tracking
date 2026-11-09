// schoolbus-backend/routes/aiRoutes.js
const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

// Log to confirm the key is loaded
const apiKey = process.env.GEMINI_API_KEY;
console.log("🔑 AI Route Initialized. Key starts with:", apiKey ? apiKey.substring(0, 5) + "..." : "❌ MISSING KEY");

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: apiKey });
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.8-flash'; 

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

        console.log("🤖 Sending request to Gemini API...");
        
        // Call Gemini API
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });

        console.log("✅ Gemini Responded Successfully!");
        res.json({ answer: response.text });

    } catch (err) {
        // THIS WILL PRINT THE EXACT ERROR TO YOUR TERMINAL
        console.error('\n🔥🔥🔥 EXACT AI ERROR 🔥🔥🔥');
        console.error(err);
        console.error('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n');
        
        res.status(500).json({ error: 'AI unavailable. Check server logs.' });
    }
});

module.exports = router;