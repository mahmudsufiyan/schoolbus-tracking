const { GoogleGenAI } = require('@google/genai');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

if (!API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY is not set. AI features will not work.');
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// ============================================================
// Core Gemini call
// ============================================================
async function callGemini(prompt, { jsonMode = false } = {}) {
    if (!ai) {
        throw new Error('AI service not configured. Add GEMINI_API_KEY to .env');
    }

    try {
        const config = {};
        if (jsonMode) {
            config.responseMimeType = 'application/json';
        }

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: prompt,
            config,
        });

        const text = typeof response.text === 'function'
            ? response.text()
            : response.text;

        return text || '';
    } catch (err) {
        console.error('❌ Gemini call failed:', err.message);
        throw new Error(err.message || 'AI service unavailable');
    }
}

// ============================================================
// Analyze an emergency alert
// ============================================================
async function analyzeEmergencyAlert(alert, context = {}) {
    const {
        bus_number = 'Unknown',
        driver_name = 'Unknown',
        student_count = 0,
        time = new Date().toISOString(),
        latitude = null,
        longitude = null,
        message = '',
    } = context;

    const prompt = `You are an emergency dispatch assistant for a school bus system.

ALERT DETAILS:
- Bus: ${bus_number}
- Driver: ${driver_name}
- Students on board: ${student_count}
- Time: ${time}
- Location: ${latitude ?? 'unknown'}, ${longitude ?? 'unknown'}
- Driver message: "${message}"

Respond in strict JSON with this exact shape:
{
  "severity": "low" | "medium" | "high" | "critical",
  "summary": "one paragraph explaining the situation",
  "suggested_actions": ["action 1", "action 2", "action 3"],
  "parent_message": "short calming message for parents (max 2 sentences)"
}

Only output valid JSON. No other text.`;

    const raw = await callGemini(prompt, { jsonMode: true });

    try {
        return JSON.parse(raw);
    } catch (err) {
        console.error('❌ AI returned invalid JSON:', raw.slice(0, 200));
        return {
            severity: 'unknown',
            summary: 'AI analysis failed to parse.',
            suggested_actions: ['Dispatch nearest unit', 'Call driver directly'],
            parent_message: "Your child's bus has an emergency. Help is on the way.",
        };
    }
}

// ============================================================
// Parent chat
// ============================================================
async function askParentAssistant(question, context = {}) {
    const {
        parent_name = 'Parent',
        children = [],
        active_trips = [],
        notifications = [],
    } = context;

    const childrenText = children.length > 0
        ? children.map(c =>
            `- ${c.full_name} (Grade ${c.grade || 'N/A'}, Bus ${c.bus_number || 'N/A'}, Stop ${c.stop_name || 'N/A'})`
        ).join('\n')
        : 'No children registered.';

    const tripsText = active_trips.length > 0
        ? active_trips.map(t =>
            `- Bus ${t.bus_number || t.bus_id}: ${t.status}, started at ${t.started_at}`
        ).join('\n')
        : 'No active trips.';

    const recentText = notifications.slice(0, 5).map(n =>
        `- ${n.title}: ${n.message}`
    ).join('\n') || 'No recent notifications.';

    const prompt = `You are a helpful assistant for a school bus parent portal.

PARENT: ${parent_name}

THEIR CHILDREN:
${childrenText}

ACTIVE TRIPS:
${tripsText}

RECENT NOTIFICATIONS:
${recentText}

PARENT'S QUESTION: "${question}"

Answer the question clearly and helpfully, using only the data above.
If you don't have information, say so politely and suggest where to look.
Keep responses short (2-4 sentences). Do NOT invent data.`;

    return await callGemini(prompt);
}

// ============================================================
// Health check
// ============================================================
async function checkAIHealth() {
    if (!ai) {
        return {
            running: false,
            provider: 'gemini',
            model: MODEL,
            error: 'GEMINI_API_KEY not set',
        };
    }
    try {
        const test = await callGemini('Reply with exactly: OK');
        return {
            running: true,
            provider: 'gemini',
            model: MODEL,
            testReply: test.trim().slice(0, 20),
        };
    } catch (err) {
        return {
            running: false,
            provider: 'gemini',
            model: MODEL,
            error: err.message,
        };
    }
}

module.exports = {
    callGemini,
    analyzeEmergencyAlert,
    askParentAssistant,
    checkAIHealth,
};