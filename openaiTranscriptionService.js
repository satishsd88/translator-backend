// openaiTranscriptionService.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

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

    console.log(`Preparing to send file to OpenAI: ${audioFilePath}`);
    let fileSize = 0;
    let fileMimeType = 'application/octet-stream'; // Default or infer
    let fileName = path.basename(audioFilePath);

    try {
        const stats = fs.statSync(audioFilePath);
        fileSize = stats.size;
        console.log(`File size for OpenAI upload: ${fileSize} bytes`);
        console.log(`File exists for OpenAI upload: ${fs.existsSync(audioFilePath)}`);
        
        // Attempt to infer MIME type from extension for logging/debugging
        const ext = path.extname(audioFilePath).toLowerCase();
        if (ext === '.wav') fileMimeType = 'audio/wav';
        else if (ext === '.webm') fileMimeType = 'audio/webm';
        else if (ext === '.mp3') fileMimeType = 'audio/mpeg';
        // Add more as needed based on Multer config
        console.log(`Inferred MIME type for OpenAI upload: ${fileMimeType}`);

    } catch (statError) {
        console.error(`Error getting file stats before OpenAI upload: ${statError.message}`);
        throw new Error(`Cannot access audio file: ${statError.message}`); // Fail early if file isn't there
    }

    if (fileSize === 0) {
        throw new Error('Audio file is empty or corrupted, cannot transcribe.');
    }

    const form = new FormData();
    // This is the key change: providing full options to form.append
    form.append('file', fs.createReadStream(audioFilePath), {
        filename: fileName, // Use the base name derived from path
        contentType: fileMimeType // Explicitly set content type based on what we expect
    });
    form.append('model', 'whisper-1');
    form.append('language', language);
    form.append('response_format', 'json');

    try {
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            maxBodyLength: Infinity, // Important for large files
            maxContentLength: Infinity // Important for large files
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
