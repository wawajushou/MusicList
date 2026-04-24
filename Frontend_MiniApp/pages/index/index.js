// 今日看板页面

Page({
  data: {
    playlistDate: "",
    nextUpdateTime: "18:00",
    updateTime: "",
    
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

  // 初始化日期 - 根据18:00规则计算显示日期
  initDates: function () {
    const playlistDate = this.getDisplayDate();
    const updateTime = this.getNextUpdateTime();
    
    this.setData({ 
      playlistDate: playlistDate,
      updateTime: updateTime
    });
  },

  // 获取显示日期：18:00后显示第二天日期
  getDisplayDate: function () {
    const now = new Date();
    // 转换为北京时间
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = beijingTime.getUTCHours();
    
    // 如果是18:00之后，显示明天的日期
    if (hour >= 18) {
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
    
    // 如果是18:00之后，查询明天的歌单
    if (hour >= 18) {
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
    
    if (hour < 18) {
      return '今日 18:00';
    } else {
      return '明日 18:00';
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
          // 确保显示区域信息
          weatherData.district = '昆明市西山区';
          this.setData({ weather: weatherData, weatherLoading: false });
        } else {
          this.setData({ weatherLoading: false, 'weather.desc': '获取天气失败' });
        }
      },
      fail: () => {
        this.setData({ weatherLoading: false, 'weather.desc': '获取天气失败' });
      }
    });
  },

  // 获取歌单
  fetchPlaylist: function () {
    this.setData({ playlistLoading: true });
    
    const db = wx.cloud.database();
    const playlistDate = this.getPlaylistDate();
    
    db.collection('playlists').where({ date: playlistDate }).get({
      success: (res) => {
        if (res.data.length > 0) {
          const playlist = res.data[0];
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
            source: s.source
          }));
          
          this.setData({
            stageOne: { songs: stageOneSongs },
            stageTwo: { songs: stageTwoSongs },
            newSongs: newSongs,
            playlistLoading: false
          });
        } else {
          this.setData({ playlistLoading: false });
        }
      },
      fail: () => {
        this.setData({ playlistLoading: false });
        wx.showToast({ title: '加载歌单失败', icon: 'none' });
      }
    });
  },

  onPullDownRefresh: function () {
    this.initDates();
    this.fetchWeather();
    this.fetchPlaylist();
    setTimeout(() => wx.stopPullDownRefresh(), 1500);
  }
});
