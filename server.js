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

    // Construct the original URL
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    let targetUrl = `${originalBaseUrl}/${channel}.m3u8`;

    // If requesting a segment file (e.g., .ts or nested .m3u8), adjust the URL
    if (file !== 'index.m3u8') {
      targetUrl = `${originalBaseUrl}/${channel}/${file}`;
    }

    // Fetch content from the original URL
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://piranha.mobi/',
        'Origin': 'http://piranha.mobi',
        // Add authentication headers if needed (uncomment and customize)
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE',
        // 'Cookie': 'session=your_cookie_here',
      },
      responseType: 'text', // Ensure text response for M3U8 processing
    });

    let content = response.data;

    // Rewrite relative URLs in M3U8 playlists
    if (file.endsWith('.m3u8')) {
      const workerBaseUrl = `${req.protocol}://${req.get('host')}/${channel}`;
      content = content.split('\n').map(line => {
        if (line && !line.startsWith('#') && !line.startsWith('http')) {
          return `${workerBaseUrl}/${line}`;
        }
        return line;
      }).join('\n');
    }

    // Set headers for VLC compatibility
    res.set({
      'Content-Type': file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Cache-Control': 'no-cache',
    });

    res.send(content);
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
