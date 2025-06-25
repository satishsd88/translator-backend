const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function translateText(text, targetLanguage = "Hindi") {
  const prompt = `Translate the following to ${targetLanguage}:\n\n"${text}"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content.trim();
}

module.exports = { translateText };

