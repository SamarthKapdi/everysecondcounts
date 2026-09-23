const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.post('/', protect, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ status: 'error', message: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        status: 'success',
        data: {
          reply: "AI service is not configured. Please set GEMINI_API_KEY in your server .env file."
        }
      });
    }

    const prompt = `You are Every Second Counts Emergency Medical Assistant chatbot.
You help patients with:
- First aid instructions
- Symptom guidance (always recommend professional evaluation)
- Emergency preparedness
- Understanding medical terms in simple language

RULES:
- Always state you are an AI and not a replacement for real medical professionals
- For life-threatening situations, always recommend calling emergency services immediately
- Keep responses concise (under 150 words)
- Use relevant emojis for clarity

User message: "${message}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 300 }
        }),
        signal: AbortSignal.timeout(15000)
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "I couldn't process that. Please try again or use the Symptom Checker for a clinical assessment.";

    res.json({
      status: 'success',
      data: { reply }
    });
  } catch (error) {
    console.error('Chatbot error:', error.message);
    res.json({
      status: 'success',
      data: {
        reply: "I'm experiencing a temporary issue. For emergencies, please call your local emergency number immediately. You can also use the AI Symptom Checker tool for a clinical assessment."
      }
    });
  }
});

module.exports = router;
