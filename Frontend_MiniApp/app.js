App({
  onLaunch: function () {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d9gwml0o8125def3c',
        traceUser: true
      });
    }
    console.log("专属排歌管家启动");
  },
  globalData: {
    userInfo: null
  }
});
