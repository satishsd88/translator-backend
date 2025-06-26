// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config(); // For loading .env file in local development (Render uses its own env vars)

const openaiTranscriptionService = require('./openaiTranscriptionService');
const translate = require('./translate');

const app = express();
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        // Updated allowedMimeTypes to primarily support audio/wav
        const allowedMimeTypes = ['audio/wav', 'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/mpga', 'audio/m4a'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only ${allowedMimeTypes.join(', ')} are allowed.`), false);
        }
    }
});

// Configure CORS for your Chrome Extension and Render backend
// IMPORTANT: Replace 'YOUR_CHROME_EXTENSION_ID' with your actual extension ID.
// To find it: Go to chrome://extensions, enable Developer mode, and copy the ID for your extension.
app.use(cors({
    origin: [
        `chrome-extension://YOUR_CHROME_EXTENSION_ID`, // <--- *** REPLACE THIS PLACEHOLDER ***
        'https://translator-backend-xob7.onrender.com' // Your Render backend URL
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 204
}));

// Create 'uploads' directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Audio processing endpoint
app.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided.' });
        }

        const inputPath = req.file.path;
        const targetLanguage = req.body.language || 'en';

        // --- ADDED DIAGNOSTIC LOGGING ---
        console.log(`Received file: ${req.file.originalname}`);
        console.log(`Temporary file path on server: ${inputPath}`);
        console.log(`Temporary file MIME type from Multer: ${req.file.mimetype}`);
        try {
            const stats = fs.statSync(inputPath);
            console.log(`Temporary file size on server: ${stats.size} bytes`);
            console.log(`Temporary file exists on server: ${fs.existsSync(inputPath)}`);
        } catch (statError) {
            console.error(`Error getting file stats on server: ${statError.message}`);
        }
        // --- END ADDED DIAGNOSTIC LOGGING ---


        // Transcribe using the OpenAI Whisper API via openaiTranscriptionService
        const transcription = await openaiTranscriptionService.transcribe(inputPath, targetLanguage);

        // Translate the transcription using your translate module
        const translation = await translate.process(transcription, targetLanguage);

        // Clean up the temporary audio file after processing
        fs.unlink(inputPath, (err) => {
            if (err) console.error("Error deleting input file:", err);
            else console.log(`Deleted temporary file: ${inputPath}`);
        });

        res.json({
            text: transcription,
            translation: translation
        });

    } catch (error) {
        console.error('Processing error:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting temporary file during error handling:", err);
                else console.log(`Deleted temporary file during error handling: ${req.file.path}`);
            });
        }

        res.status(500).json({
            error: error.message || 'An unknown error occurred during processing.',
            details: error.stack
        });
    }
});

// Basic health check endpoint for Render
app.get('/', (req, res) => {
    res.send('Translator backend is running and ready for audio uploads!');
});

// Start server on the port Render assigns, or default to 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
