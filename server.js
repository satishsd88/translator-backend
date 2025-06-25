const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const { transcribeAudio } = require("./whisper");
const { translateText } = require("./translate");

const app = express();

// ✅ Apply CORS before anything else
app.options('*', cors()); // enable pre-flight for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
