const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const STAGE_CONFIG = {
  '开播前期': 12,
  '直播中场': 15
};

function normalizeSongName(name) {
  name = name.replace(/（.*?）/g, '');
  name = name.replace(/\(.*?\)/g, '');
  return name.trim();
}

// 获取歌单日期：18:00后返回明天日期
function getPlaylistDate() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = beijingTime.getUTCHours();
  
  // 18:00后，返回明天的日期
  if (hour >= 18) {
    beijingTime.setUTCDate(beijingTime.getUTCDate() + 1);
  }
  
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 获取今天的日期（用于查询榜单）
function getTodayDate() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomSample(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function loadBaseLibrary() {
  const baseLibCol = db.collection('baseLibrary');
  const countResult = await baseLibCol.count();
  console.log(`基础曲库总数: ${countResult.total}`);
  
  if (countResult.total === 0) {
    return [];
  }

  // 分批获取所有曲库
  const allSongs = [];
  const batchSize = 20;
  for (let i = 0; i < countResult.total; i += batchSize) {
    const res = await baseLibCol.skip(i).limit(batchSize).get();
    allSongs.push(...res.data);
  }
  
  console.log(`实际加载曲库: ${allSongs.length} 首`);
  return allSongs;
}

async function loadTodayCharts() {
  const today = getTodayDate();
  console.log(`查询今日榜单: ${today}`);
  
  const chartsCol = db.collection('charts');
  const result = await chartsCol.where({ date: today }).get();
  console.log(`找到今日榜单: ${result.data.length} 个`);
  
  for (const chart of result.data) {
    console.log(`- ${chart.chartName}: ${(chart.songs || []).length} 首`);
  }
  
  return result.data;
}

async function loadLatestPlaylist() {
  const playlistsCol = db.collection('playlists');
  const result = await playlistsCol.orderBy('date', 'desc').limit(1).get();
  
  if (result.data.length > 0) {
    console.log(`找到历史歌单: ${result.data[0].date}`);
    return result.data[0];
  }
  console.log('无历史歌单');
  return null;
}

function generatePlaylist(baseLibrary, latestPlaylist) {
  const playlist = {};

  for (const [stage, count] of Object.entries(STAGE_CONFIG)) {
    console.log(`\n生成 ${stage} (目标${count}首)...`);
    
    const candidates = baseLibrary.filter(song => 
      song.broadcast_stage && song.broadcast_stage.includes(stage.split(' ')[0])
    );
    console.log(`候选歌曲: ${candidates.length} 首`);

    if (candidates.length === 0) {
      playlist[stage] = [];
      continue;
    }

    const historySongs = latestPlaylist && latestPlaylist.stages 
      ? latestPlaylist.stages[stage] || [] 
      : [];

    if (historySongs.length > 0) {
      const minKeep = Math.max(1, Math.floor(count * 0.3));
      const maxKeep = Math.floor(count * 0.5);
      const keepCount = minKeep + Math.floor(Math.random() * (maxKeep - minKeep + 1));

      const kept = randomSample(historySongs, keepCount);
      const keptNames = new Set(kept.map(s => normalizeSongName(s.song_name)));
      
      const remainingCandidates = candidates.filter(s => 
        !keptNames.has(normalizeSongName(s.song_name))
      );

      const newCount = count - kept.length;
      const newSongs = randomSample(remainingCandidates, newCount);

      playlist[stage] = [...kept, ...newSongs];
      console.log(`保留${kept.length}首 + 新选${newSongs.length}首`);
    } else {
      playlist[stage] = randomSample(candidates, count);
      console.log(`随机选${playlist[stage].length}首`);
    }
  }

  return playlist;
}

function selectNewSuggestions(baseLibrary, charts) {
  if (!charts || charts.length === 0) {
    console.log('无榜单数据，跳过新歌推荐');
    return [];
  }

  const libraryNames = new Set(baseLibrary.map(s => normalizeSongName(s.song_name)));
  const suggestions = [];
  // 从三个榜单各选1首
  const targetCharts = ['DJ热歌榜', '酷狗飙升榜', '内地榜'];

  for (const chart of charts) {
    if (!targetCharts.includes(chart.chartName)) continue;

    const candidates = (chart.songs || [])
      .filter(song => !libraryNames.has(normalizeSongName(song.name)))
      .filter(song => song.rank <= 20);

    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      suggestions.push({
        name: picked.name,
        artist: picked.artist,
        source: chart.chartName,
        rank: picked.rank
      });
      console.log(`推荐新歌: ${picked.name} (来自${chart.chartName} 第${picked.rank}名)`);
    }
  }

  return suggestions;
}

async function savePlaylist(playlist, newSongs) {
  const playlistDate = getPlaylistDate();  // 使用歌单日期（18:00后是明天）
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const updateTime = beijingTime.toISOString();

  const record = {
    date: playlistDate,
    updateTime,
    stages: playlist,
    newSongs
  };

  const playlistsCol = db.collection('playlists');
  const existing = await playlistsCol.where({ date: playlistDate }).get();

  if (existing.data.length > 0) {
    await playlistsCol.doc(existing.data[0]._id).update({ data: record });
    console.log(`更新歌单: ${playlistDate}`);
  } else {
    await playlistsCol.add({ data: record });
    console.log(`新增歌单: ${playlistDate}`);
  }
}

exports.main = async (event, context) => {
  console.log('========== generatePlaylist 开始 ==========');

  try {
    const baseLibrary = await loadBaseLibrary();
    if (baseLibrary.length === 0) {
      return { success: false, error: '基础曲库为空，请先运行 initDatabase' };
    }

    const charts = await loadTodayCharts();
    const latestPlaylist = await loadLatestPlaylist();

    const playlist = generatePlaylist(baseLibrary, latestPlaylist);
    const newSongs = selectNewSuggestions(baseLibrary, charts);

    await savePlaylist(playlist, newSongs);

    console.log('========== 歌单生成完成 ==========');
    return {
      success: true,
      data: {
        date: getPlaylistDate(),
        stages: playlist,
        newSongs
      }
    };

  } catch (error) {
    console.error('生成歌单失败:', error);
    return { success: false, error: error.message };
  }
};
