const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for VLC compatibility
app.use(cors({
  origin: '*',
  methods: ['GET'],
}));

// Proxy endpoint for M3U8 and segment files
app.get('/:channel/:file', async (req, res) => {
  try {
    const { channel, file } = req.params;

    if (!channel || !file) {
      return res.status(400).send('Invalid URL format. Use /:channel/index.m3u8');
    }

    // Base URL for the original server
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    // Base URL for the redirected server (determined from your provided redirect)
    const redirectBaseUrl = 'http://181.233.124.63';

    let targetUrl;
    if (file === 'index.m3u8') {
      // Fetch the M3U8 playlist from the original URL (handles redirects)
      targetUrl = `${originalBaseUrl}/${channel}.m3u8`;
    } else {
      // Proxy segment files (.ts) directly to the redirected server
      targetUrl = `${redirectBaseUrl}/play/hls-nginx/03d9314b-de88-4c6b-91e6-f89343e50d78/${file}`;
      // Append query parameters if present
      if (req.url.includes('?')) {
        targetUrl += req.url.split('?')[1];
      }
    }

    // Fetch content from the target URL
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://piranha.mobi/',
        'Origin': 'http://piranha.mobi',
        // Add authentication headers if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE',
        // 'Cookie': 'session=your_cookie_here',
      },
      responseType: file.endsWith('.ts') ? 'arraybuffer' : 'text', // Use arraybuffer for .ts files
      maxRedirects: 5, // Follow redirects for M3U8
    });

    let content = response.data;

    // Rewrite URLs in M3U8 playlists
    if (file.endsWith('.m3u8')) {
      const proxyBaseUrl = `${req.protocol}://${req.get('host')}/${channel}`;
      content = content.split('\n').map(line => {
        if (line && !line.startsWith('#') && line.startsWith('/play/hls-nginx')) {
          // Extract the segment filename and query parameters
          const urlParts = line.split('?');
          const path = urlParts[0].split('/').pop(); // e.g., 03d9314b-de88-4c6b-91e6-f89343e50d78_1751235278.ts
          const query = urlParts[1] ? `?${urlParts[1]}` : '';
          return `${proxyBaseUrl}/${path}${query}`;
        }
        return line;
      }).join('\n');
    }

    // Set headers for VLC compatibility
    res.set({
      'Content-Type': file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Cache-Control': 'no-cache',
    });

    // Send binary data for .ts files, text for M3U8
    if (file.endsWith('.ts')) {
      res.send(Buffer.from(content));
    } else {
      res.send(content);
    }
  } catch (error) {
    console.error('Error:', error.message);
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
