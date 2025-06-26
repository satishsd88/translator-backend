// openaiTranscriptionService.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path'); // <<< ADD THIS LINE TO IMPORT PATH MODULE

/**
 * Transcribes an audio file using OpenAI's Whisper API.
 * @param {string} audioFilePath - The path to the temporary audio file.
 * @param {string} language - The language code for transcription (e.g., 'en', 'es').
 * @returns {Promise<string>} - A promise that resolves with the transcribed text.
 */
async function transcribe(audioFilePath, language) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable on Render.');
    }

    const form = new FormData();
    // Append the audio file as a readable stream, explicitly providing the filename
    // This often helps OpenAI correctly infer the file format.
    form.append('file', fs.createReadStream(audioFilePath), path.basename(audioFilePath)); // <<< UPDATED LINE
    form.append('model', 'whisper-1'); // Specify the Whisper model
    form.append('language', language);   // Pass the language selected by the user
    form.append('response_format', 'json'); // Request JSON output for easier parsing

    try {
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(), // Important for multipart/form-data
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
        });

        if (response.data && response.data.text) {
            return response.data.text;
        } else {
            console.warn("OpenAI response did not contain 'text' field:", response.data);
            throw new Error('No transcription text found in OpenAI response.');
        }

    } catch (error) {
        console.error("OpenAI Whisper API Error:", error.response ? error.response.data : error.message);
        throw new Error('Failed to transcribe audio with OpenAI: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
    }
}

module.exports = { transcribe };
