
// schoolbus-backend/routes/aiRoutes.js

const express = require('express');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '..', '.env')
});

const router = express.Router();

const apiKey = process.env.GEMINI_API_KEY?.trim();

// Gemini models
const MODELS_TO_TRY = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite'
];

// School knowledge base
const SYSTEM_KNOWLEDGE = `
BRIGHT FUTURE SCHOOL SYSTEM — Knowledge Base

(About, Programs, Bus Routes, Tracking, Enrollment, Contact, Rules as before...)
`;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

// Initialize AI configuration
if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing in .env');
} else {
    console.log('✅ Gemini AI configuration loaded.');
}

// Language instructions
function getLanguageInstruction(language) {
    switch (language) {
        case 'am':
            return 'Reply in Amharic.';
        case 'om':
            return 'Reply in Afaan Oromoo.';
        default:
            return 'Reply in English.';
    }
}

// Prepare conversation history
function prepareHistory(history, question) {
    const safeHistory = Array.isArray(history)
        ? history.slice(-12)
        : [];

    const contents = safeHistory
        .filter(item =>
            item &&
            ['user', 'assistant', 'model'].includes(item.role) &&
            typeof item.content === 'string' &&
            item.content.trim()
        )
        .map(item => ({
            role: item.role === 'assistant' || item.role === 'model'
                ? 'model'
                : 'user',
            parts: [{
                text: item.content.trim().slice(0, 4000)
            }]
        }));

    const lastMessage = contents[contents.length - 1];

    // Avoid adding the current question twice
    if (
        !lastMessage ||
        lastMessage.role !== 'user' ||
        lastMessage.parts[0].text !== question.trim()
    ) {
        contents.push({
            role: 'user',
            parts: [{ text: question.trim() }]
        });
    }

    return contents;
}

// AI endpoint
router.post('/ask', async (req, res) => {

    try {
        const {
            question,
            language = 'en',
            history = []
        } = req.body || {};

        // Validate request
        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({
                error: 'Question is required.'
            });
        }

        if (question.length > 4000) {
            return res.status(400).json({
                error: 'Question is too long.'
            });
        }

        if (!apiKey) {
            return res.status(500).json({
                error: 'AI is not configured.'
            });
        }

        const langInstruction = getLanguageInstruction(language);

        const contents = prepareHistory(history, question);

        let successAnswer = null;
        let lastError = null;

        // Try available models
        for (const modelName of MODELS_TO_TRY) {

            // Retry temporary failures twice
            for (let attempt = 1; attempt <= 2; attempt++) {

                try {
                    console.log(
                        `🤖 Trying ${modelName} (attempt ${attempt}/2)...`
                    );

                    const url =
                        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKey
                        },
                        body: JSON.stringify({
                            systemInstruction: {
                                parts: [{
                                    text: `${SYSTEM_KNOWLEDGE}\n\n${langInstruction}`
                                }]
                            },
                            contents
                        }),
                        signal: AbortSignal.timeout(30000)
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        const error = new Error(
                            data.error?.message || 'Gemini API error'
                        );

                        error.status = response.status;
                        throw error;
                    }

                    successAnswer =
                        data.candidates?.[0]?.content?.parts
                            ?.map(part => part.text || '')
                            .join('')
                            .trim();

                    if (!successAnswer) {
                        throw new Error(
                            'Gemini returned an empty response.'
                        );
                    }

                    console.log(`✅ AI response generated using ${modelName}`);

                    break;

                } catch (err) {

                    lastError = err;

                    console.error(
                        `⚠️ ${modelName} failed:`,
                        err.status || 'Network/timeout error',
                        err.message
                    );

                    const retryable =
                        !err.status ||
                        [429, 500, 502, 503, 504].includes(err.status);

                    if (!retryable) {
                        // Try another model for model-not-found errors.
                        if (err.status === 404) {
                            break;
                        }

                        // Authentication and request errors need correction.
                        if ([400, 401, 403].includes(err.status)) {
                            return res.status(503).json({
                                error: 'AI service configuration needs attention.'
                            });
                        }

                        break;
                    }

                    if (attempt < 2) {
                        const waitTime =
                            1500 * attempt + Math.random() * 1000;

                        console.log(
                            `↳ Retrying in ${Math.round(waitTime)}ms...`
                        );

                        await sleep(waitTime);
                    }
                }
            }

            if (successAnswer) {
                break;
            }
        }

        // Successful response
        if (successAnswer) {
            return res.json({
                answer: successAnswer
            });
        }

        // All models failed
        console.error(
            '🔥 All Gemini model attempts failed:',
            lastError?.status || 'Unknown',
            lastError?.message || 'Unknown error'
        );

        return res.status(503).json({
            error: 'AI is temporarily unavailable. Please try again shortly.'
        });

    } catch (err) {

        console.error('🔥 Unexpected AI route error:', err.message);

        return res.status(500).json({
            error: 'AI service encountered an unexpected error.'
        });
    }
});

module.exports = router;
