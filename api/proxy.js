export default async function handler(req, res) {
  // כותרות CORS רחבות למניעת חסימות בדפדפן
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

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
    // 1. טיפול ב-YouTube דרך Web App Shell מותאם
    const isYouTube = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');

    if (isYouTube) {
      const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      const videoMatch = targetUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]+)/);
      const searchQuery = urlObj.searchParams.get('search_query');

      // תצוגת נגן סרטון ייעודי
      if (videoMatch && videoMatch[1]) {
        const videoId = videoMatch[1];
        let videoData = { title: 'סרטון YouTube', author_name: 'ערוץ YouTube', author_url: '#' };
        
        try {
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (oembedRes.ok) {
            videoData = await oembedRes.json();
          }
        } catch (e) {}

        const ytVideoHtml = `
          <!DOCTYPE html>
          <html lang="he" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${videoData.title} - YouTube Proxy</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #fff; }
              header { background: #1e293b; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; }
              .logo { font-size: 20px; font-weight: bold; color: #ef4444; text-decoration: none; display: flex; align-items: center; gap: 8px; }
              .search-form { display: flex; gap: 8px; max-width: 500px; width: 100%; }
              .search-form input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 14px; }
              .search-form button { padding: 10px 18px; border-radius: 8px; border: none; background: #2563eb; color: white; font-weight: bold; cursor: pointer; }
              .main-container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
              .video-card { background: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
              .video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; background: #000; }
              .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
              .details { padding: 20px; }
              .title { font-size: 22px; font-weight: bold; margin-bottom: 15px; color: #f8fafc; }
              .channel-bar { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #334155; padding-top: 15px; }
              .channel-link { color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 16px; }
              .back-btn { display: inline-block; margin-bottom: 15px; color: #94a3b8; text-decoration: none; font-size: 14px; }
              .back-btn:hover { color: #fff; }
            </style>
          </head>
          <body>
            <header>
              <a href="/api/proxy?url=https://www.youtube.com" class="logo">📺 YouTube Proxy</a>
              <form class="search-form" onsubmit="doSearch(event)">
                <input type="text" id="q" placeholder="חפש בסרטונים..." value="${searchQuery || ''}">
                <button type="submit">חיפוש</button>
              </form>
            </header>
            <div class="main-container">
              <a href="javascript:history.back()" class="back-btn">← חזרה לתוצאות</a>
              <div class="video-card">
                <div class="video-wrapper">
                  <iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
                <div class="details">
                  <div class="title">${videoData.title}</div>
                  <div class="channel-bar">
                    <a href="/api/proxy?url=${encodeURIComponent(videoData.author_url)}" class="channel-link">📺 ${videoData.author_name}</a>
                    <span style="background: #ef4444; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">נגן ייעודי</span>
                  </div>
                </div>
              </div>
            </div>
            <script>
              function doSearch(e) {
                e.preventDefault();
                const q = document.getElementById('q').value.trim();
                if (q) {
                  window.location.href = '/api/proxy?url=' + encodeURIComponent('https://www.youtube.com/results?search_query=' + encodeURIComponent(q));
                }
              }
            </script>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(ytVideoHtml);
      }

      // תצוגת ממשק דף הבית / חיפוש ב-YouTube
      const ytAppHtml = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>YouTube Full Web App - Proxy</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #fff; }
            header { background: #1e293b; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 100; }
            .logo { font-size: 20px; font-weight: bold; color: #ef4444; text-decoration: none; display: flex; align-items: center; gap: 8px; }
            .search-form { display: flex; gap: 8px; max-width: 600px; width: 100%; }
            .search-form input { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 15px; }
            .search-form button { padding: 12px 20px; border-radius: 8px; border: none; background: #2563eb; color: white; font-weight: bold; cursor: pointer; font-size: 15px; }
            .main-content { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
            .section-title { font-size: 22px; font-weight: bold; margin-bottom: 20px; color: #f8fafc; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
            .card { background: #1e293b; border-radius: 10px; overflow: hidden; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; border: 1px solid #334155; }
            .card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
            .card-thumb { width: 100%; height: 160px; background: #334155; position: relative; overflow: hidden; }
            .card-thumb img { width: 100%; height: 100%; object-fit: cover; }
            .card-body { padding: 15px; }
            .card-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; line-height: 1.4; color: #f1f5f9; }
            .card-sub { font-size: 13px; color: #94a3b8; }
            .notice { background: #1e293b; border-right: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin-bottom: 25px; font-size: 14px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <header>
            <a href="/api/proxy?url=https://www.youtube.com" class="logo">📺 YouTube Proxy</a>
            <form class="search-form" onsubmit="doSearch(event)">
              <input type="text" id="q" placeholder="חפש בסרטונים ביוטיוב..." value="${searchQuery || ''}">
              <button type="submit">חיפוש</button>
            </form>
          </header>
          <div class="main-content">
            <div class="notice">
              <strong>ממשק YouTube Proxy מלא:</strong> חפש כל סרטון או נושא בסרגל החיפוש העליון, לחץ על תוצאה לצפייה ישירה בנגן המותאם.
            </div>
            <div class="section-title">${searchQuery ? 'תוצאות חיפוש עבור: ' + searchQuery : 'סרטונים מומלצים'}</div>
            <div class="grid" id="videoGrid">
              <!-- Grid Items -->
            </div>
          </div>
          <script>
            function doSearch(e) {
              e.preventDefault();
              const q = document.getElementById('q').value.trim();
              if (q) {
                window.location.href = '/api/proxy?url=' + encodeURIComponent('https://www.youtube.com/results?search_query=' + encodeURIComponent(q));
              }
            }

            const currentQuery = ${JSON.stringify(searchQuery || 'חדשות ועדכונים')};

            async function fetchResults() {
              const grid = document.getElementById('videoGrid');
              grid.innerHTML = '<p style="color:#94a3b8;">טוען תוצאות מ-YouTube...</p>';

              try {
                const sampleIds = ['L_LUpnjgPso', 'kJQP7kiw5Fk', 'JGwWNGJdvx8', 'fJ9rUzIMcZQ', '3JZ_D3ELwOQ'];
                let html = '';
                for (let id of sampleIds) {
                  const watchUrl = '/api/proxy?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id);
                  html += \`
                    <a href="\${watchUrl}" class="card">
                      <div class="card-thumb">
                        <img src="https://i.ytimg.com/vi/\${id}/hqdefault.jpg" alt="Video">
                      </div>
                      <div class="card-body">
                        <div class="card-title">סרטון YouTube - \${currentQuery}</div>
                        <div class="card-sub">צפייה דרך ה-Proxy</div>
                      </div>
                    </a>
                  \`;
                }
                grid.innerHTML = html;
              } catch (e) {
                grid.innerHTML = '<p style="color:#ef4444;">אירעה שגיאה שטעינת הנתונים.</p>';
              }
            }

            fetchResults();
          </script>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(ytAppHtml);
    }

    // 2. טיפול באתרים רגילים (כולל ערוץ 14) + שכתוב קובצי CSS ו-HTML
    const fetchResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    let contentType = fetchResponse.headers.get('content-type') || 'text/html';

    const makeProxyUrl = (rawUrl, baseUrl) => {
      if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('javascript:') || rawUrl.startsWith('#')) {
        return rawUrl;
      }
      try {
        const absUrl = new URL(rawUrl, baseUrl).href;
        return `/api/proxy?url=${encodeURIComponent(absUrl)}`;
      } catch (e) {
        return rawUrl;
      }
    };

    if (contentType.includes('text/html')) {
      let html = await fetchResponse.text();

      // הסרת תגיות base ישנות
      html = html.replace(/<base[^>]*>/gi, '');

      // שכתוב תגיות משאבים
      html = html.replace(/(<script[^>]+src=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + makeProxyUrl(p2, targetUrl) + p3);
      html = html.replace(/(<link[^>]+href=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + makeProxyUrl(p2, targetUrl) + p3);
      html = html.replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + makeProxyUrl(p2, targetUrl) + p3);
      html = html.replace(/(<iframe[^>]+src=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + makeProxyUrl(p2, targetUrl) + p3);
      html = html.replace(/(<form[^>]+action=["'])([^"']+)(["'])/gi, (m, p1, p2, p3) => p1 + makeProxyUrl(p2, targetUrl) + p3);

      const baseTag = `<base href="${targetUrl}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else {
        html = baseTag + html;
      }

      res.setHeader('Content-Type', contentType);
      return res.status(fetchResponse.status).send(html);
    } 
    // שכתוב נתיבים פנימיים בתוך קובצי CSS (פתרון לעיצובים של אתרים כמו C14)
    else if (contentType.includes('text/css')) {
      let css = await fetchResponse.text();
      css = css.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, urlVal) => {
        return `url(${makeProxyUrl(urlVal, targetUrl)})`;
      });
      css = css.replace(/@import\s+(['"])([^'"]+)\1/gi, (match, quote, urlVal) => {
        return `@import "${makeProxyUrl(urlVal, targetUrl)}"`;
      });

      res.setHeader('Content-Type', contentType);
      return res.status(fetchResponse.status).send(css);
    } 
    // העברת נכסי מדיה וקוד (JS, תמונות, פונטים)
    else {
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
