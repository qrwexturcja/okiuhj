const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000; // Render.com uses PORT env variable

app.get('/:channel/index.m3u8', async (req, res) => {
  try {
    const channelId = req.params.channel; // e.g., "150332"
    if (!channelId) {
      return res.status(400).send('Invalid channel ID');
    }

    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    const targetUrl = `${originalBaseUrl}/${channelId}.m3u8`;

    // Fetch the M3U8 playlist with headers to bypass restrictions
    const response = await fetch(targetUrl, {
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
      return res.status(response.status).send(`Error fetching content: ${response.statusText}`);
    }

    let content = await response.text();

    // Rewrite relative URLs in the M3U8 playlist
    const workerBaseUrl = `${req.protocol}://${req.get('host')}/${channelId}`;
    content = rewriteM3U8Urls(content, originalBaseUrl, workerBaseUrl);

    // Set headers for VLC compatibility
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });

    res.send(content);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Handle segment files (.ts or nested .m3u8)
app.get('/:channel/*', async (req, res) => {
  try {
    const channelId = req.params.channel;
    const fileName = req.params[0]; // e.g., segment1.ts
    if (!channelId || !fileName) {
      return res.status(400).send('Invalid URL format');
    }

    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    const targetUrl = `${originalBaseUrl}/${channelId}/${fileName}`;

    // Fetch the segment file
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://piranha.mobi/',
        'Origin': 'http://piranha.mobi',
        // Add authentication headers if needed
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Error fetching content: ${response.statusText}`);
    }

    // Set headers for VLC
    res.set({
      'Content-Type': fileName.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });

    // Stream the response to the client
    response.body.pipe(res);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
