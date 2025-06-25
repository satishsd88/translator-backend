const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");

const { transcribeAudio } = require("./whisper");
const { translateText } = require("./translate");

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let latestClient = null;

// WebSocket connection
wss.on("connection", (ws) => {
  console.log("✅ WebS

