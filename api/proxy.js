export default async function handler(req, res) {
  // הגדרת כותרות להתרת גישה (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // קבלת כתובת היעד מהפרמטר url (למשל: ?url=https://example.com)
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ 
      error: "חסר פרמטר url", 
      example: "/api/proxy?url=https://example.com" 
    });
  }

  try {
    // השרת של Vercel מוציא פנייה ישירה אל כתובת היעד
    const fetchResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const bodyText = await fetchResponse.text();
    const contentType = fetchResponse.headers.get('content-type') || 'text/plain';

    res.setHeader('Content-Type', contentType);
    return res.status(fetchResponse.status).send(bodyText);

  } catch (error) {
    return res.status(500).json({ 
      error: "נכשלה הפנייה לכתובת היעד דרך השרת", 
      details: error.message 
    });
  }
}
