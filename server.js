const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
}));

app.get('/:channel/*', async (req, res) => {
  try {
    const { channel } = req.params;
    const filePath = req.params[0];
    
    const isM3u8 = filePath.endsWith('.m3u8');
    const originalBaseUrl = 'http://piranha.mobi/live/SylwiaMusia%C5%82/c6f66612d91c067a';
    const segmentBaseUrl = 'http://181.233.124.63';
    
    let targetUrl;
    if (isM3u8) {
      targetUrl = `${originalBaseUrl}/${channel}.m3u8`;
    } else {
      // For segments, we need to properly construct the path
      // Remove any duplicate path parts that might come from the channel
      const cleanPath = filePath.replace(new RegExp(`^${channel}/`), '');
      targetUrl = `${segmentBaseUrl}/${cleanPath}`;
    }

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'http://piranha.mobi/',
        'Accept': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      },
      responseType: isM3u8 ? 'text' : 'arraybuffer',
      maxRedirects: 5,
    });

    res.set({
      'Content-Type': isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Access-Control-Allow-Origin': '*',
    });

    isM3u8 ? res.send(response.data) : res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.listen(port, () => console.log(`Proxy running on port ${port}`));
