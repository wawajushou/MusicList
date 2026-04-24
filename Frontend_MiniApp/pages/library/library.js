// 我的曲库页面

Page({
  data: {
    songCount: 0,
    playlistCount: 0
  },

  onLoad: function () {
    this.fetchStats();
  },

  goToSongList: function () {
    wx.navigateTo({ url: '/pages/songList/songList' });
  },

  goToHistoryPlaylist: function () {
    wx.navigateTo({ url: '/pages/historyPlaylist/historyPlaylist' });
  },

  goToPlaylistRules: function () {
    wx.navigateTo({ url: '/pages/playlistRules/playlistRules' });
  },

  fetchStats: function () {
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 获取基础曲库数量
    db.collection('baseLibrary').count({
      success: (libRes) => {
        // 获取历史歌单数量
        db.collection('playlists').count({
          success: (plRes) => {
            this.setData({
              songCount: libRes.total,
              playlistCount: plRes.total
            });
          },
          fail: () => {
            this.setData({ songCount: libRes.total });
          }
        });
      }
    });
  }
});
