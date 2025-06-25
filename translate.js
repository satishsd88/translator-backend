const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

async function translateText(text, targetLanguage = "Hindi") {
  const prompt = `Translate the following to ${targetLanguage}:\n\n"${text}"`;

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });

  return response.data.choices[0].message.content.trim();
}

module.exports = { translateText };
