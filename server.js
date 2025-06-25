const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();

const { transcribeAudio, translateText } = require("./whisper");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}.webm`);
  }
});
const upload = multer({ storage });

// WebSocket server
const server = app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });
let latestClient = null;

wss.on("connection", (ws) => {
  console.log("🌐 WebSocket client connected");
  latestClient = ws;

  ws.on("close", () => {
    console.log("❌ WebSocket client disconnected");
    if (latestClient === ws) latestClient = null;
  });
});

// Upload route with audio conversion and Whisper processing
app.post("/upload", upload.single("audio"), async (req, res) => {
  const webmPath = req.file?.path;
  const mp3Path = path.join("uploads", `${Date.now()}.mp3`);

  if (!webmPath) {
    return res.status(400).json({ success: false, error: "No audio file uploaded" });
  }

  console.log("🎧 Audio file received:", webmPath);

  try {
    // Convert webm to mp3 using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(webmPath)
        .inputFormat("webm")
        .audioCodec("libmp3lame")
        .audioBitrate("128k")
        .on("end", () => {
          console.log("✅ Conversion complete:", mp3Path);
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ FFmpeg error:", err.message);
          reject(err);
        })
        .save(mp3Path);
    });

    const stats = fs.statSync(mp3Path);
    console.log("📦 Converted file size:", stats.size, "bytes");

    if (stats.size < 1000) {
      throw new Error("Converted file too small or invalid.");
    }

    // Transcribe and translate
    const text = await transcribeAudio(mp3Path);
    const translated = await translateText(text, "Hindi");

    if (latestClient) {
      latestClient.send(translated);
    }

    res.json({ success: true, transcript: text, translated });
  } catch (err) {
    console.error("❌ Whisper API failed:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  } finally {
    // Clean up files
    try { fs.unlinkSync(webmPath); } catch {}
    try { fs.unlinkSync(mp3Path); } catch {}
  }
});
