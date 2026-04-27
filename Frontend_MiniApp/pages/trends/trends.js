// 榜单速递页面

Page({
  data: {
    updateTime: "",
    nextUpdateTime: "",
    chartsLoading: true,
    chartsRefreshing: false,
    charts: []
  },

  onLoad: function () {
    this.fetchCharts();
    this.updateNextUpdateTime();
  },

  // 展开/收起
  toggleExpand: function (e) {
    const id = e.currentTarget.dataset.id;
    const charts = this.data.charts.map(chart => {
      if (chart.chartId === id) {
        chart.expanded = !chart.expanded;
      }
      return chart;
    });
    this.setData({ charts });
  },

  // 手动刷新榜单（调用云函数爬取）
  refreshCharts: function () {
    if (this.data.chartsRefreshing) return;
    this.setData({ chartsRefreshing: true });
    
    wx.cloud.callFunction({
      name: 'updateCharts',
      success: (res) => {
        if (res.result && res.result.success) {
          wx.showToast({ title: '榜单已更新', icon: 'success' });
          this.fetchCharts();
          this.updateNextUpdateTime();
        } else {
          wx.showToast({ title: '更新失败', icon: 'none' });
        }
        this.setData({ chartsRefreshing: false });
      },
      fail: () => {
        wx.showToast({ title: '更新失败', icon: 'none' });
        this.setData({ chartsRefreshing: false });
      }
    });
  },

  // 从数据库获取榜单
  fetchCharts: function () {
    this.setData({ chartsLoading: true });
    
    const db = wx.cloud.database();
    const today = this.getTodayDate();
    
    db.collection('charts').where({ date: today }).get({
      success: (res) => {
        if (res.data.length > 0) {
          const charts = res.data.map(chart => {
            const songs = chart.songs.map(s => ({
              rank: s.rank,
              name: s.name,
              artist: s.artist
            }));
            
            return {
              chartId: chart.chartId,
              name: chart.chartName,
              icon: this.getChartIcon(chart.chartName),
              expanded: false,
              updateTime: chart.updateTime,
              songs: songs,
              displaySongs: songs.slice(0, 3),
              totalCount: songs.length
            };
          });
          
          // 获取最新的更新时间
          const latestUpdate = res.data[0].updateTime;
          let updateTimeStr = '';
          if (latestUpdate) {
            const updateDate = new Date(latestUpdate);
            const beijingTime = new Date(updateDate.getTime() + 8 * 60 * 60 * 1000);
            updateTimeStr = String(beijingTime.getUTCHours()).padStart(2, '0') + ':' + 
              String(beijingTime.getUTCMinutes()).padStart(2, '0');
          }
          
          this.setData({
            charts: charts,
            chartsLoading: false,
            updateTime: updateTimeStr
          });
        } else {
          this.setData({ chartsLoading: false });
        }
      },
      fail: () => {
        this.setData({ chartsLoading: false });
        wx.showToast({ title: '加载榜单失败', icon: 'none' });
      }
    });
  },

  // 计算下次更新时间
  updateNextUpdateTime: function () {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = beijingTime.getUTCHours();
    
    let nextUpdate = '';
    if (hour < 12) {
      nextUpdate = '今日 12:00';
    } else if (hour < 18) {
      nextUpdate = '今日 18:00';
    } else {
      nextUpdate = '明日 12:00';
    }
    
    this.setData({ nextUpdateTime: nextUpdate });
  },

  getTodayDate: function () {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toISOString().split('T')[0];
  },

  getChartIcon: function (name) {
    if (name.includes('飙升')) return '🔥';
    if (name.includes('DJ')) return '🎵';
    if (name.includes('内地')) return '🇨🇳';
    return '🎶';
  },

  onPullDownRefresh: function () {
    this.fetchCharts();
    this.updateNextUpdateTime();
    setTimeout(() => wx.stopPullDownRefresh(), 1500);
  }
});
