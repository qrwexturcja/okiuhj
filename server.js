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
app.get('/:channel/:file*', async (req, res) => {
  try {
    const { channel, file } = req.params;
    const path = req.params[0] || ''; // Capture additional path segments (e.g., /play/hls-nginx/...)

    if (!channel || !file) {
      return res.status(400).send('Invalid URL format. Use /:channel/index.m3u8 or /:channel/path/to/file');
    }

    // Construct the original URL
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    let targetUrl = `${originalBaseUrl}/${channel}.m3u8`;

    // If requesting a segment file (e.g., .ts or nested .m3u8), adjust the URL
    if (file !== 'index.m3u8') {
      // Use the redirected base URL for segments
      const segmentBaseUrl = 'http://181.233.124.63';
      targetUrl = `${segmentBaseUrl}/${file}${path}?${req.url.split('?')[1] || ''}`;
    }

    // Fetch content from the target URL, following redirects
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
      maxRedirects: 5, // Follow redirects
    });

    let content = response.data;

    // Rewrite URLs in M3U8 playlists
    if (file.endsWith('.m3u8')) {
      const workerBaseUrl = `${req.protocol}://${req.get('host')}/${channel}`;
      content = content.split('\n').map(line => {
        if (line && !line.startsWith('#') && !line.startsWith('http')) {
          // Preserve query parameters
          const [path, query] = line.split('?');
          return `${workerBaseUrl}/${path}${query ? '?' + query : ''}`;
        }
        return line;
      }).join('\n');
    }

    // Set headers for VLC compatibility
    res.set({
      'Content-Type': file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });

    // Send binary data for .ts files, text for .m3u8
    if (file.endsWith('.ts')) {
      res.send(Buffer.from(content));
    } else {
      res.send(content);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      return res.status(error.response.status).send(`Error fetching(policy: 403
fetching content: ${error.response.statusText}`);
    }
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
