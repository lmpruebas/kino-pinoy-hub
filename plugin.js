/// <reference path="./sdk/kino.d.ts" />

const BASE_URL = "https://pinoymoviehubs.com";

// Cabeceras para que el sitio crea que somos un navegador real y no nos bloquee
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5"
};

// Función auxiliar para limpiar títulos
function cleanTitle(text) {
  return text.replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Función para la Pantalla de Inicio (Home)
export async function home() {
  try {
    const response = await kino.fetch(BASE_URL, { headers: HEADERS });
    const html = await response.text();
    
    const rows = [];
    const regex = /href="(https?:\/\/pinoymoviehubs\.com\/movies\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    const matches = [...html.matchAll(regex)];
    
    const items = matches.map(m => ({
      id: m[1],
      title: cleanTitle(m[3]),
      poster: m[2],
      url: m[1]
    }));

    if (items.length > 0) {
      rows.push({
        title: "Recién agregadas",
        items: items.slice(0, 20)
      });
    }
    return rows;
  } catch (error) {
    kino.log.error("Error en home: " + error.message);
    return []; // Si falla, devolvemos vacío en lugar de romper la app
  }
}

// Función de Búsqueda
export async function search(query) {
  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const response = await kino.fetch(searchUrl, { headers: HEADERS });
    const html = await response.text();
    
    const regex = /href="(https?:\/\/pinoymoviehubs\.com\/movies\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    const matches = [...html.matchAll(regex)];
    
    const results = matches.map(m => ({
      id: m[1],
      title: cleanTitle(m[3]),
      poster: m[2],
      url: m[1]
    }));

    return results.slice(0, 100);
  } catch (error) {
    kino.log.error("Error en search: " + error.message);
    return [];
  }
}

// Función para reproducir el video
export async function resolve(id, item) {
  const url = id || item.url;
  
  try {
    const page = await kino.browser.capture(url, {
      waitUntil: "networkidle",
      timeout: 20000
    });

    if (page.blocked) {
      throw kino.error("unavailable", "blocked", { 
        userMessage: "El sitio bloqueó el acceso. Intenta con otro título." 
      });
    }

    const iframeMatch = page.html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      return {
        url: iframeMatch[1],
        headers: {
          "Referer": BASE_URL,
          "User-Agent": HEADERS["User-Agent"]
        }
      };
    }

    throw kino.error("not_found", "no_player", { 
      userMessage: "No se encontró el reproductor en esta página." 
    });
  } catch (error) {
    // Si ya es un error de Kino, lo dejamos pasar. Si no, lo convertimos.
    if (error.code) throw error;
    throw kino.error("unavailable", "resolve_error", { 
      userMessage: "No se pudo cargar el video. Revisa tu conexión." 
    });
  }
}
