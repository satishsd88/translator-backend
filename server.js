const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const { transcribeAudio } = require("./whisper");
const { translateText } = require("./translate");

const app = express();

// Enable CORS for Chrome Extension and Web App
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let latestClient = null;

// WebSocket for frontend
wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  latestClient = ws;
});

// Multer setup for audio file upload
const upload = multer({ dest: "uploads/" });
