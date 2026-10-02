export default async function handler(req, res) {
  // הגדרת כותרות CORS למניעת חסימות בדפדפן
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ 
      error: "חסר פרמטר url", 
      example: "/api/proxy?url=https://example.com" 
    });
  }

  try {
    // 1. טיפול בקישורי YouTube
    const ytMatch = targetUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]+)/);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      
      let oembedData = { title: 'סרטון YouTube', author_name: 'ערוץ YouTube', author_url: '#' };
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          oembedData = await oembedRes.json();
        }
      } catch (e) {
        console.error('oEmbed fetch error:', e);
      }

      const customYouTubeHtml = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #fff; }
            .yt-card { max-width: 800px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; }
            .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
            .info-panel { padding: 20px; }
            .video-title { font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #f8fafc; }
            .channel-info { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #334155; padding-top: 12px; }
            .channel-name { font-size: 16px; color: #38bdf8; text-decoration: none; font-weight: 600; }
            .channel-name:hover { text-decoration: underline; }
            .yt-badge { background: #ef4444; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="yt-card">
            <div class="video-container">
              <iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="info-panel">
              <div class="video-title">${oembedData.title}</div>
              <div class="channel-info">
                <a class="channel-name" href="${oembedData.author_url}" target="_blank">📺 ${oembedData.author_name}</a>
                <span class="yt-badge">YouTube</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(customYouTubeHtml);
    }

    // 2. טיפול באתרים רגילים
    const fetchResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    let contentType = fetchResponse.headers.get('content-type') || 'text/html';
    let bodyText = await fetchResponse.text();

    if (contentType.includes('text/html')) {
      bodyText = bodyText.replace(/<base[^>]*>/gi, '');
      const baseTag = `<base href="${targetUrl}">`;
      if (bodyText.includes('<head>')) {
        bodyText = bodyText.replace('<head>', `<head>${baseTag}`);
      } else {
        bodyText = baseTag + bodyText;
      }
    }

    res.setHeader('Content-Type', contentType);
    return res.status(fetchResponse.status).send(bodyText);

  } catch (error) {
    return res.status(500).json({ 
      error: "נכשלה הפנייה לכתובת היעד דרך השרת", 
      details: error.message 
    });
  }
}
