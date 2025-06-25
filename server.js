// ===== server.js =====
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { transcribeAudio } = require("./whisper");
const { translateText } = require("./translate");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

app.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    const webmPath = req.file.path;
    console.log("🎧 Audio file received:", webmPath);

    const mp3Path = webmPath.replace(".webm", ".mp3");

    await new Promise((resolve, reject) => {
      ffmpeg(webmPath)
        .toFormat("mp3")
        .save(mp3Path)
        .on("end", () => {
          console.log("✅ Conversion complete:", mp3Path);
          const size = fs.statSync(mp3Path).size;
          console.log("📦 Converted file size:", size, "bytes");
          resolve();
        })
        .on("error", reject);
    });

    const transcription = await transcribeAudio(mp3Path);
    console.log("📝 Transcription:", transcription);

    const translated = await translateText(transcription, "Hindi");
    console.log("🌐 Translated:", translated);

    res.json({ translated });
  } catch (error) {
    console.error("❌ Whisper API failed:", error.message || error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));

