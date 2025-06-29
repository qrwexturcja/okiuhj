const express = require('express');
const http = require('http');
const app = express();

// Proxy all requests under /:channel/*
app.get('/:channel/*', (req, res) => {
  const channel = req.params.channel;
  const path = req.params[0]; // Capture the rest of the path (e.g., index.m3u8 or tracks-v1a1/mono.ts.m3u8)
  const targetUrl = `http://145.239.19.149/${channel}/${path}`;

  // Forward the request to the origin server
  http.get(targetUrl, (response) => {
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers['content-type'] || 'application/vnd.apple.mpegurl', // Use origin's Content-Type or default to m3u8
      'Access-Control-Allow-Origin': '*', // Allow CORS for all origins
      'Access-Control-Allow-Methods': 'GET, OPTIONS', // Allow necessary methods
      'Access-Control-Allow-Headers': '*', // Allow all headers
    });

    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Pipe the response to the client
    response.pipe(res);
  }).on('error', (err) => {
    console.error(`Error fetching ${targetUrl}: ${err.message}`);
    res.status(500).send('Error fetching the stream');
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
