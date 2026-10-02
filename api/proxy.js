export default async function handler(req, res) {
  // כותרות CORS למניעת חסימות בדפדפן
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
    // פנייה ישירה לאתר היעד
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

    // טיפול בדפי HTML - שכתוב קישורים ומשאבים
    if (contentType.includes('text/html')) {
      let html = await fetchResponse.text();

      // הסרת תגיות base ישנות
      html = html.replace(/<base[^>]*>/gi, '');

      // שכתוב תגיות משאבים לפרוקסי
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
    // שכתוב נתיבים פנימיים בקובצי CSS
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
    // העברת שאר הנכסים (תמונות, פונטים, JS וכו')
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
