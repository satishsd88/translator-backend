const fs = require("fs");
const axios = require("axios");

async function transcribeAudio(filePath) {
  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    fs.createReadStream(filePath),
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "multipart/form-data"
      },
      params: {
        model: "whisper-1"
      }
    }
  );
  return response.data.text;
}

async function translateText(text, targetLang = "Hindi") {
  const prompt = `Translate the following English text to ${targetLang}: ${text}`;
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.choices[0].message.content.trim();
}

module.exports = {
  transcribeAudio,
  translateText
};
