// ============================================
// 私人日记 - 纯文字版 Cloudflare Worker 后端
// ============================================

// --- 反爬虫配置 ---
const ANTI_CRAWLER_CONFIG = {
  // 允许的浏览器User-Agent
  ALLOWED_USER_AGENTS: [
    'Mozilla/',
    'Chrome/',
    'Safari/',
    'Firefox/',
    'Edg/',
    'Opera/',
    'Trident/',
    'VIA',
    'bdbrowser',        // 百度浏览器桌面版
    'baidubrowser',     // 百度浏览器移动版
    'BaiduHD',          // 百度HD
    'Baidu',            // 百度相关
    'BaiduApp',         // 百度App
    'iPhone',           // iPhone自带浏览器
    'iPad',             // iPad自带浏览器
    'Android',          // Android浏览器
    'Mobile',           // 移动设备
    'MicroMessenger',   // 微信内置浏览器
    'QQBrowser',        // QQ浏览器
    'UCBrowser',        // UC浏览器
    'Quark',            // 夸克浏览器
    'SogouMobileBrowser', // 搜狗浏览器
    '2345Explorer',     // 2345浏览器
    'LieBaoFast',       // 猎豹浏览器
    'Maxthon',          // 傲游浏览器
    'Qiyu',             // 奇虎360浏览器
    'TheWorld',         // 世界之窗
    'XiaoMi/MiuiBrowser', // 小米浏览器
    'HuaweiBrowser',    // 华为浏览器
    'OPPOBrowser',      // OPPO浏览器
    'VivoBrowser',      // Vivo浏览器
    'SamsungBrowser'    // 三星浏览器
  ],
  
  // 已知爬虫User-Agent关键词
  BOT_USER_AGENTS: [
    'Googlebot',
    'Bingbot',
    'Slurp',
    'DuckDuckBot',
    'Baiduspider',
    'YandexBot',
    'Sogou',
    'Exabot',
    'facebot',
    'ia_archiver',
    'Alexa',
    'AhrefsBot',
    'MJ12bot',
    'SemrushBot',
    'rogerbot',
    'spbot',
    'crawler',
    'scanner',
    'curl',
    'wget',
    'python-requests',
    'python-urllib',
    'java',
    'node-fetch',
    'axios',
    'got',
    'php',
    'ruby',
    'go-http-client',
    'libwww-perl',
    'RestSharp',
    'HttpClient',
    'okhttp',
    'Paw/',
    'PostmanRuntime',
    'Apache-HttpClient',
    'Go-http-client',
    'Dalvik',           // Android模拟器
    'WinHttp',          // Windows HTTP客户端
    'Java/',            // Java HTTP客户端
    'python-urllib',
    'Ruby',
    'libcurl',
    'node-superagent',
    'requests',
    'axios',
    'fetch',
    'SuperAgent',
    'Scrapy'
  ],
  
  // JavaScript验证挑战
  JS_CHALLENGE: (request) => {
    const url = new URL(request.url);
    const randomA = Math.floor(Math.random() * 100) + 1;
    const randomB = Math.floor(Math.random() * 100) + 1;
    const verifyToken = Math.random().toString(36).substring(2, 15);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>正在验证浏览器 - LaomaSama</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .verify-box {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #764ba2;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .logo::before {
          content: "📖";
          font-size: 40px;
        }
        h1 {
          font-size: 24px;
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #764ba2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 30px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .browser-list {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .browser-tag {
          background: #f0f4ff;
          color: #667eea;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="verify-box">
        <div class="logo">私人日记</div>
        <h1>正在验证浏览器</h1>
        <p>我们正在检测您的浏览器环境以确保访问安全<br>这通常需要1-2秒钟</p>
        
        <div class="spinner"></div>
        
        <div class="browser-list">
          <span class="browser-tag">Chrome</span>
          <span class="browser-tag">Edge</span>
          <span class="browser-tag">Firefox</span>
          <span class="browser-tag">Safari</span>
          <span class="browser-tag">百度浏览器</span>
          <span class="browser-tag">VIA浏览器</span>
        </div>
      </div>
      
      <script>
        // 验证脚本 - 支持所有现代浏览器
        (function() {
          try {
            // 1. 设置验证cookie
            document.cookie = "human_verified=" + encodeURIComponent("${verifyToken}") + 
                             "; path=/; max-age=300; SameSite=Lax; Secure";
            
            // 2. 使用localStorage存储验证令牌
            localStorage.setItem('diary_verify_token', '${verifyToken}');
            localStorage.setItem('diary_verify_time', Date.now().toString());
            localStorage.setItem('diary_verify_calc', ${randomA} + ${randomB});
            
            // 3. 测试JavaScript功能
            const testFunctions = [
              typeof window !== 'undefined',
              typeof document !== 'undefined',
              typeof localStorage !== 'undefined',
              typeof setTimeout !== 'undefined',
              'cookieEnabled' in navigator ? navigator.cookieEnabled : true
            ];
            
            // 4. 记录浏览器信息（仅用于验证，不上传）
            const browserInfo = {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
              cookiesEnabled: navigator.cookieEnabled,
              jsEnabled: true,
              timestamp: Date.now()
            };
            
            localStorage.setItem('diary_browser_info', JSON.stringify(browserInfo));
            
            // 5. 延迟重定向（确保cookie已设置）
            setTimeout(function() {
              console.log('验证完成，重定向回原页面');
              // 清除可能存在的旧参数
              const currentUrl = "${url.pathname + url.search}";
              const cleanUrl = currentUrl.replace(/[?&]__verify=.*?(?=&|$)/, '');
              window.location.href = cleanUrl;
            }, 1500);
            
          } catch (error) {
            console.error('验证过程出错:', error);
            // 如果出错，3秒后重试
            setTimeout(function() {
              window.location.reload();
            }, 3000);
          }
        })();
      </script>
      
      <noscript>
        <style>
          .verify-box { animation: none; }
          .spinner { display: none; }
        </style>
        <div style="color: #e74c3c; background: #ffeaea; padding: 15px; border-radius: 10px; margin-top: 20px;">
          <strong>⚠️ JavaScript未启用</strong>
          <p>此网站需要JavaScript才能正常工作。请启用浏览器中的JavaScript功能，然后刷新页面。</p>
        </div>
      </noscript>
    </body>
    </html>
    `;
  },
  
  // 频率限制
  RATE_LIMIT: {
    WINDOW_MS: 60000,
    MAX_REQUESTS: 100
  }
};

// --- 辅助函数 ---
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
  
  const monthNum = date.getMonth() + 1;
  let season;
  if (monthNum === 12 || monthNum <= 2) season = '冬季';
  else if (monthNum >= 3 && monthNum <= 5) season = '春季';
  else if (monthNum >= 6 && monthNum <= 8) season = '夏季';
  else season = '秋季';
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds} · ${weekday} · ${season}`;
}

// --- 反爬虫检测 ---
function checkAntiCrawler(request) {
  const userAgent = (request.headers.get('User-Agent') || '').toLowerCase();
  const url = new URL(request.url);
  
  // 检查是否已经通过验证
  const cookies = request.headers.get('Cookie') || '';
  const isVerified = cookies.includes('human_verified=');
  
  // 检查是否是已知爬虫
  const isKnownBot = ANTI_CRAWLER_CONFIG.BOT_USER_AGENTS.some(bot => 
    userAgent.includes(bot.toLowerCase())
  );
  
  // 如果是已知爬虫，直接拒绝
  if (isKnownBot) {
    return { blocked: true, challenge: false };
  }
  
  // 检查是否为有效的浏览器
  let isValidBrowser = false;
  
  // 方法1：检查允许的浏览器列表
  for (const allowed of ANTI_CRAWLER_CONFIG.ALLOWED_USER_AGENTS) {
    if (userAgent.includes(allowed.toLowerCase())) {
      isValidBrowser = true;
      break;
    }
  }
  
  // 方法2：如果不在列表中，但看起来像浏览器，也允许
  if (!isValidBrowser) {
    // 常见浏览器特征
    const browserLikePatterns = [
      /mozilla\/[\d.]+/i,
      /applewebkit\/[\d.]+/i,
      /khtml/i,
      /gecko\/[\d.]+/i,
      /chrome\/[\d.]+/i,
      /safari\/[\d.]+/i,
      /firefox\/[\d.]+/i,
      /version\/[\d.]+/i,
      /mobile\/[\w]+/i,
      /android[\s\S]*chrome/i
    ];
    
    // 检查是否包含常见的浏览器特征
    const hasBrowserFeatures = browserLikePatterns.some(pattern => 
      pattern.test(request.headers.get('User-Agent') || '')
    );
    
    // 检查是否是移动设备
    const isMobileDevice = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    
    // 如果看起来像浏览器或是移动设备，且不是已知爬虫，允许通过
    if ((hasBrowserFeatures || isMobileDevice) && !isKnownBot) {
      isValidBrowser = true;
    }
  }
  
  // 如果不是有效浏览器且没有通过验证，显示验证挑战
  if (!isValidBrowser && !isVerified && !url.searchParams.has('__verify')) {
    return { blocked: true, challenge: true };
  }
  
  return { blocked: false, challenge: false };
}

// --- API 处理函数 ---
async function handlePublish(request, env) {
  try {
    const data = await request.json();
    
    // 验证必要字段
    if (!data.id || !data.title || !data.content) {
      return new Response(JSON.stringify({
        ok: false,
        error: '缺少必要字段: id, title, content'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 检查内容长度（防止过大）
    const maxSize = 1048576; // 1MB
    if (JSON.stringify(data).length > maxSize) {
      return new Response(JSON.stringify({
        ok: false,
        error: '内容太大，请减少文字量'
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const postData = {
      id: data.id,
      title: data.title,
      content: data.content,
      weather: data.weather || '',
      publishedAtISO: data.publishedAtISO || getCurrentTimestamp(),
      publishedReadable: data.publishedReadable || formatTimestamp(getCurrentTimestamp()),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    
    // 保存到 KV
    await env.POSTS_KV.put(`post:${data.id}`, JSON.stringify(postData));
    
    return new Response(JSON.stringify({
      ok: true,
      message: '发布成功',
      post: postData
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `发布失败: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetPosts(env) {
  try {
    const list = await env.POSTS_KV.list();
    const posts = [];
    
    for (const key of list.keys) {
      if (key.name.startsWith('post:')) {
        const post = await env.POSTS_KV.get(key.name, 'json');
        if (post) {
          posts.push(post);
        }
      }
    }
    
    // 按发布时间排序（最新的在前）
    posts.sort((a, b) => new Date(b.publishedAtISO) - new Date(a.publishedAtISO));
    
    return new Response(JSON.stringify({
      ok: true,
      posts: posts
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `获取文章失败: ${error.message}`,
      posts: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDeletePost(request, env) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return new Response(JSON.stringify({
        ok: false,
        error: '缺少文章ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const postKey = `post:${data.id}`;
    const post = await env.POSTS_KV.get(postKey, 'json');
    
    if (!post) {
      return new Response(JSON.stringify({
        ok: false,
        error: '文章不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 保存到垃圾桶
    const trashData = {
      ...post,
      deletedAt: getCurrentTimestamp(),
      deletedAtReadable: formatTimestamp(getCurrentTimestamp())
    };
    
    await env.TRASH_KV.put(`trash:${data.id}`, JSON.stringify(trashData));
    
    // 从文章列表中删除
    await env.POSTS_KV.delete(postKey);
    
    return new Response(JSON.stringify({
      ok: true,
      message: '已移动到垃圾桶'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `删除失败: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetTrash(env) {
  try {
    const list = await env.TRASH_KV.list();
    const trashItems = [];
    
    for (const key of list.keys) {
      if (key.name.startsWith('trash:')) {
        const item = await env.TRASH_KV.get(key.name, 'json');
        if (item) {
          trashItems.push(item);
        }
      }
    }
    
    // 按删除时间排序（最新的在前）
    trashItems.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    
    return new Response(JSON.stringify({
      ok: true,
      trash: trashItems
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `获取垃圾桶失败: ${error.message}`,
      trash: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleRestorePost(request, env) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return new Response(JSON.stringify({
        ok: false,
        error: '缺少文章ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const trashKey = `trash:${data.id}`;
    const trashItem = await env.TRASH_KV.get(trashKey, 'json');
    
    if (!trashItem) {
      return new Response(JSON.stringify({
        ok: false,
        error: '垃圾桶中找不到该文章'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 恢复文章（移除删除时间字段）
    const { deletedAt, deletedAtReadable, ...postData } = trashItem;
    postData.updatedAt = getCurrentTimestamp();
    
    await env.POSTS_KV.put(`post:${data.id}`, JSON.stringify(postData));
    
    // 从垃圾桶删除
    await env.TRASH_KV.delete(trashKey);
    
    return new Response(JSON.stringify({
      ok: true,
      message: '恢复成功'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `恢复失败: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDeletePermanent(request, env) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return new Response(JSON.stringify({
        ok: false,
        error: '缺少文章ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const trashKey = `trash:${data.id}`;
    const trashItem = await env.TRASH_KV.get(trashKey, 'json');
    
    if (!trashItem) {
      return new Response(JSON.stringify({
        ok: false,
        error: '垃圾桶中找不到该文章'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 从垃圾桶永久删除（纯文字版，没有图片需要清理）
    await env.TRASH_KV.delete(trashKey);
    
    return new Response(JSON.stringify({
      ok: true,
      message: '永久删除成功'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `永久删除失败: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleBackupDraft(request, env) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return new Response(JSON.stringify({
        ok: false,
        error: '缺少草稿ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const backupData = {
      ...data,
      backupAt: getCurrentTimestamp(),
      ttl: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
    };
    
    // 保存草稿备份（24小时自动过期）
    await env.POSTS_KV.put(`draft:${data.id}`, JSON.stringify(backupData), {
      expirationTtl: 86400 // 24小时
    });
    
    return new Response(JSON.stringify({
      ok: true,
      message: '草稿备份成功'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `草稿备份失败: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDeleteBackup(request, env) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return new Response(JSON.stringify({
        ok: false,
        error: '缺少草稿ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 删除草稿备份
    await env.POSTS_KV.delete(`draft:${data.id}`);
    
    return new Response(JSON.stringify({
      ok: true,
      message: '草稿备份已删除'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `删除备份失败: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleCleanupTrash(env) {
  try {
    const list = await env.TRASH_KV.list();
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const key of list.keys) {
      if (key.name.startsWith('trash:')) {
        const item = await env.TRASH_KV.get(key.name, 'json');
        if (item && item.deletedAt) {
          const deletedTime = new Date(item.deletedAt).getTime();
          // 超过24小时的删除
          if (now - deletedTime > 24 * 60 * 60 * 1000) {
            // 纯文字版，没有图片需要清理
            await env.TRASH_KV.delete(key.name);
            cleanedCount++;
          }
        }
      }
    }
    
    return new Response(JSON.stringify({
      ok: true,
      message: `清理完成，删除了 ${cleanedCount} 篇过期日记`,
      cleanedCount: cleanedCount
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: `清理失败: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --- 主请求处理器 ---
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 检查反爬虫
  const antiCrawlerResult = checkAntiCrawler(request);
  if (antiCrawlerResult.blocked) {
    if (antiCrawlerResult.challenge) {
      return new Response(ANTI_CRAWLER_CONFIG.JS_CHALLENGE(request), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } else {
      return new Response(JSON.stringify({
        ok: false,
        error: '访问被拒绝'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // 设置 CORS 头部（允许前端访问）
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  // API 路由处理
  switch (path) {
    case '/api/publish':
      if (request.method === 'POST') {
        return handlePublish(request, env);
      }
      break;
      
    case '/api/posts':
      if (request.method === 'GET') {
        return handleGetPosts(env);
      }
      break;
      
    case '/api/delete-post':
      if (request.method === 'POST') {
        return handleDeletePost(request, env);
      }
      break;
      
    case '/api/trash':
      if (request.method === 'GET') {
        return handleGetTrash(env);
      }
      break;
      
    case '/api/restore-post':
      if (request.method === 'POST') {
        return handleRestorePost(request, env);
      }
      break;
      
    case '/api/delete-permanent':
      if (request.method === 'POST') {
        return handleDeletePermanent(request, env);
      }
      break;
      
    case '/api/backup':
      if (request.method === 'POST') {
        return handleBackupDraft(request, env);
      }
      break;
      
    case '/api/delete-backup':
      if (request.method === 'POST') {
        return handleDeleteBackup(request, env);
      }
      break;
      
    case '/api/cleanup':
      if (request.method === 'POST') {
        return handleCleanupTrash(env);
      }
      break;
      
    case '/api/health':
      // 健康检查接口
      return new Response(JSON.stringify({
        ok: true,
        service: '私人日记',
        version: '1.0.0',
        timestamp: getCurrentTimestamp()
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
  }
  
  // 静态文件服务（提供前端页面）
  if (path === '/diary.html' || path === '/') {
    // 这里可以返回一个简单的前端页面
    // 或者让用户自己上传前端页面
    return new Response('请上传 diary.html 文件到静态文件托管服务', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // 404 处理
  return new Response(JSON.stringify({
    ok: false,
    error: 'API 端点不存在',
    path: path,
    method: request.method
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// --- Worker 入口点 ---
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, {
    POSTS_KV: POSTS_KV,
    TRASH_KV: TRASH_KV
  }));
});

// --- 定时任务处理器 ---
addEventListener('scheduled', event => {
  event.waitUntil(handleCleanupTrash({
    TRASH_KV: TRASH_KV
  }));
});