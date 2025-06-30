const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS (optional, as Worker handles CORS)
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  exposedHeaders: ['Content-Type'],
}));

// Handle OPTIONS preflight requests
app.options('/:channel/*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  });
  res.status(204).send();
});

// Proxy endpoint for M3U8 and segment files
app.get('/:channel/*', async (req, res) => {
  try {
    const { channel } = req.params;
    const remainingPath = req.params[0] || '';

    if (!channel) {
      console.error('Invalid URL format:', req.url);
      return res.status(400).send('Invalid URL format');
    }

    // Determine if this is an M3U8 or segment request
    const isM3u8 = remainingPath === 'index.m3u8' || remainingPath.endsWith('.m3u8');
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    const segmentBaseUrl = 'http://181.233.124.63';
    let targetUrl;

    if (isM3u8) {
      targetUrl = `${originalBaseUrl}/${channel}.m3u8`;
    } else {
      targetUrl = `${segmentBaseUrl}/${remainingPath}?${req.url.split('?')[1] || ''}`;
    }

    console.log('Fetching:', targetUrl);

    // Fetch content
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://piranha.mobi/',
        'Origin': 'http://piranha.mobi',
        'Accept': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      },
      responseType: isM3u8 ? 'text' : 'arraybuffer',
      maxRedirects: 5,
      timeout: 10000, // Added timeout
    });

    // Set headers
    res.set({
      'Content-Type': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    });

    // Send response
    if (isM3u8) {
      res.send(response.data);
    } else {
      res.send(Buffer.from(response.data));
    }
  } catch (error) {
    console.error('Error fetching:', req.url, 'Error:', error.message, 'Status:', error.response?.status);
    if (error.response) {
      return res.status(error.response.status).send(`Error fetching content: ${error.response.statusText}`);
    }
    res.status(502).send(`Error: ${error.message}`);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
