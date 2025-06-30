const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS globally
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Range'],
  exposedHeaders: ['Content-Type', 'Content-Range', 'Accept-Ranges'],
  maxAge: 86400,
}));

// Handle OPTIONS requests
app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
    'Access-Control-Max-Age': '86400',
  });
  res.status(204).send();
});

// Main proxy endpoint
app.get('/:channel/*', async (req, res) => {
  const { channel } = req.params;
  const remainingPath = req.params[0] || '';
  const isM3u8 = remainingPath === 'index.m3u8' || remainingPath.endsWith('.m3u8');
  
  const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
  const segmentBaseUrl = 'http://181.233.124.63';
  let targetUrl;

  if (!channel) {
    return res.status(400).send('Invalid URL format.');
  }

  if (isM3u8) {
    targetUrl = `${originalBaseUrl}/${channel}.m3u8`;
  } else {
    targetUrl = `${segmentBaseUrl}/${remainingPath}?${req.url.split('?')[1] || ''}`;
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'http://piranha.mobi/',
        'Origin': 'http://piranha.mobi',
        'Accept': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      },
      responseType: isM3u8 ? 'text' : 'arraybuffer',
      maxRedirects: 5,
    });

    let content = response.data;

    // Rewrite URLs inside m3u8
    if (isM3u8) {
      const proxyBase = `${req.protocol}://${req.get('host')}/${channel}`;
      content = content.split('\n').map(line => {
        if (line && !line.startsWith('#') && !line.startsWith('http')) {
          const [pathPart, query] = line.split('?');
          const normalized = path.normalize(pathPart).replace(/^\/+/, '');
          return `${proxyBase}/${normalized}${query ? '?' + query : ''}`;
        }
        return line;
      }).join('\n');

      res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
        'Access-Control-Expose-Headers': 'Content-Type, Content-Range, Accept-Ranges',
      });
      return res.send(content);
    }

    // Handle TS segment (binary)
    const headers = {
      'Content-Type': 'video/MP2T',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
      'Access-Control-Expose-Headers': 'Content-Type, Content-Range, Accept-Ranges',
      'Accept-Ranges': 'bytes',
    };

    const total = content.length;
    if (req.headers.range) {
      const range = req.headers.range.replace(/bytes=/, '').split('-');
      const start = parseInt(range[0], 10);
      const end = range[1] ? parseInt(range[1], 10) : total - 1;
      const chunk = content.slice(start, end + 1);
      headers['Content-Range'] = `bytes ${start}-${end}/${total}`;
      headers['Content-Length'] = end - start + 1;
      res.status(206).set(headers).send(Buffer.from(chunk));
    } else {
      headers['Content-Length'] = total;
      res.set(headers).send(Buffer.from(content));
    }
  } catch (error) {
    console.error('Error:', error.message, 'URL:', targetUrl);
    if (error.response) {
      return res.status(error.response.status).send(`Error fetching content: ${error.response.statusText}`);
    }
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
