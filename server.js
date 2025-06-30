const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  exposedHeaders: ['Content-Type'],
}));

// Simplified proxy endpoint
app.get('/:channel/*', async (req, res) => {
  try {
    const { channel } = req.params;
    const remainingPath = req.params[0] || '';
    
    const isM3u8 = remainingPath.endsWith('.m3u8');
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    const segmentBaseUrl = 'http://181.233.124.63';
    
    let targetUrl = isM3u8 
      ? `${originalBaseUrl}/${channel}.m3u8`
      : `${segmentBaseUrl}/${remainingPath}`;

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'http://piranha.mobi/',
        'Accept': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      },
      responseType: isM3u8 ? 'text' : 'arraybuffer',
      maxRedirects: 5,
    });

    let content = response.data;

    // For M3U8 files, rewrite URLs to point back through Cloudflare
    if (isM3u8) {
      content = content.split('\n').map(line => {
        if (line && !line.startsWith('#') && !line.startsWith('http')) {
          return `/live/${channel}/${line}`;
        }
        return line;
      }).join('\n');
    }

    res.set({
      'Content-Type': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });

    isM3u8 ? res.send(content) : res.send(Buffer.from(content));
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.listen(port, () => console.log(`Proxy running on port ${port}`));
