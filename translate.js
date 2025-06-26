const { OpenAI } = require('openai');

module.exports = {
  process: async (text, targetLanguage) => {
    try {
      const openai = new OpenAI(process.env.OPENAI_API_KEY);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: `Translate the following text to ${targetLanguage} while preserving technical terms.`
        }, {
          role: "user",
          content: text
        }]
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original if translation fails
    }
  }
};
