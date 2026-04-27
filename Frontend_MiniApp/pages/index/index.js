// 今日看板页面

Page({
  data: {
    playlistDate: "",
    nextUpdateTime: "18:05",
    updateTime: "",
    isFallback: false,  // 是否显示的是历史歌单
    fallbackDate: "",   // 实际显示的歌单日期
    
    weather: {
      location: '海埂大坝',
      district: '昆明市西山区',
      isToday: true,
      date: "",
      timeRange: "07:00-11:00",
      icon: "🌤️",
      temp: 18,
      tempRange: "",
      desc: "加载中...",
      uvDisplay: "",
      uvSource: "",
      rainDetails: [],
      advice: { clothing: "", rain: "", uv: "" }
    },
    weatherLoading: true,
    weatherUpdateTime: "",
    weatherRefreshing: false,
    
    playlistLoading: true,
    stageOne: { songs: [] },
    stageTwo: { songs: [] },
    newSongs: []
  },

  onLoad: function () {
    this.initDates();
    this.fetchWeather();
    this.fetchPlaylist();
  },

  // 初始化日期 - 根据18:05规则计算显示日期
  initDates: function () {
    const playlistDate = this.getDisplayDate();
    const updateTime = this.getNextUpdateTime();
    
    this.setData({ 
      playlistDate: playlistDate,
      updateTime: updateTime
    });
  },

  // 获取显示日期：18:05后显示第二天日期
  getDisplayDate: function () {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = beijingTime.getUTCHours();
    const minute = beijingTime.getUTCMinutes();
    
    // 如果是18:05之后，显示明天的日期
    if (hour > 18 || (hour === 18 && minute >= 5)) {
      beijingTime.setUTCDate(beijingTime.getUTCDate() + 1);
    }
    
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    return `${month}月${day}日`;
  },

  // 获取歌单日期（用于数据库查询）
  getPlaylistDate: function () {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = beijingTime.getUTCHours();
    const minute = beijingTime.getUTCMinutes();
    
    // 如果是18:05之后，查询明天的歌单
    if (hour > 18 || (hour === 18 && minute >= 5)) {
      beijingTime.setUTCDate(beijingTime.getUTCDate() + 1);
    }
    
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取下次更新时间
  getNextUpdateTime: function () {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = beijingTime.getUTCHours();
    const minute = beijingTime.getUTCMinutes();
    
    if (hour > 18 || (hour === 18 && minute >= 5)) {
      return '明日 18:05';
    } else {
      return '今日 18:05';
    }
  },

  // 获取天气
  fetchWeather: function () {
    this.setData({ weatherLoading: true });
    wx.cloud.callFunction({
      name: 'getWeather',
      success: (res) => {
        if (res.result && res.result.success && res.result.data) {
          const weatherData = res.result.data;
          if (!weatherData.rainDetails) weatherData.rainDetails = [];
          weatherData.district = '昆明市西山区';
          
          const now = new Date();
          const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
          const updateTime = String(beijingTime.getUTCHours()).padStart(2, '0') + ':' + 
            String(beijingTime.getUTCMinutes()).padStart(2, '0');
          
          this.setData({ 
            weather: weatherData, 
            weatherLoading: false,
            weatherRefreshing: false,
            weatherUpdateTime: updateTime
          });
        } else {
          this.setData({ weatherLoading: false, weatherRefreshing: false, 'weather.desc': '获取天气失败' });
        }
      },
      fail: () => {
        this.setData({ weatherLoading: false, weatherRefreshing: false, 'weather.desc': '获取天气失败' });
      }
    });
  },

  // 手动刷新天气
  refreshWeather: function () {
    if (this.data.weatherRefreshing) return;
    this.setData({ weatherRefreshing: true });
    this.fetchWeather();
  },

  // 获取歌单
  fetchPlaylist: function () {
    this.setData({ playlistLoading: true, isFallback: false, fallbackDate: "" });
    
    const db = wx.cloud.database();
    const playlistDate = this.getPlaylistDate();
    
    db.collection('playlists').where({ date: playlistDate }).get({
      success: (res) => {
        if (res.data.length > 0) {
          this.displayPlaylist(res.data[0]);
        } else {
          // Fallback: 查找最近的歌单
          this.fetchLatestPlaylist();
        }
      },
      fail: () => {
        this.setData({ playlistLoading: false });
        wx.showToast({ title: '加载歌单失败', icon: 'none' });
      }
    });
  },

  // Fallback: 从历史歌单中查找最近的一天
  fetchLatestPlaylist: function () {
    const db = wx.cloud.database();
    
    db.collection('playlists')
      .orderBy('date', 'desc')
      .limit(1)
      .get({
        success: (res) => {
          if (res.data.length > 0) {
            this.displayPlaylist(res.data[0], true);
          } else {
            this.setData({ playlistLoading: false });
          }
        },
        fail: () => {
          this.setData({ playlistLoading: false });
        }
      });
  },

  // 显示歌单数据
  displayPlaylist: function (playlist, isFallback) {
    const stages = playlist.stages || {};
    
    const stageOneSongs = (stages['开播前期'] || []).map((s, i) => ({
      index: i + 1,
      name: s.song_name
    }));
    
    const stageTwoSongs = (stages['直播中场'] || []).map((s, i) => ({
      index: stageOneSongs.length + i + 1,
      name: s.song_name
    }));
    
    const newSongs = (playlist.newSongs || []).map(s => ({
      name: s.name,
      source: s.source,
      rank: s.rank
    }));
    
    const data = {
      stageOne: { songs: stageOneSongs },
      stageTwo: { songs: stageTwoSongs },
      newSongs: newSongs,
      playlistLoading: false
    };

    // 如果是 fallback，记录实际日期
    if (isFallback) {
      data.isFallback = true;
      data.fallbackDate = playlist.date;
    }
    
    this.setData(data);
  },

  onPullDownRefresh: function () {
    this.initDates();
    this.fetchWeather();
    this.fetchPlaylist();
    setTimeout(() => wx.stopPullDownRefresh(), 1500);
  }
});
