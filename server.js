const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { OpenAI } = require('openai');

const app = express();
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Configure file upload
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only WebM audio files are allowed'), false);
    }
  }
});

// Create necessary directories
['uploads', 'processed'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Convert to Whisper-supported format (MP3)
async function convertAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i ${inputPath} -codec:a libmp3lame -qscale:a 2 ${outputPath}`, 
      (error, stdout, stderr) => {
        if (error) {
          console.error(`FFmpeg Error: ${stderr}`);
          return reject(new Error('Audio conversion failed'));
        }
        resolve();
      }
    );
  });
}

// Transcribe using OpenAI Whisper
async function transcribeAudio(filePath) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "text"
    });
    return transcription;
  } catch (error) {
    console.error('OpenAI Transcription Error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

// API Endpoint
app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join('processed', `${req.file.filename}.mp3`);

    // Step 1: Convert to supported format
    await convertAudio(inputPath, outputPath);

    // Step 2: Transcribe with Whisper
    const transcription = await transcribeAudio(outputPath);

    // Step 3: Cleanup files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.json({ text: transcription });

  } catch (error) {
    console.error('Processing error:', error);
    
    // Cleanup files if they exist
    if (req.file?.path) fs.unlinkSync(req.file.path);
    const outputPath = path.join('processed', `${req.file?.filename}.mp3`);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
