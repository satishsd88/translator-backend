const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const { transcribeAudio } = require("./whisper");
const { translateText } = require("./translate");

const app = express();

// ✅ Apply CORS to allow Chrome Extension access
app.options('*', cors()); // Enable preflight for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let latestClient = null;

// ✅ WebSocket connection from frontend (for live translation display)
wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  latestClient = ws;
});

// ✅ Multer config for audio file upload
const upload = multer({ dest: "uploads/" });

// ✅ POST /upload route (used by Chrome Extension)
app.post("/upload", upload.single("audio"), async (req, res) => {
  const filePath = req.file?.path;

  if (!filePath) {
    console.log("No audio file received.");
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  console.log("Audio file received:", filePath);

  try {
    const text = await transcribeAudio(filePath);
    console.log("Transcript:", text);

    const translated = await translateText(text, "Hindi");
    console.log("Translated:", translated);

    if (latestClient) {
      latestClient.send(translated);
    }

    res.json({ success: true, transcript: text, translated });
  } catch (err) {
    console.error("Upload failed:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    fs.unlinkSync(filePath);
  }
});

// ✅ GET / route (just a test route for Render health)
app.get("/", (req, res) => {
  res.send("Live Translator Backend is Running!");
});

// ✅ Start the server
server.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port", process.env.PORT || 3000);
});
