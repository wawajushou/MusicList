const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 榜单爬取函数 - 每天12:00和18:00自动执行，也可手动触发
exports.main = async (event, context) => {
  console.log('========== 榜单爬取任务开始 ==========');
  const startTime = Date.now();

  try {
    console.log('开始爬取酷狗榜单...');
    const crawlRes = await cloud.callFunction({
      name: 'crawlKugou',
      data: {}
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`========== 榜单爬取完成 (耗时${elapsed}s) ==========`);

    return {
      success: crawlRes.result.success,
      data: crawlRes.result.data,
      elapsedSeconds: parseFloat(elapsed)
    };

  } catch (error) {
    console.error('榜单爬取异常:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
