const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const { transcribeAudio } = require("./whisper");
const { translateText } = require("./translate");

const app = express();

// ✅ CORS setup for Chrome Extension and web app access
app.options('*', cors()); // Preflight support
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let latestClient = null;

// ✅ WebSocket for live translation push
wss.on("connection", (ws) => {
  console.log("🔌 WebSocket client connected");
  latestClient = ws;
});

// ✅ Multer for audio uploads
const upload = multer({ dest: "uploads/" });

// ✅ POST /upload: receives audio, transcribes, translates, sends via WebSocket
app.post("/upload", upload.single("audio"), async (req, res) => {
  const filePath = req.file?.path;

  if (!filePath) {
    console.log("❌ No audio file received.");
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  console.log("✅ Audio file received:", filePath);

  try {
    const text = await transcribeAudio(filePath);
    console.log("📝 Transcript:", text);

    const translated = await translateText(text, "Hindi");
    console.log("🌍 Translated:", translated);

    if (latestClient) {
      latestClient.send(translated);
    }

    res.json({ success: true, transcript: text, translated });
  } catch (err) {
    const errData = err.response?.data || err.message || "Unknown error";
    console.error("❌ Upload failed:", errData);
    res.status(500).json({ success: false, error: errData });
  } finally {
    try {
      fs.unlinkSync(filePath); // Clean temp file
    } catch (cleanupError) {
      console.warn("⚠️ Failed to delete temp file:", cleanupError.message);
    }
  }
});

// ✅ GET /: basic check route
app.get("/", (req, res) => {
  res.send("Live Translator Backend is Running!");
});

// ✅ Start server
server.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 3000);
});
