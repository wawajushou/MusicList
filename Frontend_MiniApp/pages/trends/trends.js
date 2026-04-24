// 榜单速递页面

Page({
  data: {
    updateTime: "",
    chartsLoading: true,
    charts: []
  },

  onLoad: function () {
    this.fetchCharts();
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
              displaySongs: songs.slice(0, 3),  // 预处理：只取前3首
              totalCount: songs.length
            };
          });
          
          this.setData({
            charts: charts,
            chartsLoading: false,
            updateTime: res.data[0].updateTime 
              ? res.data[0].updateTime.substring(11, 16) 
              : ''
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
    setTimeout(() => wx.stopPullDownRefresh(), 1500);
  }
});
