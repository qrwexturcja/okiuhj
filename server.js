const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Handle CORS preflight requests
app.options('/:channel/*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.status(200).end();
});

// Proxy all requests under /:channel/*
app.get('/:channel/*', async (req, res) => {
  try {
    const channel = req.params.channel; // e.g., "150332"
    const path = req.params[0] || 'index.m3u8'; // Default to index.m3u8 if no path
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    const targetUrl = `${originalBaseUrl}/${channel}/${path}`;

    // Fetch the content with headers to bypass restrictions
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://piranha.mobi/',
        'Origin': 'http://piranha.mobi',
        // Add authentication headers if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE',
        // 'Cookie': 'session=your_cookie_here',
      },
    });

    if (!response.ok) {
      console.error(`Error fetching ${targetUrl}: ${response.statusText}`);
      return res.status(response.status).send(`Error fetching content: ${response.statusText}`);
    }

    // Set headers for VLC compatibility
    const contentType = path.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : (response.headers.get('content-type') || 'video/MP2T');
    res.set({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache',
    });

    // If it's an M3U8 playlist, rewrite relative URLs
    if (path.endsWith('.m3u8')) {
      const workerBaseUrl = `${req.protocol}://${req.get('host')}/${channel}`;
      let content = await response.text();
      content = rewriteM3U8Urls(content, originalBaseUrl, workerBaseUrl);
      res.send(content);
    } else {
      // Stream segment files (e.g., .ts) directly
      response.body.pipe(res);
    }
  } catch (error) {
    console.error(`Error fetching ${targetUrl}: ${error.message}`);
    res.status(500).send('Error fetching the stream');
  }
});

// Function to rewrite relative URLs in M3U8 playlists
function rewriteM3U8Urls(content, originalBaseUrl, workerBaseUrl) {
  return content.split('\n').map(line => {
    if (line && !line.startsWith('#') && !line.startsWith('http')) {
      return `${workerBaseUrl}/${line}`;
    }
    return line;
  }).join('\n');
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
