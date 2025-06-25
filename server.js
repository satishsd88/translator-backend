const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const { transcribeAudio } = require("./whisper");
const { translateText } = require("./translate");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let latestClient = null;

// WebSocket for frontend (React)
wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  latestClient = ws;
});

// Multer for file upload
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("audio"), async (req, res) => {
  const filePath = req.file.path;

  try {
    const text = await transcribeAudio(filePath);
    const translated = await translateText(text, "Hindi");

    // Send to frontend WebSocket
    if (latestClient) {
      latestClient.send(translated);
    }

    res.json({ success: true, transcript: text, translated });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    fs.unlinkSync(filePath);
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port", process.env.PORT || 3000);
});
