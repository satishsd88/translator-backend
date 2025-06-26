const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const whisper = require('./whisper'); // Your whisper processing module
const translate = require('./translate'); // Your translation module

const app = express();
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/webm' || file.mimetype === 'audio/wav') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Create necessary directories
['uploads', 'processed'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Audio processing endpoint
app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join('processed', `${req.file.filename}.wav`);

    // Convert to WAV format for Whisper
    await convertToWav(inputPath, outputPath);

    // Transcribe with Whisper
    const transcription = await whisper.transcribe(outputPath);
    
    // Translate if needed
    const translation = await translate.process(
      transcription, 
      req.body.language || 'en'
    );

    // Cleanup files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.json({ 
      text: transcription,
      translation: translation 
    });

  } catch (error) {
    console.error('Processing error:', error);
    
    // Cleanup files if they exist
    if (req.file?.path) fs.unlinkSync(req.file.path);
    const outputPath = path.join('processed', `${req.file?.filename}.wav`);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// Audio conversion helper
function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i ${inputPath} -ar 16000 -ac 1 -c:a pcm_s16le ${outputPath}`, 
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('FFmpeg available:', !!exec('ffmpeg -version'));
});
