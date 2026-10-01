export default async function handler(req, res) {
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
    const urlObj = new URL(targetUrl);
    const origin = urlObj.origin;

    const fetchResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    let contentType = fetchResponse.headers.get('content-type') || 'text/html';
    let bodyText = await fetchResponse.text();

    // אם התוכן הוא HTML, נזריק תגית <base> כדי שכל המשאבים (CSS/JS/תמונות) יטענו מהאתר המקורי
    if (contentType.includes('text/html')) {
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
