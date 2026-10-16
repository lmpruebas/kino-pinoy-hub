/// <reference path="./sdk/kino.d.ts" />

const BASE_URL = "https://pinoymoviehubs.com";

export async function search(query) {
  // El primer await es kino.fetch, cumpliendo la regla de no lanzar errores antes de await.
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const response = await kino.fetch(searchUrl);
  const html = await response.text();
  
  const results = [];
  // Regex probada específicamente para la estructura HTML de este sitio
  const regex = /<a\s+href="(https?:\/\/pinoymoviehubs\.com\/movies\/[^"]+)"[^>]*>\s*<img\s+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push({
      id: match[1],
      // Limpiamos códigos HTML raros (como &#8217;) y etiquetas restantes
      title: match[3].replace(/&#\d+;/g, "").replace(/<[^>]+>/g, "").trim(),
      poster: match[2],
      url: match[1]
    });
  }

  // Límite de seguridad: Kino solo acepta máx. 100 resultados de búsqueda
  return results.slice(0, 100);
}

export async function resolve(id, item) {
  const url = id || item.url;
  
  // Usamos el navegador oculto porque el reproductor se inyecta con JavaScript (AJAX)
  // Esperamos a que la red esté tranquila ("networkidle") para asegurar que el iframe cargó.
  const page = await kino.browser.capture(url, {
    waitUntil: "networkidle",
    timeout: 15000 // 15 segundos máximo, dentro del límite de 20s de Kino
  });

  if (page.blocked) {
    throw kino.error("unavailable", "blocked", { 
      userMessage: "El sitio bloqueó el acceso automático. Intenta reproducir otro título." 
    });
  }

  // Buscamos el iframe que el JavaScript del sitio acaba de inyectar
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
