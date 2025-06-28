// server.js
const express = require('express')
const fetch = require('node-fetch')
const app = express()

const BASE_URL = 'http://57.128.210.127/show1/'

app.get('/*', async (req, res) => {
  const path = req.params[0]
  const targetUrl = BASE_URL + path
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Referer': BASE_URL
      }
    })

    if (!response.ok) {
      return res.status(response.status).send(`Fetch error: ${response.status}`)
    }

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream')
    response.body.pipe(res)
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message)
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Proxy listening on port ${PORT}`))
