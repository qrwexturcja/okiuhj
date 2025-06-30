const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Proxy endpoint for Cloudflare Worker
app.get('/proxy/:channel/*', async (req, res) => {
  try {
    const { channel } = req.params;
    const remainingPath = req.params[0] || '';

    if (!channel) {
      return res.status(400).send('Invalid URL format');
    }

    // Construct target URL
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    const segmentBaseUrl = 'http://181.233.124.63';
    let targetUrl;

    const isM3u8 = remainingPath === 'index.m3u8' || remainingPath.endsWith('.m3u8');
    if (isM3u8) {
      targetUrl = `${originalBaseUrl}/${channel}.m3u8`;
    } else {
      targetUrl = `${segmentBaseUrl}/${remainingPath}?${req.url.split('?')[1] || ''}`;
    }

    // Fetch content from target URL
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://piranha.mobi/',
        'Origin': 'http://piranha.mobi',
        'Accept': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      },
      responseType: isM3u8 ? 'text' : 'arraybuffer',
      maxRedirects: 5,
    });

    // Set minimal headers
    res.set({
      'Content-Type': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Cache-Control': 'no-cache',
    });

    // Send response
    if (isM3u8) {
      res.send(response.data);
    } else {
      res.send(Buffer.from(response.data));
    }
  } catch (error) {
    console.error('Error:', error.message, 'URL:', targetUrl);
    if (error.response) {
      return res.status(error.response.status).send(`Error fetching content: ${error.response.statusText}`);
    }
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
