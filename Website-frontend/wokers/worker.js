/**
 * Wiki 后端 (支持标签、搜索、反爬)
 * 使用 KV 命名空间: DIARY_KV (请与您的 Cloudflare Worker 绑定名称保持一致)
 */

const KV_NAMESPACE = DIARY_KV; // 请确保此名称与您的 Worker 绑定一致

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

/* ================================
   全局配置 (反爬 & 限流)
================================ */
const RATE_LIMIT_WINDOW = 60;      // 60秒
const RATE_LIMIT_MAX = 60;         // 最多60次请求
const BOT_UA_BLACKLIST = [
  "curl", "wget", "python", "scrapy", "httpclient",
  "go-http-client", "java/", "okhttp",
  "bot", "spider", "crawler"
];

/* ================================
   主入口
================================ */
async function handleRequest(request) {
  // 预检请求
  if (request.method === "OPTIONS") {
    return buildResponse(null, 200);
  }

  // 反爬检查
  const anti = await antiCrawlerCheck(request);
  if (!anti.ok) {
    return buildResponse({ ok: false, error: anti.reason }, 403);
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 健康检查
  if (path === "/api/health") {
    return buildResponse({
      ok: true,
      service: "wiki",
      timestamp: new Date().toISOString()
    });
  }

  // 获取所有页面列表 (包含标签)
  if (path === "/api/wiki/list" && request.method === "GET") {
    return await handleList();
  }

  // 搜索接口 (按标题/内容关键词)
  if (path === "/api/wiki/search" && request.method === "GET") {
    return await handleSearch(url);
  }

  // 获取单篇文章
  const match = path.match(/^\/api\/wiki\/([^\/]+)$/);
  if (match && request.method === "GET") {
    return await handleGet(decodeURIComponent(match[1]));
  }

  // 保存文章 (支持标签)
  if (path === "/api/wiki/save" && request.method === "POST") {
    return await handleSave(request);
  }

  // 删除文章
  if (path === "/api/wiki/delete" && request.method === "POST") {
    return await handleDelete(request);
  }

  return buildResponse({ ok: false, error: "未知端点" }, 404);
}

/* ================================
   Wiki API 实现
================================ */

// 获取列表 (返回标题、slug、更新时间、标签)
async function handleList() {
  const list = await KV_NAMESPACE.list({ prefix: "wiki:" });
  const pages = [];

  for (const key of list.keys) {
    const page = await KV_NAMESPACE.get(key.name, "json");
    if (page) {
      pages.push({
        slug: page.slug,
        title: page.title,
        updatedAt: page.updatedAt,
        tags: page.tags || []          // 返回标签数组
      });
    }
  }

  pages.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return buildResponse({ ok: true, pages });
}

// 搜索 (大小写不敏感，匹配标题或内容)
async function handleSearch(url) {
  const query = url.searchParams.get("q") || "";
  if (!query.trim()) {
    return buildResponse({ ok: true, results: [] });
  }

  const list = await KV_NAMESPACE.list({ prefix: "wiki:" });
  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const key of list.keys) {
    const page = await KV_NAMESPACE.get(key.name, "json");
    if (!page) continue;

    const titleMatch = page.title.toLowerCase().includes(lowerQuery);
    const contentMatch = page.content.toLowerCase().includes(lowerQuery);

    if (titleMatch || contentMatch) {
      results.push({
        slug: page.slug,
        title: page.title,
        updatedAt: page.updatedAt,
        tags: page.tags || []
      });
    }
  }

  return buildResponse({ ok: true, results });
}

// 获取单篇
async function handleGet(slug) {
  const page = await KV_NAMESPACE.get(`wiki:${slug}`, "json");
  if (!page) {
    return buildResponse({ ok: false, error: "页面不存在" }, 404);
  }
  return buildResponse({ ok: true, page });
}

// 保存 (支持标签字段)
async function handleSave(request) {
  const data = await request.json();

  if (!data.slug || !data.title) {
    return buildResponse({ ok: false, error: "缺少 slug 或 title" }, 400);
  }

  const now = new Date().toISOString();

  const pageData = {
    slug: data.slug,
    title: data.title,
    content: data.content || "",
    tags: Array.isArray(data.tags) ? data.tags : [], // 存储标签
    createdAt: data.createdAt || now,
    updatedAt: now
  };

  await KV_NAMESPACE.put(
    `wiki:${data.slug}`,
    JSON.stringify(pageData)
  );

  return buildResponse({ ok: true, page: pageData });
}

// 删除
async function handleDelete(request) {
  const data = await request.json();
  if (!data.slug) {
    return buildResponse({ ok: false, error: "缺少 slug" }, 400);
  }
  await KV_NAMESPACE.delete(`wiki:${data.slug}`);
  return buildResponse({ ok: true });
}

/* ================================
   反爬 + 限流 (保持不变)
================================ */
async function antiCrawlerCheck(request) {
  const ua = request.headers.get("User-Agent") || "";
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  for (let bad of BOT_UA_BLACKLIST) {
    if (ua.toLowerCase().includes(bad)) {
      return { ok: false, reason: "UA 被禁止" };
    }
  }

  const rate = await rateLimit(ip);
  if (!rate.ok) {
    return { ok: false, reason: "请求过于频繁" };
  }

  return { ok: true };
}

async function rateLimit(ip) {
  const key = `ratelimit:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW;

  const raw = await KV_NAMESPACE.get(key, "json");

  if (!raw) {
    await KV_NAMESPACE.put(
      key,
      JSON.stringify({ count: 1, start: now }),
      { expirationTtl: RATE_LIMIT_WINDOW }
    );
    return { ok: true };
  }

  if (raw.start < windowStart) {
    await KV_NAMESPACE.put(
      key,
      JSON.stringify({ count: 1, start: now }),
      { expirationTtl: RATE_LIMIT_WINDOW }
    );
    return { ok: true };
  }

  if (raw.count >= RATE_LIMIT_MAX) {
    return { ok: false };
  }

  raw.count++;
  await KV_NAMESPACE.put(
    key,
    JSON.stringify(raw),
    { expirationTtl: RATE_LIMIT_WINDOW }
  );

  return { ok: true };
}

/* ================================
   响应构建 (CORS 支持)
================================ */
function buildResponse(data, status = 200) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (data === null) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(data), { status, headers });
}