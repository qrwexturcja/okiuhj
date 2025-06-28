const express = require('express');
const http = require('http');
const app = express();

// Proxy endpoint to fetch .m3u8 content
app.get('/:channel/index.m3u8', (req, res) => {
  const channel = req.params.channel;
  const targetUrl = `http://145.239.19.149/${channel}/index.m3u8`;

  // Forward the request to the origin server
  http.get(targetUrl, (response) => {
    // Set headers to allow streaming
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*', // Allow CORS for Cloudflare Workers
    });

    // Pipe the response to the client
    response.pipe(res);
  }).on('error', (err) => {
    res.status(500).send('Error fetching the stream');
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
