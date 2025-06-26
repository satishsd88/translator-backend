const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const { exec } = require('child_process');

/**
 * Transcribes an audio file using OpenAI's Whisper API.
 * @param {string} audioFilePath - Path to the temporary audio file.
 * @param {string} language - Language code for transcription.
 * @returns {Promise<string>} - Promise that resolves with transcribed text.
 */
async function transcribe(audioFilePath, language) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    // First convert to Whisper-supported format if needed
    const convertedPath = await ensureSupportedFormat(audioFilePath);
    
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(convertedPath), {
            filename: 'audio.mp3',
            contentType: 'audio/mpeg'
        });
        form.append('model', 'whisper-1');
        form.append('language', language);
        form.append('response_format', 'text'); // Get plain text directly

        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions', 
            form, 
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        return response.data;

    } catch (error) {
        console.error("OpenAI Whisper API Error:", error.response?.data || error.message);
        throw new Error(`Transcription failed: ${error.response?.data?.error?.message || error.message}`);
    } finally {
        // Clean up converted file if it's different from original
        if (convertedPath !== audioFilePath) {
            fs.unlinkSync(convertedPath);
        }
    }
}

/**
 * Converts audio file to Whisper-supported format if needed
 */
async function ensureSupportedFormat(inputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    const supportedFormats = ['.mp3', '.wav', '.m4a', '.mp4', '.mpeg'];
    
    if (supportedFormats.includes(ext)) {
        return inputPath; // No conversion needed
    }

    const outputPath = `${inputPath}.mp3`;
    
    return new Promise((resolve, reject) => {
        exec(`ffmpeg -i ${inputPath} -acodec libmp3lame -q:a 2 ${outputPath}`, 
            (error) => {
                if (error) {
                    reject(new Error(`Audio conversion failed: ${error.message}`));
                } else {
                    resolve(outputPath);
                }
            }
        );
    });
}

module.exports = { transcribe };
