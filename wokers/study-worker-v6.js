// ==================== 中考备战激励系统 V7.0 · Worker核心 ====================
// 重构：商店统一购买抽卡券（消耗 STUD），单卡池抽卡，保底机制继承
// N卡池新增零食（魔芋爽/薯片/素牛肉）
// 小STUD 10~80 反比分布，占比35% (N卡池第一)
// ========================================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    let response;
    try {
      if (path === '/api/status') response = await handleStatus(env);
      else if (path === '/api/buyBox') response = await handleBuyBox(request, env);
      else if (path === '/api/gacha') response = await handleGacha(request, env);
      else if (path === '/api/use') response = await handleUse(request, env);
      else if (path === '/api/check') response = await handleCheck(request, env);
      else if (path === '/api/claim') response = await handleClaim(env);
      else if (path === '/api/setWish') response = await handleSetWish(request, env);
      else if (path === '/api/resetWeek') response = await handleResetWeek(env);
      else if (path === '/api/newWeek') response = await handleNewWeek(env);
      else response = new Response('Not Found', { status: 404 });
    } catch (e) {
      response = json({ error: e.message }, 500);
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }
};

// ==================== 工具函数 ====================
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
const rand = () => Math.random();

// ==================== 状态管理（含旧数据迁移）====================
async function getState(env) {
  const raw = await env.STUDY_KV.get('state');
  if (raw) {
    const state = JSON.parse(raw);
    // ----- 数据迁移：旧版带等级的抽卡券合并为无等级通用券 -----
    let totalTickets = 0;
    const newInventory = [];
    for (const item of state.inventory || []) {
      if (item.type === 'gacha_ticket' && item.level !== undefined) {
        totalTickets += (item.amount || 1);
      } else {
        newInventory.push(item);
      }
    }
    if (totalTickets > 0) {
      newInventory.push({ type: 'gacha_ticket', amount: totalTickets });
    }
    state.inventory = newInventory;
    // -------------------------------------------------
    return state;
  }
  const init = {
    stud: 0,
    reserve: 150,
    flow: 0,
    rPity: 0,
    ssrPity: 0,
    ssrBigPity: false,
    wish: null,
    flyCD: 0,
    inventory: [],
    week: 1,
    weekStart: Date.now(),
    weeklyClaimed: false,
    dailyCompleted: [],
    poolCompleted: [],
  };
  await save(env, init);
  return init;
}
async function save(env, state) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  state.dailyCompleted = state.dailyCompleted.filter(d => new Date(d.date).getTime() > sevenDaysAgo);
  await env.STUDY_KV.put('state', JSON.stringify(state));
}

// ==================== 背包堆叠添加/移除 ====================
function addToInventory(state, item) {
  const idx = state.inventory.findIndex(i => {
    if (i.type !== item.type) return false;
    if (i.type === 'drink') return i.subtype === item.subtype;
    if (i.type === 'coffee') return i.subtype === item.subtype;
    if (i.type === 'snack') return i.subtype === item.subtype;
    if (i.type === 'food') {
      return i.brand === item.brand && i.meal === item.meal && i.isDouble === item.isDouble && i.extraMeal === item.extraMeal;
    }
    if (['fly', 'parent_pay', 'unlock_small', 'unlock_big', 'super_stud', 'gacha_ticket'].includes(i.type)) return true;
    return false;
  });
  if (idx !== -1) {
    state.inventory[idx].amount = (state.inventory[idx].amount || 1) + (item.amount || 1);
  } else {
    state.inventory.push({ ...item, amount: item.amount || 1 });
  }
}
function removeFromInventory(state, predicate) {
  const idx = state.inventory.findIndex(predicate);
  if (idx === -1) return false;
  if (state.inventory[idx].amount > 1) {
    state.inventory[idx].amount -= 1;
  } else {
    state.inventory.splice(idx, 1);
  }
  return true;
}

// ==================== 统一抽卡核心（单抽）====================
// 卡池判定 + 物品抽取 + 保底更新 + 递归/双卡由外部处理
async function drawUnified(state, updatePity = true) {
  // ----- 1. 卡池判定（基于保底与概率）-----
  let ssrChance = 0.05;
  if (state.ssrPity >= 14) {
    ssrChance = 0.05 + (state.ssrPity - 13) * 0.05;
  }
  if (state.ssrPity >= 19) ssrChance = 1.0;

  let rGuaranteed = false;
  if (state.rPity >= 4 && updatePity) {
    rGuaranteed = true;
  }

  let pool; // 'N', 'R', 'SSR'
  const r = rand();
  if (r < ssrChance || state.ssrPity >= 19) {
    pool = 'SSR';
  } else if (rGuaranteed) {
    pool = 'R';
  } else {
    // 非保底时：R 概率 = ssrChance + 0.25，其余 N（与原drawOne一致）
    if (r < ssrChance + 0.25) pool = 'R';
    else pool = 'N';
  }

  // ----- 2. 更新保底（如果 updatePity=true）-----
  if (updatePity) {
    if (pool === 'R' || pool === 'SSR') {
      state.rPity = 0;
    } else {
      state.rPity += 1;
    }
    if (pool === 'SSR') {
      state.ssrPity = 0;
    } else {
      state.ssrPity += 1;
    }
  }

  // ----- 3. 从对应卡池抽取物品（递归由内部处理）-----
  let result;
  if (pool === 'N') result = await drawFromNPool(state);
  else if (pool === 'R') result = drawFromRPool(state);
  else if (pool === 'SSR') result = drawFromSSRPool(state);

  return [result]; // 统一返回数组，便于双卡/递归合并
}

// ---------- N卡池物品抽取（含小STUD反比、零食、递归）----------
async function drawFromNPool(state) {
  const r = rand();
  // 概率分布：小STUD 35% | 饮料20% | 零食15% | 小解锁券12% | 起飞8% | 递归10%
  if (r < 0.35) {
    // 小STUD 10~80 反比分布
    const value = weightedStud();
    state.stud += value;
    return { rarity: 'N', type: 'stud_small', amount: value };
  } else if (r < 0.55) { // 35+20
    const sub = ['可乐','冰红茶','青苹果芬达'][Math.floor(rand()*3)];
    addToInventory(state, { type: 'drink', subtype: sub });
    return { rarity: 'N', type: 'drink', subtype: sub };
  } else if (r < 0.70) { // 55+15
    const snackList = ['魔芋爽', '薯片', '素牛肉'];
    const sub = snackList[Math.floor(rand()*3)];
    addToInventory(state, { type: 'snack', subtype: sub });
    return { rarity: 'N', type: 'snack', subtype: sub };
  } else if (r < 0.82) { // 70+12
    const amt = [2,3,4,5][Math.floor(rand()*4)];
    addToInventory(state, { type: 'unlock_small', amount: amt });
    return { rarity: 'N', type: 'unlock_small', amount: amt };
  } else if (r < 0.90) { // 82+8
    const now = Date.now();
    if (now < state.flyCD) {
      state.stud += 20;
      return { rarity: 'N', type: 'fly_convert', amount: 20 };
    } else {
      addToInventory(state, { type: 'fly' });
      return { rarity: 'N', type: 'fly' };
    }
  } else {
    // 递归抽卡（不更新保底、不消耗券）
    const recursiveResult = await drawUnified(state, false);
    recursiveResult.forEach(r => r.fromExchange = true);
    return recursiveResult[0]; // 递归只可能返回一个物品
  }
}

// 小STUD反比分布权重计算 (10~80, 权重=1/value)
function weightedStud() {
  const values = [];
  const weights = [];
  for (let v = 10; v <= 80; v++) {
    values.push(v);
    weights.push(1 / v);
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = rand() * totalWeight;
  for (let i = 0; i < values.length; i++) {
    if (r < weights[i]) return values[i];
    r -= weights[i];
  }
  return 80; // fallback
}

// ---------- R卡池物品抽取 ----------
function drawFromRPool(state) {
  const r = rand();
  if (r < 0.32) {
    const subRand = rand();
    let sub;
    if (subRand < 0.60) sub = '瓶装咖啡';
    else if (subRand < 0.85) sub = '瑞幸';
    else sub = '星巴克';
    addToInventory(state, { type: 'coffee', subtype: sub });
    return { rarity: 'R', type: 'coffee', subtype: sub };
  } else if (r < 0.62) { // 32+30
    const amt = [10,12,15,18,20][Math.floor(rand()*5)];
    addToInventory(state, { type: 'unlock_big', amount: amt });
    return { rarity: 'R', type: 'unlock_big', amount: amt };
  } else {
    const brand = rand()<0.5 ? '肯德基' : '塔斯汀';
    const meals = ['汉堡','炸鸡','薯条'];
    const meal1 = meals[Math.floor(rand()*3)];
    const isDouble = rand() < 0.05;
    if (isDouble) {
      let meal2 = meals[Math.floor(rand()*3)];
      if (rand()<0.8) while (meal2 === meal1) meal2 = meals[Math.floor(rand()*3)];
      addToInventory(state, { type: 'food', brand, meal: meal1, isDouble: true, extraMeal: meal2 });
      return { rarity: 'R', type: 'food_double', brand, meal: meal1, extraMeal: meal2 };
    } else {
      addToInventory(state, { type: 'food', brand, meal: meal1, isDouble: false });
      return { rarity: 'R', type: 'food', brand, meal: meal1 };
    }
  }
}

// ---------- SSR卡池物品抽取（含心愿单/大保底）----------
function drawFromSSRPool(state) {
  let r = rand();
  let result;
  if (r < 0.5) result = 'parent_pay';
  else if (r < 0.8) result = 'unlock_all';
  else result = 'super_stud';

  // 心愿单 & 大保底逻辑
  if (state.wish) {
    if (state.ssrBigPity) {
      result = state.wish;
      state.ssrBigPity = false;
    } else if (result !== state.wish) {
      state.ssrBigPity = true;
    }
  }

  if (result === 'parent_pay') {
    addToInventory(state, { type: 'parent_pay', amount: 200 });
    return { rarity: 'SSR', type: 'parent_pay', amount: 200 };
  }
  if (result === 'unlock_all') {
    state.flow += state.reserve;
    state.reserve = 0;
    return { rarity: 'SSR', type: 'unlock_all' };
  }
  if (result === 'super_stud') {
    addToInventory(state, { type: 'super_stud', amount: 500 });
    return { rarity: 'SSR', type: 'super_stud', amount: 500 };
  }
}

// ==================== 商店：购买抽卡礼盒（消耗 STUD）====================
async function handleBuyBox(request, env) {
  const state = await getState(env);
  const body = await request.json();
  const count = body.count || 1;
  const cost = 150 * count;
  if (state.stud < cost) {
    return json({ error: `STUD不足，需要 ${cost} STUD` }, 400);
  }
  state.stud -= cost;
  addToInventory(state, { type: 'gacha_ticket', amount: count });
  await save(env, state);
  return json({
    tickets: [{ name: '抽卡券', count }],
    stud: state.stud,
    reserve: state.reserve,
    flow: state.flow
  });
}

// ==================== 抽卡：消耗抽卡券，保底正常更新 ====================
async function handleGacha(request, env) {
  const state = await getState(env);
  // 从背包移除一张抽卡券
  const removed = removeFromInventory(state, i => i.type === 'gacha_ticket');
  if (!removed) return json({ error: '抽卡券不足' }, 400);

  let results = [];
  // 正常抽卡（更新保底）
  results.push(...await drawUnified(state, true));

  // 5% 双卡：再抽一次（不更新保底、不耗券）
  if (rand() < 0.05) {
    const extra = await drawUnified(state, false);
    extra.forEach(r => r.fromDouble = true);
    results.push(...extra);
  }

  await save(env, state);
  return json({ results, state: { stud: state.stud, reserve: state.reserve, flow: state.flow } });
}

// ==================== 接口1: 状态查询 ====================
async function handleStatus(env) {
  const state = await getState(env);
  const today = new Date().toDateString();
  const dailyToday = state.dailyCompleted.filter(d => d.date === today);
  return json({
    stud: state.stud,
    reserve: state.reserve,
    flow: state.flow,
    rPity: state.rPity,
    ssrPity: state.ssrPity,
    ssrBigPity: state.ssrBigPity,
    wish: state.wish,
    flyCD: state.flyCD,
    inventory: state.inventory,
    week: state.week,
    weeklyClaimed: state.weeklyClaimed,
    dailyCompleted: dailyToday,
    poolCompleted: state.poolCompleted,
  });
}

// ==================== 接口3: 使用道具 ====================
async function handleUse(request, env) {
  const state = await getState(env);
  const body = await request.json();
  const { type, subtype, brand, meal, isDouble, extraMeal } = body;
  let used = false;
  let amount = 0;

  if (type === 'fly') {
    used = removeFromInventory(state, i => i.type === 'fly');
    if (used) state.flyCD = Date.now() + 48*60*60*1000;
  }
  else if (type === 'drink' && subtype) {
    used = removeFromInventory(state, i => i.type === 'drink' && i.subtype === subtype);
  }
  else if (type === 'coffee' && subtype) {
    used = removeFromInventory(state, i => i.type === 'coffee' && i.subtype === subtype);
  }
  else if (type === 'snack' && subtype) {
    // 零食使用效果：魔芋爽+10，薯片+8，素牛肉+15
    used = removeFromInventory(state, i => i.type === 'snack' && i.subtype === subtype);
    if (used) {
      if (subtype === '魔芋爽') state.stud += 10;
      else if (subtype === '薯片') state.stud += 8;
      else if (subtype === '素牛肉') state.stud += 15;
    }
  }
  else if (type === 'food') {
    used = removeFromInventory(state, i => i.type === 'food' && i.brand === brand && i.meal === meal && i.isDouble === !!isDouble);
  }
  else if (type === 'parent_pay') {
    used = removeFromInventory(state, i => i.type === 'parent_pay');
    if (used) state.reserve += 200;
  }
  else if (type === 'unlock_small') {
    const item = state.inventory.find(i => i.type === 'unlock_small');
    if (item) {
      amount = item.amount;
      used = removeFromInventory(state, i => i.type === 'unlock_small');
      if (used) state.flow += amount;
    }
  }
  else if (type === 'unlock_big') {
    const item = state.inventory.find(i => i.type === 'unlock_big');
    if (item) {
      amount = item.amount;
      used = removeFromInventory(state, i => i.type === 'unlock_big');
      if (used) state.flow += amount;
    }
  }
  else if (type === 'super_stud') {
    const item = state.inventory.find(i => i.type === 'super_stud');
    if (item) {
      amount = item.amount;
      used = removeFromInventory(state, i => i.type === 'super_stud');
      if (used) state.stud += amount;
    }
  }

  if (!used) return json({ error: '道具不存在或数量不足' }, 400);
  await save(env, state);
  return json(state);
}

// ==================== 接口4: 任务打卡 ====================
async function handleCheck(request, env) {
  const state = await getState(env);
  const body = await request.json();
  const { taskId, type, reward } = body;
  const today = new Date().toDateString();

  if (type === 'daily') {
    if (state.dailyCompleted.some(d => d.date === today && d.id === taskId)) {
      return json({ error: '今日该任务已完成' }, 400);
    }
    state.dailyCompleted.push({ date: today, id: taskId });
    if (reward) state.stud += reward;
  } else if (type === 'pool') {
    if (state.poolCompleted.includes(taskId)) {
      return json({ error: '该选做任务已完成' }, 400);
    }
    state.poolCompleted.push(taskId);
    if (reward) state.stud += reward;
  }

  await save(env, state);
  return json({ stud: state.stud });
}

// ==================== 接口5: 领取周全勤 ====================
async function handleClaim(env) {
  const state = await getState(env);
  const today = new Date().getDay();
  if (today !== 0) return json({ error: '只在周日可领取周全勤' }, 400);
  if (state.weeklyClaimed) return json({ error: '本周周全勤已领取' }, 400);

  const todayStr = new Date().toDateString();
  const doneToday = state.dailyCompleted.filter(d => d.date === todayStr).length;
  if (doneToday < 3) return json({ error: '今日必做未全部完成' }, 400);

  state.stud += 200;
  const rCardArray = await drawUnified(state, true); // 返回数组，取第一个
  state.weeklyClaimed = true;
  await save(env, state);
  return json({ stud: state.stud, bonus: rCardArray[0] });
}

// ==================== 接口6: 设置心愿单 ====================
async function handleSetWish(request, env) {
  const state = await getState(env);
  const body = await request.json();
  state.wish = body.wish || null;
  await save(env, state);
  return json({ wish: state.wish });
}

// ==================== 接口7: 重置选做池 ====================
async function handleResetWeek(env) {
  const state = await getState(env);
  state.poolCompleted = [];
  await save(env, state);
  return json({ success: true });
}

// ==================== 接口8: 开始新学周 ====================
async function handleNewWeek(env) {
  const state = await getState(env);
  state.week += 1;
  state.weekStart = Date.now();
  state.weeklyClaimed = false;
  state.poolCompleted = [];
  await save(env, state);
  return json({ week: state.week });
}