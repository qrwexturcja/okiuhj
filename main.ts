// main.ts

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Match pattern /:channel/*
  const match = pathname.match(/^\/([^\/]+)\/(.+)$/);
  if (!match) {
    return new Response("Invalid URL format", { status: 400 });
  }

  const channel = match[1];
  const path = match[2];
  const targetUrl = `http://145.239.19.149/${channel}/${path}`;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(),
    });
  }

  try {
    const originRes = await fetch(targetUrl);

    // Clone response body
    const body = originRes.body;
    const contentType = originRes.headers.get("content-type") || "application/vnd.apple.mpegurl";

    return new Response(body, {
      status: originRes.status,
      headers: {
        ...corsHeaders(),
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error(`Error fetching ${targetUrl}:`, error);
    return new Response("Error fetching the stream", { status: 500 });
  }
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}
