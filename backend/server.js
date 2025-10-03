require('dotenv').config({ quiet: true });

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// ✅ Get AssemblyAI API key from environment variable
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

if (!ASSEMBLYAI_API_KEY) {
  console.error('Error: ASSEMBLYAI_API_KEY is not set in environment variables.');
  process.exit(1);
}

console.log('Using AssemblyAI API key prefix:', ASSEMBLYAI_API_KEY.slice(0, 8));

/**
 * Helper: Upload file to AssemblyAI
 */
async function uploadToAssemblyAI(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const response = await axios({
    method: 'post',
    url: 'https://api.assemblyai.com/v2/upload',
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      'Transfer-Encoding': 'chunked',
    },
    data: fileStream,
  });
  return response.data.upload_url;
}

/**
 * Format transcript paragraphs with indentation and spacing
 * @param {Array} paragraphs - Array of paragraph objects with .text property
 * @returns {string} formatted text with indentation and paragraphs separated by double newlines
 */
function formatTranscriptParagraphs(paragraphs) {
  // Map each paragraph text with indentation and join with double newlines
  return paragraphs
    .map(p => '    ' + p.text.trim()) // 4 spaces indent
    .join('\n\n');
}

/**
 * POST /transcribe
 * Expects multipart/form-data with 'file' field containing audio
 * Calls AssemblyAI transcription API, returns { transcript }
 */
app.post('/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const audioPath = req.file.path;

  try {
    // 1. Upload audio file to AssemblyAI
    const uploadUrl = await uploadToAssemblyAI(audioPath);

    // 2. Request transcription with formatting enabled
    const transcriptRes = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: uploadUrl,
        format_text: true,      // Enable punctuation, capitalization, formatting
        // Optionally add other config parameters here if needed
      },
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
      }
    );

    const transcriptId = transcriptRes.data.id;

    // 3. Poll status until transcription is complete or error
    let status = transcriptRes.data.status;
    let transcriptData = null;

    while (status !== 'completed' && status !== 'error') {
      await new Promise(r => setTimeout(r, 3000)); // wait 3s between polls
      const pollRes = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { authorization: ASSEMBLYAI_API_KEY } }
      );
      transcriptData = pollRes.data;
      status = transcriptData.status;
    }

    if (status === 'error') {
      fs.unlinkSync(audioPath);
      return res.status(500).json({ error: transcriptData.error });
    }

    // 4. Fetch paragraphs from AssemblyAI paragraphs endpoint
    const paragraphsRes = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/paragraphs`,
      {
        headers: { authorization: ASSEMBLYAI_API_KEY }
      }
    );

    const paragraphs = paragraphsRes.data.paragraphs || [];

    // 5. Format paragraphs nicely with indentation and spacing
    const formattedTranscript = formatTranscriptParagraphs(paragraphs);

    // 6. Clean up uploaded file from server
    fs.unlinkSync(audioPath);

    // 7. Respond with formatted transcript text
    res.json({ transcript: formattedTranscript });

  } catch (error) {
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } catch (_) {}
    console.error('Error during transcription:', error.response?.data || error.message || error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
