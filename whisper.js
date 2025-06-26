const { exec } = require('child_process');
const path = require('path');

module.exports = {
  transcribe: async (audioPath) => {
    return new Promise((resolve, reject) => {
      const command = `whisper ${audioPath} --model base --language en --output_dir ${path.dirname(audioPath)}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Whisper Error: ${stderr}`);
          return reject(new Error('Transcription failed'));
        }

        try {
          // Parse Whisper output
          const result = stdout.match(/TRANSCRIPTION:\s*(.+)/)?.[1] || '';
          resolve(result.trim());
        } catch (parseError) {
          reject(new Error('Failed to parse Whisper output'));
        }
      });
    });
  }
};
