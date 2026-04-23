export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) });
    }

    if (request.method === "GET") {
      return jsonResponse(
        {
          ok: true,
          message: "TK content workbench GitHub data receiver is running.",
          targetRepo: env.GITHUB_REPO || "",
          targetBranch: env.GITHUB_BRANCH || "main",
          basePath: env.GITHUB_BASE_PATH || "submissions"
        },
        200,
        request,
        env
      );
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, request, env);
    }

    try {
      validateEnv(env);
      validateSecret(request, env);

      const payload = await request.json();
      const snapshot = payload?.data || {};
      const actor = sanitizeSegment(payload?.actor || "anonymous-user");
      const note = String(payload?.note || "").trim();
      const submittedAt = String(payload?.submittedAt || new Date().toISOString()).trim();
      const dayPath = submittedAt.slice(0, 10) || new Date().toISOString().slice(0, 10);
      const uniqueId = `${submittedAt.replace(/[:.]/g, "-")}-${actor}-${crypto.randomUUID().slice(0, 8)}`;
      const basePath = joinPath(env.GITHUB_BASE_PATH || "submissions", dayPath, uniqueId);

      const customProducts = snapshot?.customProducts && typeof snapshot.customProducts === "object" ? snapshot.customProducts : {};
      const generationHistory = Array.isArray(snapshot?.generationHistory) ? snapshot.generationHistory : [];
      const savedImageLibrary = Array.isArray(snapshot?.savedImageLibrary) ? snapshot.savedImageLibrary : [];

      const files = [];
      files.push({
        path: joinPath(basePath, "submission.json"),
        contentBase64: utf8ToBase64(JSON.stringify(payload, null, 2)),
        message: `chore: save submission ${uniqueId}`
      });
      files.push({
        path: joinPath(basePath, "custom-products.json"),
        contentBase64: utf8ToBase64(JSON.stringify(customProducts, null, 2)),
        message: `chore: save custom products ${uniqueId}`
      });
      files.push({
        path: joinPath(basePath, "generation-history.json"),
        contentBase64: utf8ToBase64(JSON.stringify(generationHistory, null, 2)),
        message: `chore: save generation history ${uniqueId}`
      });
      files.push({
        path: joinPath(basePath, "saved-image-library.json"),
        contentBase64: utf8ToBase64(JSON.stringify(savedImageLibrary, null, 2)),
        message: `chore: save image library ${uniqueId}`
      });

      collectDataUrlFiles(customProducts, joinPath(basePath, "custom-product-images"), files, "custom product image");
      collectSavedImages(savedImageLibrary, joinPath(basePath, "saved-images"), files);

      const manifest = {
        source: "tk-content-workbench",
        submittedAt,
        actor,
        note,
        customProductCount: Object.keys(customProducts).length,
        generationHistoryCount: generationHistory.length,
        savedImageCount: savedImageLibrary.length,
        fileCount: files.length,
        basePath
      };
      files.push({
        path: joinPath(basePath, "manifest.json"),
        contentBase64: utf8ToBase64(JSON.stringify(manifest, null, 2)),
        message: `chore: save manifest ${uniqueId}`
      });

      for (const file of files) {
        await createGitHubFile(env, file);
      }

      return jsonResponse(
        {
          ok: true,
          repo: env.GITHUB_REPO,
          branch: env.GITHUB_BRANCH || "main",
          basePath,
          customProductCount: Object.keys(customProducts).length,
          generationHistoryCount: generationHistory.length,
          savedImageCount: savedImageLibrary.length,
          uploadedFileCount: files.length
        },
        200,
        request,
        env
      );
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        },
        400,
        request,
        env
      );
    }
  }
};

function validateEnv(env) {
  if (!env.GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");
  if (!env.GITHUB_REPO) throw new Error("Missing GITHUB_REPO");
}

function validateSecret(request, env) {
  if (!env.SYNC_SECRET) return;
  const provided = request.headers.get("X-Owner-Sync-Key") || "";
  if (provided !== env.SYNC_SECRET) {
    throw new Error("Invalid sync secret");
  }
}

function buildCorsHeaders(request, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Owner-Sync-Key",
    "Access-Control-Max-Age": "86400"
  };
}

function jsonResponse(payload, status, request, env) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(request, env)
    }
  });
}

function sanitizeSegment(value) {
  return String(value || "item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function joinPath(...parts) {
  return parts
    .filter(Boolean)
    .map((item) => String(item).replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function collectDataUrlFiles(customProducts, basePath, files, messagePrefix) {
  Object.entries(customProducts).forEach(([productId, product]) => {
    const images = Array.isArray(product?.referenceImages) ? product.referenceImages : [];
    images.forEach((image, index) => {
      const dataUrl = String(image?.dataUrl || image?.aiUrl || "").trim();
      if (!dataUrl.startsWith("data:")) return;
      const parsed = parseDataUrl(dataUrl);
      files.push({
        path: joinPath(basePath, sanitizeSegment(productId), `${index + 1}.${parsed.extension}`),
        contentBase64: parsed.contentBase64,
        message: `chore: save ${messagePrefix} ${sanitizeSegment(productId)}`
      });
    });
  });
}

function collectSavedImages(savedImageLibrary, basePath, files) {
  savedImageLibrary.forEach((image, index) => {
    const dataUrl = String(image?.dataUrl || "").trim();
    if (!dataUrl.startsWith("data:")) return;
    const parsed = parseDataUrl(dataUrl);
    const productId = sanitizeSegment(image?.productId || `image-${index + 1}`);
    files.push({
      path: joinPath(basePath, productId, `${index + 1}.${parsed.extension}`),
      contentBase64: parsed.contentBase64,
      message: `chore: save generated image ${productId}`
    });
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Unsupported data URL");
  }
  return {
    mimeType: match[1],
    contentBase64: match[2],
    extension: mimeToExtension(match[1])
  };
}

function mimeToExtension(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("jpeg")) return "jpg";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("svg")) return "svg";
  return "png";
}

async function createGitHubFile(env, file) {
  const branch = env.GITHUB_BRANCH || "main";
  const endpoint = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(file.path).replace(/%2F/g, "/")}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: file.message,
      branch,
      content: file.contentBase64
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub upload failed for ${file.path}: ${text}`);
  }
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
