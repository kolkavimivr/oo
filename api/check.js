export default async function handler(req, res) {
  // קבלת כתובת היעד מתוך פרמטר ב-URL (לדוגמה: /api/proxy?url=https://example.com)
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "יש לציין פרמטר url" });
  }

  try {
    // השרת של Vercel פונה אל כתובת היעד
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const data = await response.arrayBuffer();
    const contentType = response.headers.get('content-type');

    // החזרת התגובה מהיעד בחזרה למשתמש
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    return res.status(response.status).send(Buffer.from(data));

  } catch (error) {
    return res.status(500).json({ error: "שגיאה בגישה ליעד", details: error.message });
  }
}
