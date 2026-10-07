// Worker de EGPAIS — Cartas de Intención (Parques Industriales)
// Patrón "GitHub como base de datos": el navegador nunca ve el token de
// GitHub. Solo habla con este Worker; el token vive como secret acá.

const OWNER = "joaqu-coder";
const REPO = "Parques-Industriales";
const ARCHIVO = "datos.json";
const RAMA = "main";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        tiene_github_token: !!env.GITHUB_TOKEN,
        tiene_assets: !!env.ASSETS
      });
    }

    if (url.pathname === "/api/sync") {
      if (!env.GITHUB_TOKEN) {
        return json({ error: "GITHUB_TOKEN no configurado" }, 500);
      }

      if (request.method === "GET") {
        try {
          const { datos } = await githubGetFile(env.GITHUB_TOKEN);
          return json(datos || { expedientes: [], plazoDias: 90 });
        } catch (err) {
          return json({ error: String(err) }, 502);
        }
      }

      if (request.method === "POST") {
        try {
          const nuevosDatos = await request.json();
          const { sha } = await githubGetFile(env.GITHUB_TOKEN);
          await githubPutFile(env.GITHUB_TOKEN, nuevosDatos, sha);
          return json({ ok: true });
        } catch (err) {
          return json({ error: String(err) }, 502);
        }
      }

      return new Response("Method not allowed", { status: 405 });
    }

    // Todo lo que no sea /api/* lo sirve la PWA estática (public/).
    return env.ASSETS.fetch(request);
  }
};

async function githubGetFile(token) {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARCHIVO}?ref=${RAMA}`,
    {
      headers: {
        "Authorization": `token ${token}`,
        "User-Agent": "egpais-cartas-intencion-worker",
        "Accept": "application/vnd.github+json"
      }
    }
  );
  if (resp.status === 404) return { sha: null, datos: null };
  if (!resp.ok) throw new Error(`GitHub GET falló: ${resp.status}`);
  const file = await resp.json();
  // UTF-8 en base64: atob/btoa solos rompen tildes/ñ. No simplificar esto.
  const contenido = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ""))));
  return { sha: file.sha, datos: JSON.parse(contenido) };
}

async function githubPutFile(token, datos, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(datos, null, 2))));
  const payload = {
    message: `sync: datos ${new Date().toISOString()}`,
    content,
    branch: RAMA
  };
  if (sha) payload.sha = sha; // sin sha, GitHub lo toma como archivo nuevo

  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARCHIVO}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "User-Agent": "egpais-cartas-intencion-worker",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  if (!resp.ok) throw new Error(`GitHub PUT falló: ${resp.status}`);
  return resp.json();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
