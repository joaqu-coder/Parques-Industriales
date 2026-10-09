// Worker de EGPAIS — Cartas de Intención (Parques Industriales)
// Patrón "GitHub como base de datos": el navegador nunca ve el token de
// GitHub. Solo habla con este Worker; el token vive como secret acá.

const OWNER = "joaqu-coder";
const REPO = "Parques-Industriales";
const ARCHIVO = "datos.json";
const DATOS_VACIOS = { expedientes: [], plazoDias: 90 };

// La rama donde vive datos.json.
//
// Acá estuvo el bug que dejó el sync roto en silencio: estaba hardcodeado
// "main" y este repo nunca tuvo una rama con ese nombre. El GET devolvía 404,
// el 404 se interpretaba como "el archivo todavía no existe" y /api/sync
// contestaba 200 con la lista vacía. Todo parecía sano y nada funcionaba.
//
// Ahora: si está la variable de entorno GITHUB_RAMA se usa esa (y se verifica
// que exista); si no, se resuelve la rama por defecto del repo contra la API.
// Nunca más un nombre de rama adivinado.
let ramaCache = null;

function headers(token, extra) {
  const h = {
    "Authorization": `Bearer ${token}`,
    "User-Agent": "egpais-cartas-intencion-worker",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  return extra ? Object.assign(h, extra) : h;
}

// Convierte una respuesta de error de GitHub en algo que se pueda leer y
// accionar. Antes se tiraba `GitHub GET falló: 404` y ese 404 podía ser
// cualquiera de cuatro causas distintas.
async function errorGitHub(resp, contexto) {
  let detalle = "";
  try {
    const cuerpo = await resp.json();
    detalle = cuerpo && cuerpo.message ? cuerpo.message : "";
  } catch (e) { /* respuesta sin JSON */ }

  let hint = "";
  if (resp.status === 401) {
    hint = "GITHUB_TOKEN inválido o expirado. Regeneralo y volvé a cargarlo en Settings → Runtime variables and secrets.";
  } else if (resp.status === 403) {
    hint = resp.headers.get("x-ratelimit-remaining") === "0"
      ? "Rate limit de la API de GitHub agotado. Reintentá en unos minutos."
      : "El token no tiene permiso de Contents: Read & write sobre este repo.";
  } else if (resp.status === 404) {
    hint = "El repo no existe o el token no tiene acceso. GitHub devuelve 404 (no 403) cuando a un token le falta acceso a un repo privado, así que revisá los permisos del token además del nombre del repo.";
  } else if (resp.status === 409) {
    hint = "Conflicto de sha: alguien más escribió datos.json entre el GET y el PUT.";
  } else if (resp.status === 422) {
    hint = "GitHub rechazó el contenido o la rama del PUT.";
  }

  const err = new Error(
    `${contexto}: GitHub respondió ${resp.status}` +
    (detalle ? ` — ${detalle}` : "") +
    (hint ? ` | ${hint}` : "")
  );
  err.status = resp.status;
  return err;
}

async function resolverRama(token, env) {
  if (env.GITHUB_RAMA) {
    if (ramaCache === env.GITHUB_RAMA) return ramaCache;
    const resp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/branches/${encodeURIComponent(env.GITHUB_RAMA)}`,
      { headers: headers(token) }
    );
    if (resp.status === 404) {
      throw new Error(
        `La rama "${env.GITHUB_RAMA}" (variable GITHUB_RAMA) no existe en ${OWNER}/${REPO}. ` +
        `Creala en GitHub o corregí la variable.`
      );
    }
    if (!resp.ok) throw await errorGitHub(resp, `No se pudo verificar la rama "${env.GITHUB_RAMA}"`);
    ramaCache = env.GITHUB_RAMA;
    return ramaCache;
  }

  if (ramaCache) return ramaCache;
  const resp = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, { headers: headers(token) });
  if (!resp.ok) throw await errorGitHub(resp, "No se pudo resolver la rama por defecto del repo");
  const repo = await resp.json();
  if (!repo.default_branch) throw new Error("La API de GitHub no devolvió default_branch para el repo.");
  ramaCache = repo.default_branch;
  return ramaCache;
}

// Valida la forma de lo que se va a escribir. Sin esto, un POST con cualquier
// JSON sobreescribía datos.json entero con basura.
function validarDatos(datos) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    return "El cuerpo debe ser un objeto JSON.";
  }
  if (!Array.isArray(datos.expedientes)) {
    return "Falta el array 'expedientes'.";
  }
  if (datos.expedientes.some((e) => e === null || typeof e !== "object" || Array.isArray(e))) {
    return "Cada expediente debe ser un objeto.";
  }
  if (datos.plazoDias != null) {
    const p = Number(datos.plazoDias);
    if (!Number.isFinite(p) || p < 1 || p > 3650) {
      return "'plazoDias' debe ser un número entre 1 y 3650.";
    }
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json(await health(env));
    }

    if (url.pathname === "/api/sync") {
      if (!env.GITHUB_TOKEN) {
        return json({
          error: "GITHUB_TOKEN no configurado",
          hint: "Cargalo en el dashboard de Cloudflare → tu Worker → Settings → Runtime variables and secrets (NO en Builds), y volvé a deployar."
        }, 500);
      }

      if (request.method === "GET") {
        try {
          const rama = await resolverRama(env.GITHUB_TOKEN, env);
          const { datos, existe } = await githubGetFile(env.GITHUB_TOKEN, rama);
          return json(existe ? datos : DATOS_VACIOS);
        } catch (err) {
          return json({ error: "No se pudo leer datos.json", detalle: String(err.message || err) }, 502);
        }
      }

      if (request.method === "POST") {
        let nuevosDatos;
        try {
          nuevosDatos = await request.json();
        } catch (err) {
          return json({ error: "Cuerpo JSON inválido", detalle: String(err.message || err) }, 400);
        }
        const problema = validarDatos(nuevosDatos);
        if (problema) {
          return json({ error: "Datos rechazados", detalle: problema }, 422);
        }
        try {
          const rama = await resolverRama(env.GITHUB_TOKEN, env);
          const { sha } = await githubGetFile(env.GITHUB_TOKEN, rama);
          const res = await githubPutFile(env.GITHUB_TOKEN, rama, nuevosDatos, sha);
          return json({ ok: true, rama, commit: res.commit ? res.commit.sha : null });
        } catch (err) {
          return json({ error: "No se pudo escribir datos.json", detalle: String(err.message || err) }, 502);
        }
      }

      return json({ error: "Método no permitido" }, 405);
    }

    // Cualquier otra ruta /api/* es un error nuestro, no un path de la PWA.
    // Antes caía al handler de assets y, con not_found_handling =
    // single-page-application, devolvía index.html con 200.
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return json({ error: "Ruta de API desconocida", ruta: url.pathname }, 404);
    }

    if (!env.ASSETS) {
      return json({
        error: "El binding ASSETS no está disponible",
        hint: "Revisá [assets] en wrangler.toml. Mover ese bloque a [env.production] rompe el binding si el deploy corre sin --env."
      }, 500);
    }
    return env.ASSETS.fetch(request);
  }
};

// /api/health ahora prueba GitHub de verdad. Antes solo decía si el secret
// estaba presente, y por eso un sync 100% roto se reportaba como sano.
async function health(env) {
  const base = {
    ok: true,
    tiene_github_token: !!env.GITHUB_TOKEN,
    tiene_assets: !!env.ASSETS,
    rama_configurada: env.GITHUB_RAMA || null
  };
  if (!env.GITHUB_TOKEN) {
    return Object.assign(base, {
      ok: false,
      github: "sin probar",
      detalle: "GITHUB_TOKEN no configurado"
    });
  }
  try {
    const rama = await resolverRama(env.GITHUB_TOKEN, env);
    const { existe, cantidad } = await githubGetFile(env.GITHUB_TOKEN, rama);
    return Object.assign(base, {
      github: "ok",
      rama_en_uso: rama,
      datos_json: existe ? "presente" : "todavía no creado",
      expedientes: existe ? cantidad : 0
    });
  } catch (err) {
    return Object.assign(base, {
      ok: false,
      github: "error",
      detalle: String(err.message || err)
    });
  }
}

async function githubGetFile(token, rama) {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARCHIVO}?ref=${encodeURIComponent(rama)}`,
    { headers: headers(token) }
  );
  // La rama ya fue verificada en resolverRama, así que un 404 acá solo puede
  // significar que datos.json todavía no fue creado. Ese es el único 404
  // legítimo del flujo.
  if (resp.status === 404) return { sha: null, datos: null, existe: false, cantidad: 0 };
  if (!resp.ok) throw await errorGitHub(resp, `No se pudo leer ${ARCHIVO} en la rama "${rama}"`);

  const file = await resp.json();
  // UTF-8 en base64: atob/btoa solos rompen tildes/ñ. No simplificar esto.
  const contenido = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ""))));
  let datos;
  try {
    datos = JSON.parse(contenido);
  } catch (err) {
    throw new Error(
      `${ARCHIVO} en la rama "${rama}" no es JSON válido: ${err.message}. ` +
      `Arreglalo en GitHub antes de seguir; el Worker no lo sobreescribe a ciegas.`
    );
  }
  const cantidad = datos && Array.isArray(datos.expedientes) ? datos.expedientes.length : 0;
  return { sha: file.sha, datos, existe: true, cantidad };
}

async function githubPutFile(token, rama, datos, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(datos, null, 2))));
  const payload = {
    message: `sync: datos ${new Date().toISOString()} [skip ci]`,
    content,
    branch: rama
  };
  if (sha) payload.sha = sha; // sin sha, GitHub lo toma como archivo nuevo

  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARCHIVO}`,
    {
      method: "PUT",
      headers: headers(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload)
    }
  );
  if (!resp.ok) throw await errorGitHub(resp, `No se pudo escribir ${ARCHIVO} en la rama "${rama}"`);
  return resp.json();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
