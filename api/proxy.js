export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('חסר פרמטר url');

  try {
    // פנייה לשירות המחזיר את ה-HTML המלא לאחר הרצת סקריפטים
    const renderApi = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(renderApi);
    let html = await response.text();

    // הזרקת תגית base כדי שהתמונות והעיצובים יטענו נכון
    const baseTag = `<base href="${targetUrl}">`;
    html = html.replace(/<head>/i, `<head>${baseTag}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send('שגיאה שטעינת הדף: ' + error.message);
  }
}
