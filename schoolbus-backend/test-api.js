require('dotenv').config();
const apiKey = process.env.GEMINI_API_KEY;

console.log("🔑 Key being tested:", apiKey ? apiKey.substring(0, 6) + "..." : "❌ MISSING");

if (!apiKey) {
    console.error("No GEMINI_API_KEY found in your .env file!");
    process.exit(1);
}

async function testKey() {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
            }
        );

        const data = await response.json();

        if (response.ok) {
            console.log("✅ SUCCESS! The key is working.");
            console.log("🤖 Model replied:", data.candidates[0].content.parts[0].text);
        } else {
            console.error("❌ API ERROR:", data.error.message);
            console.error("Status code:", response.status);
        }
    } catch (err) {
        console.error("❌ Network/Code error:", err.message);
    }
}

testKey();