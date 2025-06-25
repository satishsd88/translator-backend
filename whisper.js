const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function transcribeAudio(filePath) {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("model", "whisper-1");

    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    return response.data.text;
  } catch (err) {
    console.error("❌ Whisper API failed:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { transcribeAudio };
