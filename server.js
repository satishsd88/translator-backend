const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

app.post("/upload", upload.single("audio"), async (req, res) => {
  const webmPath = req.file?.path;
  const mp3Path = path.join("uploads", `${Date.now()}.mp3`);

  if (!webmPath) {
    return res.status(400).json({ success: false, error: "No audio file uploaded" });
  }

  console.log("🎧 Converting audio:", webmPath);

  try {
    // 🔧 Add explicit audio codec and bitrate
    await new Promise((resolve, reject) => {
      ffmpeg(webmPath)
        .inputFormat('webm')
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .on('end', () => {
          console.log("✅ Conversion complete:", mp3Path);
          resolve();
        })
        .on('error', (err) => {
          console.error("❌ FFmpeg conversion error:", err.message);
          reject(err);
        })
        .save(mp3Path);
    });

    // 🔍 Log file size
    const stats = fs.statSync(mp3Path);
    console.log("📦 MP3 file size:", stats.size);

    if (stats.size < 1024) {
      throw new Error("Converted file too small or empty.");
    }

    // 🧠 Transcribe with Whisper
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
    // 🧹 Cleanup
    try { fs.unlinkSync(webmPath); } catch {}
    try { fs.unlinkSync(mp3Path); } catch {}
  }
});
