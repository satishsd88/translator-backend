// translate.js
const { OpenAI } = require('openai');

module.exports = {
  process: async (text, targetLanguage) => {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o for potentially better performance/cost for translation
        messages: [{
          role: "system",
          content: `Translate the following text to ${targetLanguage}. Maintain all technical terms and proper nouns exactly as they are. Respond only with the translated text, do not add any additional commentary or formatting.`
        }, {
          role: "user",
          content: text
        }]
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Translation error:', error.response ? error.response.data : error.message);
      return text; 
    }
  }
};
