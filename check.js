export default function handler(req, res) {
  // הגדרת כותרות להתרת גישה (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // טיפול בבקשת preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // החזרת נתוני הבקשה בפורמט JSON
  res.status(200).json({
    status: "success",
    message: "הבקשה התקבלה בהצלחה בשרתי Vercel",
    timestamp: new Date().toISOString(),
    requestDetails: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body || null
    },
    serverEnvironment: {
      nodeVersion: process.version,
      region: process.env.VERCEL_REGION || "local"
    }
  });
}