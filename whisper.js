const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

async function transcribeAudio(filePath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("model", "whisper-1");

  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
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
