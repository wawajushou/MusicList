const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 每日歌单生成函数 - 每天18:05自动执行（在榜单更新后）
exports.main = async (event, context) => {
  console.log('========== 每日歌单生成任务开始 ==========');
  const startTime = Date.now();

  try {
    console.log('开始生成每日歌单...');
    const playlistRes = await cloud.callFunction({
      name: 'generatePlaylist',
      data: {}
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`========== 歌单生成完成 (耗时${elapsed}s) ==========`);

    return {
      success: playlistRes.result.success,
      data: playlistRes.result.data,
      elapsedSeconds: parseFloat(elapsed)
    };

  } catch (error) {
    console.error('歌单生成异常:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
