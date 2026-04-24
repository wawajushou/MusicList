// 曲库歌曲页面

Page({
  data: {
    songs: [],
    loading: true
  },

  onLoad: function () {
    this.fetchSongs();
  },

  fetchSongs: function () {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    
    // 云数据库单次查询最多20条，需要分页获取
    this.fetchAllSongs(db, 0, []);
  },

  fetchAllSongs: function (db, skip, allSongs) {
    db.collection('baseLibrary')
      .skip(skip)
      .limit(20)
      .get({
        success: (res) => {
          const songs = allSongs.concat(res.data.map(s => ({
            song_name: s.song_name,
            vibe: s.vibe ? s.vibe.split(' (')[0] : '',
            broadcast_stage: s.broadcast_stage ? s.broadcast_stage.split(' (')[0] : ''
          })));

          if (res.data.length === 20) {
            // 还有更多数据，继续获取
            this.fetchAllSongs(db, skip + 20, songs);
          } else {
            // 数据获取完毕
            this.setData({ songs, loading: false });
          }
        },
        fail: () => {
          this.setData({ loading: false });
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      });
  }
});
