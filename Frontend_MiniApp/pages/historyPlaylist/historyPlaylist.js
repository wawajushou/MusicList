// 历史歌单记录页面

Page({
  data: {
    playlists: [],
    loading: true,
    expandedDate: null  // 当前展开的歌单日期
  },

  onLoad: function () {
    this.fetchPlaylists();
  },

  // 从云数据库获取历史歌单
  fetchPlaylists: function () {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    
    db.collection('playlists')
      .orderBy('date', 'desc')
      .limit(30)
      .get({
        success: (res) => {
          const playlists = res.data.map(item => {
            const stages = item.stages || {};
            const stageOneSongs = stages['开播前期'] || [];
            const stageTwoSongs = stages['直播中场'] || [];
            
            return {
              date: item.date,
              updateTime: item.updateTime,
              stageOneCount: stageOneSongs.length,
              stageTwoCount: stageTwoSongs.length,
              totalCount: stageOneSongs.length + stageTwoSongs.length,
              stageOneSongs: stageOneSongs,
              stageTwoSongs: stageTwoSongs,
              newSongs: item.newSongs || []
            };
          });
          
          this.setData({ playlists, loading: false });
        },
        fail: () => {
          this.setData({ loading: false });
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      });
  },

  // 展开/收起歌单详情
  toggleExpand: function (e) {
    const date = e.currentTarget.dataset.date;
    this.setData({
      expandedDate: this.data.expandedDate === date ? null : date
    });
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.fetchPlaylists();
    setTimeout(() => wx.stopPullDownRefresh(), 1500);
  }
});
