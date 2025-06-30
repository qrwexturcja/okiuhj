const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes with comprehensive headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Range'],
  exposedHeaders: ['Content-Type', 'Content-Range', 'Accept-Ranges'],
  maxAge: 86400, // Cache preflight response for 24 hours
}));

// Handle OPTIONS preflight requests for all routes
app.options('*', (req, res) => {
  console.log('Handling OPTIONS request for:', req.url);
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
    'Access-Control-Max-Age': '86400',
  });
  res.status(204).send();
});

// Proxy endpoint for M3U8 and segment files
app.get('/:channel/*', async (req, res) => {
  try {
    const { channel } = req.params;
    const remainingPath = req.params[0] || ''; // Capture all path segments after /:channel/

    if (!channel) {
      return res.status(400).send('Invalid URL format. Use /:channel/index.m3u8 or /:channel/path/to/file');
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

    // Fetch content from the target URL
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

    let content = response.data;

    // Rewrite URLs in M3U8 playlists
    if (isM3u8) {
      const workerBaseUrl = `${req.protocol}://${req.get('host')}/${channel}`;
      content = content.split('\n').map(line => {
        if (line && !line.startsWith('#') && !line.startsWith('http')) {
          const [pathPart, query] = line.split('?');
          const normalizedPath = path.normalize(pathPart).replace(/^\/+/, '');
          return `${workerBaseUrl}/${normalizedPath}${query ? '?' + query : ''}`;
        }
        return line;
      }).join('\n');
    }

    // Set headers for VLC and ClickApp compatibility
    const headers = {
      'Content-Type': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
      'Access-Control-Expose-Headers': 'Content-Type, Content-Range, Accept-Ranges',
    };
    if (!isM3u8) {
      headers['Accept-Ranges'] = 'bytes';
      headers['Content-Range'] = `bytes 0-${content.length - 1}/${content.length}`;
    }
    res.set(headers);

    // Log headers for debugging
    console.log('Response headers for', req.url, headers);

    // Send binary data for .ts files, text for .m3u8
    if (isM3u8) {
      res.send(content);
    } else {
      res.send(Buffer.from(content));
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
