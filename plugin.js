/// <reference path="./sdk/kino.d.ts" />

const BASE_URL = "https://pinoymoviehubs.com";

// Función para la Pantalla de Inicio (Home)
export async function home() {
  const response = await kino.fetch(BASE_URL);
  const html = await response.text();
  
  const rows = [];
  const regex = /<a\s+href="(https?:\/\/pinoymoviehubs\.com\/movies\/[^"]+)"[^>]*>\s*<img\s+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
  
  let match;
  const items = [];
  while ((match = regex.exec(html)) !== null) {
    items.push({
      id: match[1],
      title: match[3].replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").trim(),
      poster: match[2],
      url: match[1]
    });
  }

  // Creamos una fila llamada "Recién agregadas" con los primeros 20 resultados
  if (items.length > 0) {
    rows.push({
      title: "Recién agregadas en Pinoy Movies Hub",
      items: items.slice(0, 20)
    });
  }

  return rows;
}

// Función de Búsqueda
export async function search(query) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const response = await kino.fetch(searchUrl);
  const html = await response.text();
  
  const results = [];
  const regex = /<a\s+href="(https?:\/\/pinoymoviehubs\.com\/movies\/[^"]+)"[^>]*>\s*<img\s+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push({
      id: match[1],
      title: match[3].replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").trim(),
      poster: match[2],
      url: match[1]
    });
  }

  return results.slice(0, 100);
}

// Función para reproducir el video
export async function resolve(id, item) {
  const url = id || item.url;
  
  const page = await kino.browser.capture(url, {
    waitUntil: "networkidle",
    timeout: 15000
  });

  if (page.blocked) {
    throw kino.error("unavailable", "blocked", { 
      userMessage: "El sitio bloqueó el acceso automático. Intenta reproducir otro título." 
    });
  }

  const iframeMatch = page.html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    return {
      url: iframeMatch[1],
      headers: {
        "Referer": BASE_URL,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    };
  }

  throw kino.error("not_found", "no_player", { 
    userMessage: "No se encontró el reproductor de video en esta página." 
  });
}
