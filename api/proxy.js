export default async function handler(req, res) {
  // הגדרת כותרות CORS רחבות למניעת חסימות בדפדפן
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    // 1. טיפול חכם ומותאם בקישורי YouTube
    const isYouTube = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');
    
    if (isYouTube) {
      const ytVideoMatch = targetUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]+)/);
      
      if (ytVideoMatch && ytVideoMatch[1]) {
        const videoId = ytVideoMatch[1];
        let videoData = { title: 'סרטון YouTube', author_name: 'ערוץ YouTube', author_url: '#' };
        
        // שליפת מטא-דאטה מ-YouTube oEmbed API
        try {
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (oembedRes.ok) {
            videoData = await oembedRes.json();
          }
        } catch (e) {
          console.error('oEmbed fetch error:', e);
        }

        // בניית ממשק נגן מותאם ועובד עבור YouTube
        const customYouTubeHtml = `
          <!DOCTYPE html>
          <html lang="he" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${videoData.title}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #fff; }
              .yt-card { max-width: 900px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              .video-container { position: relative; padding-bottom: 56.25%; height: 0; background: #000; }
              .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
              .info-panel { padding: 20px; }
              .video-title { font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #f8fafc; line-height: 1.4; }
              .channel-info { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #334155; padding-top: 15px; margin-top: 15px; }
              .channel-name { font-size: 16px; color: #38bdf8; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 8px; }
              .channel-name:hover { text-decoration: underline; }
              .yt-badge { background: #ef4444; color: white; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="yt-card">
              <div class="video-container">
                <iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
              </div>
              <div class="info-panel">
                <div class="video-title">${videoData.title}</div>
                <div class="channel-info">
                  <a class="channel-name" href="${videoData.author_url}" target="_blank">📺 ${videoData.author_name}</a>
                  <span class="yt-badge">YouTube Smart Player</span>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(customYouTubeHtml);
      } else {
        // ממשק חיפוש / הזנת סרטונים במידה והוכנס קישור כללי ליוטיוב
        const ytHomeHtml = `
          <!DOCTYPE html>
          <html lang="he" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: system-ui, sans-serif; margin: 0; padding: 40px; background: #0f172a; color: #fff; text-align: center; }
              .box { max-width: 550px; margin: 0 auto; background: #1e293b; padding: 30px; border-radius: 12px; }
              input { width: 100%; padding: 12px; margin-top: 15px; border-radius: 6px; border: 1px solid #475569; font-size: 15px; }
              button { width: 100%; padding: 12px; margin-top: 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="box">
              <h2>נגן YouTube Proxy</h2>
              <p>הכנס קישור לסרטון יוטיוב ספציפי לצפייה הישירה:</p>
              <input type="text" id="ytUrl" placeholder="https://www.youtube.com/watch?v=...">
              <button onclick="loadVideo()">טען סרטון</button>
            </div>
            <script>
              function loadVideo() {
                const url = document.getElementById('ytUrl').value.trim();
                if (url) {
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(url);
                }
              }
            </script>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(ytHomeHtml);
      }
    }

    // 2. טיפול באתרים רגילים + ניתוב 100% מהתעבורה והמשאבים דרך ה-Proxy
    const fetchResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    let contentType = fetchResponse.headers.get('content-type') || 'text/html';

    if (contentType.includes('text/html')) {
      let html = await fetchResponse.text();

      // הסרת תגיות base קיימות למניעת התנגשויות
      html = html.replace(/<base[^>]*>/gi, '');

      // פונקציית עזר לשכתוב כתובות יחסיות ומניעת חסימות CORS
      const rewriteUrl = (rawUrl) => {
        if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('javascript:') || rawUrl.startsWith('#')) {
          return rawUrl;
        }
        try {
          const absoluteUrl = new URL(rawUrl, targetUrl).href;
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        } catch (e) {
          return rawUrl;
        }
      };

      // שכתוב כל התגיות המפנות למשאבים חיצוניים
      html = html.replace(/(<script[^>]+src=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + rewriteUrl(p2) + p3);
      html = html.replace(/(<link[^>]+href=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + rewriteUrl(p2) + p3);
      html = html.replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + rewriteUrl(p2) + p3);
      html = html.replace(/(<iframe[^>]+src=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + rewriteUrl(p2) + p3);

      // הזרקת תגית base עדכנית
      const baseTag = `<base href="${targetUrl}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else {
        html = baseTag + html;
      }

      res.setHeader('Content-Type', contentType);
      return res.status(fetchResponse.status).send(html);
    } else {
      // העברת נכסי מדיה וקבוצה (CSS, JS, תמונות) בצורה גולמית דרך ה-Proxy
      const buffer = await fetchResponse.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      return res.status(fetchResponse.status).send(Buffer.from(buffer));
    }

  } catch (error) {
    return res.status(500).json({
      error: "נכשלה הפנייה לכתובת היעד דרך השרת",
      details: error.message
    });
  }
}
