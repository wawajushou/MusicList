const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const CHARTS = [
  { id: '24971', name: 'DJ热歌榜' },
  { id: '6666', name: '酷狗飙升榜' },
  { id: '31308', name: '内地榜' }
];

const MAX_SONGS = 20;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Referer': 'https://www.kugou.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'identity'
      },
      timeout: 20000
    };

    console.log(`请求URL: ${url}`);

    https.get(url, options, (res) => {
      console.log(`响应状态: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`响应长度: ${data.length}`);
        resolve(data);
      });
    }).on('error', (err) => {
      console.error(`请求错误: ${err.message}`);
      reject(err);
    });
  });
}

function parseChartHtml(html, chartName) {
  const songs = [];
  console.log(`开始解析 ${chartName}，HTML长度: ${html.length}`);
  
  // 多种解析模式，提高成功率
  // 模式1: title="歌手 - 歌曲名"
  let liRegex = /<li[^>]*?title="([^"]+)"[^>]*>/gi;
  let rankRegex = /<span\s+class="pc_temp_num">\s*<strong>(\d+)<\/strong>/gi;

  let liMatches = [];
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    liMatches.push({ title: match[1], index: match.index });
  }
  console.log(`找到 ${liMatches.length} 个<li>元素`);

  let ranks = [];
  while ((match = rankRegex.exec(html)) !== null) {
    ranks.push({ rank: parseInt(match[1]), index: match.index });
  }
  console.log(`找到 ${ranks.length} 个排名`);

  // 如果模式1没找到，尝试模式2
  if (liMatches.length === 0) {
    console.log('尝试备用解析模式...');
    // 尝试其他可能的HTML结构
    liRegex = /title="([^"]*[-][^"]*)"[^>]*>/gi;
    while ((match = liRegex.exec(html)) !== null) {
      if (match[1].includes(' - ') || match[1].includes('-')) {
        liMatches.push({ title: match[1], index: match.index });
      }
    }
    console.log(`备用模式找到 ${liMatches.length} 个`);
  }

  for (let i = 0; i < liMatches.length && songs.length < MAX_SONGS; i++) {
    const li = liMatches[i];
    const title = li.title;

    let artist = '';
    let name = '';

    if (title.includes(' - ')) {
      const parts = title.split(' - ', 2);
      artist = parts[0].trim();
      name = parts[1].trim();
    } else if (title.includes('-')) {
      const parts = title.split('-', 2);
      artist = parts[0].trim();
      name = parts[1].trim();
    } else {
      name = title.trim();
    }

    if (!name) continue;

    let rank = i + 1;
    for (const r of ranks) {
      if (Math.abs(r.index - li.index) < 500) {
        rank = r.rank;
        break;
      }
    }

    songs.push({ rank, name, artist: artist || '未知歌手' });
  }

  songs.sort((a, b) => a.rank - b.rank);
  songs.forEach((song, idx) => { song.rank = idx + 1; });

  console.log(`解析完成: ${songs.length} 首歌曲`);
  return songs.slice(0, MAX_SONGS);
}

async function crawlSingleChart(chart) {
  const url = `https://www.kugou.com/yy/rank/home/1-${chart.id}.html`;
  console.log(`\n========== 爬取: ${chart.name} ==========`);

  try {
    const html = await fetchPage(url);
    
    if (!html) {
      console.error(`${chart.name}: 响应为空`);
      return null;
    }
    
    if (html.length < 500) {
      console.error(`${chart.name}: 响应过短 (${html.length}字节)`);
      console.log('响应内容预览:', html.substring(0, 200));
      return null;
    }

    const songs = parseChartHtml(html, chart.name);
    if (songs.length === 0) {
      console.error(`${chart.name}: 未解析到歌曲`);
      // 保存HTML片段用于调试
      console.log('HTML片段:', html.substring(0, 500));
      return null;
    }

    console.log(`${chart.name}: 成功获取 ${songs.length} 首`);
    return { chartId: chart.id, chartName: chart.name, songs };

  } catch (error) {
    console.error(`${chart.name} 爬取异常:`, error.message);
    return null;
  }
}

async function saveChartsToDb(chartsData) {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const date = beijingTime.toISOString().split('T')[0];
  const updateTime = beijingTime.toISOString();
  const chartsCol = db.collection('charts');

  for (const chart of chartsData) {
    if (!chart) continue;

    const record = {
      date,
      updateTime,
      chartId: chart.chartId,
      chartName: chart.chartName,
      songs: chart.songs
    };

    const existing = await chartsCol.where({ date, chartId: chart.chartId }).get();
    if (existing.data.length > 0) {
      await chartsCol.doc(existing.data[0]._id).update({ data: record });
      console.log(`更新: ${chart.chartName}`);
    } else {
      await chartsCol.add({ data: record });
      console.log(`新增: ${chart.chartName}`);
    }
  }
}

exports.main = async (event, context) => {
  console.log('========== crawlKugou 开始 ==========');
  const startTime = Date.now();

  const results = [];
  const errors = [];

  for (const chart of CHARTS) {
    const result = await crawlSingleChart(chart);
    if (result) {
      results.push(result);
    } else {
      errors.push(chart.name);
    }
    await sleep(1500 + Math.random() * 1500);
  }

  if (results.length === 0) {
    console.log('========== 全部失败 ==========');
    return { 
      success: false, 
      error: '所有榜单爬取失败',
      errors,
      elapsed: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
    };
  }

  try {
    await saveChartsToDb(results);
  } catch (error) {
    return { success: false, error: '保存失败: ' + error.message };
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`========== 完成，耗时${elapsed}s ==========`);

  return {
    success: true,
    data: {
      totalCharts: results.length,
      charts: results.map(r => ({ name: r.chartName, songCount: r.songs.length })),
      errors: errors.length > 0 ? errors : undefined
    }
  };
};
