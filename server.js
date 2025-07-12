const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Define the original M3U8 URL
const ORIGINAL_URL = 'http://57.128.216.178:8080/channel/6385f7b4/index.m3u8';

// Headers to mimic a browser request
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Referer': 'http://57.128.216.178:8080',
  'Origin': 'http://57.128.216.178:8080',
  'Accept': 'application/vnd.apple.mpegurl, text/html, */*'
  // Add Authorization header if you have a token (uncomment and replace)
  // 'Authorization': 'Bearer YOUR_ACTUAL_TOKEN'
};

// Handle M3U8 requests
app.get('/index.m3u8', async (req, res) => {
  try {
    // Use query parameter from request or default
    const query = req.url.includes('?') ? req.url.split('?')[1] : 'q=1750456177397';
    const m3u8Url = `${ORIGINAL_URL}?${query}`;

    // Fetch the M3U8 file
    const response = await fetch(m3u8Url, { headers: REQUEST_HEADERS });
    if (!response.ok) {
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      const errorDetails = {
        error: 'Failed to fetch M3U8 file',
        status: response.status,
        statusText: response.statusText,
        url: m3u8Url,
        headersSent: REQUEST_HEADERS,
        responseHeaders,
        note: 'If status is 403, the server may be blocking Render.com IPs or require authentication. Test the URL directly with curl or a browser.'
      };
      res.status(500).json(errorDetails);
      return;
    }

    // Get M3U8 content
    let m3u8Content = await response.text();

    // Replace HTTP URLs with proxied HTTPS URLs
    const workerBaseUrl = `${req.protocol}://${req.get('host')}/proxy/`;
    m3u8Content = m3u8Content.replace(
      /http:\/\/57\.128\.216\.178:8080\/channel\/6385f7b4\//g,
      workerBaseUrl
    );

    // Return M3U8 content
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.send(m3u8Content);
  } catch (error) {
    const errorDetails = {
      error: 'Failed to fetch M3U8 file',
      message: error.message || 'Unknown error occurred',
      url: ORIGINAL_URL,
      headersSent: REQUEST_HEADERS,
      note: 'This may indicate a network issue or server blocking Render.com IPs.'
    };
    res.status(500).json(errorDetails);
  }
});

// Handle segment requests
app.get('/proxy/*', async (req, res) => {
  try {
    // Construct segment URL
    const segmentPath = req.path.replace('/proxy/', '');
    const query = req.url.includes('?') ? req.url.split('?')[1] : 'q=1750456177397';
    const segmentUrl = `http://57.128.216.178:8080/channel/6385f7b4/${segmentPath}?${query}`;

    // Fetch the segment
    const response = await fetch(segmentUrl, { headers: REQUEST_HEADERS });
    if (!response.ok) {
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      const errorDetails = {
        error: 'Failed to fetch segment',
        status: response.status,
        statusText: response.statusText,
        url: segmentUrl,
        headersSent: REQUEST_HEADERS,
        responseHeaders,
        note: 'If status is 403, the server may be blocking Render.com IPs.'
      };
      res.status(500).json(errorDetails);
      return;
    }

    // Stream the segment
    res.set({
      'Content-Type': 'video/mp2t',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    response.body.pipe(res);
  } catch (error) {
    const errorDetails = {
      error: 'Failed to fetch segment',
      message: error.message || 'Unknown error occurred',
      url: segmentUrl,
      headersSent: REQUEST_HEADERS,
      note: 'This may indicate a network issue or server blocking Render.com IPs.'
    };
    res.status(500).json(errorDetails);
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
