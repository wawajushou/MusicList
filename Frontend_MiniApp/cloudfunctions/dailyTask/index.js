const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  console.log('========== 每日定时任务开始 ==========');
  const startTime = Date.now();

  const results = {
    crawl: null,
    playlist: null,
    errors: []
  };

  try {
    // 第一步：爬取酷狗榜单
    console.log('【1/2】开始爬取榜单...');
    try {
      const crawlRes = await cloud.callFunction({
        name: 'crawlKugou',
        data: {}
      });
      results.crawl = crawlRes.result;
      
      if (!crawlRes.result.success) {
        results.errors.push('爬取部分失败: ' + (crawlRes.result.error || ''));
      }
    } catch (err) {
      console.error('爬取榜单调用失败:', err);
      results.errors.push('爬取榜单调用失败: ' + err.message);
    }

    // 第二步：生成每日歌单
    console.log('【2/2】开始生成歌单...');
    try {
      const playlistRes = await cloud.callFunction({
        name: 'generatePlaylist',
        data: {}
      });
      results.playlist = playlistRes.result;

      if (!playlistRes.result.success) {
        results.errors.push('歌单生成失败: ' + (playlistRes.result.error || ''));
      }
    } catch (err) {
      console.error('生成歌单调用失败:', err);
      results.errors.push('生成歌单调用失败: ' + err.message);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`========== 每日任务完成 (耗时${elapsed}s) ==========`);

    return {
      success: results.errors.length === 0,
      data: {
        crawl: results.crawl,
        playlist: results.playlist,
        elapsedSeconds: parseFloat(elapsed)
      },
      errors: results.errors.length > 0 ? results.errors : undefined
    };

  } catch (error) {
    console.error('每日任务异常:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
