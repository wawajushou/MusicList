// 天气云函数
// 获取云南省昆明市西山区海埂大坝7点到11点的天气预报

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 和风天气配置
const QWEATHER_CONFIG = {
  apiKey: 'd40225e84b584a14b1d322b1b746e167',
  apiHost: 'nb5hv6ptk8.re.qweatherapi.com',
  location: '101290116' // 西山区城市ID
};

// 云函数入口
exports.main = async (event, context) => {
  try {
    console.log('========== 开始获取天气数据 ==========');
    console.log('API Host:', QWEATHER_CONFIG.apiHost);
    console.log('Location:', QWEATHER_CONFIG.location, '(西山区)');
    
    const axios = require('axios');
    
    // 1. 获取24小时天气预报
    console.log('\n----- 获取24小时天气预报 -----');
    const weatherUrl = `https://${QWEATHER_CONFIG.apiHost}/v7/weather/24h`;
    console.log('请求URL:', weatherUrl);
    
    const weatherResponse = await axios.get(weatherUrl, {
      params: {
        location: QWEATHER_CONFIG.location,
        key: QWEATHER_CONFIG.apiKey
      },
      timeout: 10000
    });
    
    console.log('天气API响应状态:', weatherResponse.status);
    console.log('天气API返回Code:', weatherResponse.data.code);
    
    if (weatherResponse.data.code !== '200') {
      return {
        success: false,
        error: `天气API错误: ${weatherResponse.data.code}`,
        data: null
      };
    }
    
    // 2. 获取紫外线指数
    console.log('\n----- 获取紫外线指数 -----');
    const uvUrl = `https://${QWEATHER_CONFIG.apiHost}/v7/indices/1d`;
    console.log('请求URL:', uvUrl);
    
    let uvIndex = null;
    let uvLevel = '';
    let uvDataSource = '未知';
    
    try {
      const uvResponse = await axios.get(uvUrl, {
        params: {
          location: QWEATHER_CONFIG.location,
          type: 5,
          key: QWEATHER_CONFIG.apiKey
        },
        timeout: 10000
      });
      
      console.log('紫外线API响应状态:', uvResponse.status);
      console.log('紫外线API返回Code:', uvResponse.data.code);
      
      if (uvResponse.data.code === '200' && uvResponse.data.daily && uvResponse.data.daily.length > 0) {
        const uvData = uvResponse.data.daily[0];
        uvIndex = parseInt(uvData.level) || null;
        uvLevel = uvData.category || '';
        uvDataSource = '和风天气紫外线指数API';
        console.log('紫外线数据来源:', uvDataSource);
        console.log('紫外线指数:', uvIndex);
        console.log('紫外线等级:', uvLevel);
      } else {
        console.log('紫外线API返回数据为空或错误');
        uvDataSource = 'API返回空数据，使用天气推断';
      }
    } catch (uvError) {
      console.error('紫外线API调用失败:', uvError.message);
      uvDataSource = 'API调用失败，使用天气推断';
    }
    
    // 3. 处理天气数据
    console.log('\n----- 处理天气数据 -----');
    const weatherInfo = processWeatherData(weatherResponse.data, uvIndex, uvLevel, uvDataSource);
    
    if (!weatherInfo) {
      return {
        success: false,
        error: '无法获取天气数据',
        data: null
      };
    }
    
    console.log('\n========== 天气数据获取完成 ==========');
    console.log('返回数据:', JSON.stringify(weatherInfo, null, 2));
    
    return {
      success: true,
      data: weatherInfo
    };
  } catch (error) {
    console.error('获取天气失败:', error.message);
    return {
      success: false,
      error: error.message || '网络请求失败',
      data: null
    };
  }
};

// 处理天气数据
function processWeatherData(apiData, uvIndex, uvLevel, uvDataSource) {
  if (!apiData || !apiData.hourly || apiData.hourly.length === 0) {
    console.error('无效的API数据');
    return null;
  }
  
  console.log('逐小时数据数量:', apiData.hourly.length);
  
  // 获取当前北京时间（UTC+8）
  const nowUTC = new Date();
  const nowBeijing = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000);
  const currentHourBeijing = nowBeijing.getUTCHours();
  
  console.log('当前UTC时间:', nowUTC.toISOString());
  console.log('当前北京时间:', nowBeijing.toISOString(), '小时:', currentHourBeijing);
  
  let targetDate, targetDateStr, isToday;
  
  if (currentHourBeijing < 12) {
    // 北京时间12点前：显示今天的天气
    targetDate = nowBeijing;
    isToday = true;
    console.log('当前北京时间12点前，显示今天的天气');
  } else {
    // 北京时间12点后：显示明天的天气
    targetDate = new Date(nowBeijing.getTime() + 24 * 60 * 60 * 1000);
    isToday = false;
    console.log('当前北京时间12点后，显示明天的天气');
  }
  
  targetDateStr = targetDate.getUTCFullYear() + '-' + 
    String(targetDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
    String(targetDate.getUTCDate()).padStart(2, '0');
  
  console.log('目标日期:', targetDateStr);
  
  // 筛选7-11点的天气数据
  const targetHours = apiData.hourly.filter(hour => {
    const dateTimePart = hour.fxTime.split('T')[0];
    const hourPart = hour.fxTime.split('T')[1].split(':')[0];
    const hourNum = parseInt(hourPart);
    
    const isMatch = dateTimePart === targetDateStr && hourNum >= 7 && hourNum < 11;
    if (isMatch) {
      console.log('匹配数据:', hour.fxTime, hour.text, hour.temp + '°C', '降水:', hour.precip + 'mm');
    }
    return isMatch;
  });
  
  console.log('筛选到7-11点数据:', targetHours.length, '条');
  
  if (targetHours.length === 0) {
    console.log('未找到目标时段数据');
    return null;
  }
  
  return generateWeatherAdvice(targetHours, targetDate, isToday, uvIndex, uvLevel, uvDataSource);
}

// 分析逐小时降雨
function analyzeRainfallDetails(targetHours) {
  const rainPeriods = [];
  
  targetHours.forEach((hour) => {
    const precip = parseFloat(hour.precip) || 0;
    if (precip > 0) {
      const hourNum = parseInt(hour.fxTime.split('T')[1].split(':')[0]);
      let rainType = '';
      if (precip >= 10) {
        rainType = '大雨';
      } else if (precip >= 2.5) {
        rainType = '中雨';
      } else {
        rainType = '小雨';
      }
      rainPeriods.push({
        startHour: hourNum,
        endHour: hourNum + 1,
        type: rainType,
        precip: precip
      });
    }
  });
  
  return rainPeriods;
}

// 生成降雨建议
function generateRainAdvice(rainPeriods) {
  if (rainPeriods.length === 0) {
    return '无降雨，适合户外直播';
  }
  
  const descriptions = rainPeriods.map(p => 
    `${p.startHour}点到${p.endHour}点有${p.type}`
  ).join('，');
  
  const maxPrecip = Math.max(...rainPeriods.map(p => p.precip));
  let advice = '';
  if (maxPrecip >= 10) {
    advice = '不建议户外直播';
  } else if (maxPrecip >= 2.5) {
    advice = '建议带好雨具，注意安全';
  } else {
    advice = '建议带好雨具，注意雨势';
  }
  
  return `预计${descriptions}，${advice}`;
}

// 生成天气建议
function generateWeatherAdvice(hours, targetDate, isToday, uvIndex, uvLevel, uvDataSource) {
  const temps = hours.map(h => parseInt(h.temp));
  const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  
  const weatherDesc = hours[Math.floor(hours.length / 2)].text;
  const weatherIcon = getWeatherIcon(weatherDesc);
  
  // 分析降雨详情
  const rainPeriods = analyzeRainfallDetails(hours);
  console.log('降雨时段:', JSON.stringify(rainPeriods));
  
  // 温度建议
  let clothingAdvice = '';
  if (avgTemp < 15) {
    clothingAdvice = '较冷，建议穿厚外套、毛衣';
  } else if (avgTemp < 20) {
    clothingAdvice = '凉爽，建议穿薄外套、长袖';
  } else if (avgTemp < 25) {
    clothingAdvice = '适宜，建议穿薄外套或长袖';
  } else if (avgTemp < 30) {
    clothingAdvice = '较热，建议穿短袖、薄衫';
  } else {
    clothingAdvice = '炎热，建议穿短袖，注意防暑';
  }
  
  // 降雨建议
  const rainAdvice = generateRainAdvice(rainPeriods);
  console.log('降雨建议:', rainAdvice);
  
  // 紫外线建议
  let uvAdvice = '';
  let uvDisplay = '';
  let uvSource = uvDataSource;
  
  if (uvIndex !== null && uvIndex !== undefined) {
    if (uvIndex <= 2) {
      uvAdvice = '紫外线弱，无需特别防护';
      uvDisplay = `紫外线指数 ${uvIndex}（弱）`;
    } else if (uvIndex <= 5) {
      uvAdvice = '紫外线中等，建议涂防晒霜';
      uvDisplay = `紫外线指数 ${uvIndex}（中等）`;
    } else if (uvIndex <= 7) {
      uvAdvice = '紫外线强，必须涂防晒霜，戴帽子';
      uvDisplay = `紫外线指数 ${uvIndex}（强）`;
    } else if (uvIndex <= 10) {
      uvAdvice = '紫外线很强，避免外出，涂防晒戴帽';
      uvDisplay = `紫外线指数 ${uvIndex}（很强）`;
    } else {
      uvAdvice = '紫外线极强，尽量不外出';
      uvDisplay = `紫外线指数 ${uvIndex}（极强）`;
    }
  } else {
    if (weatherDesc.includes('晴') || weatherDesc.includes('多云')) {
      uvAdvice = '紫外线较强，建议涂防晒霜，戴帽子';
      uvDisplay = '紫外线较强（推断）';
    } else if (weatherDesc.includes('阴')) {
      uvAdvice = '紫外线中等，建议涂防晒霜';
      uvDisplay = '紫外线中等（推断）';
    } else {
      uvAdvice = '紫外线较弱，无需特别防护';
      uvDisplay = '紫外线较弱（推断）';
    }
    uvSource = '根据天气状况推断';
  }
  
  console.log('紫外线建议:', uvAdvice);
  console.log('紫外线数据来源:', uvSource);
  
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getUTCDate()).padStart(2, '0');
  
  return {
    location: '海埂大坝',
    isToday: isToday,
    date: `${month}月${day}日`,
    timeRange: '07:00-11:00',
    icon: weatherIcon,
    temp: avgTemp,
    tempRange: `${minTemp}°C ~ ${maxTemp}°C`,
    desc: weatherDesc,
    uvDisplay: uvDisplay,
    uvSource: uvSource,
    rainDetails: rainPeriods,
    advice: {
      clothing: clothingAdvice,
      rain: rainAdvice,
      uv: uvAdvice
    }
  };
}

// 根据天气描述获取图标
function getWeatherIcon(desc) {
  if (desc.includes('晴')) return '☀️';
  if (desc.includes('多云')) return '⛅';
  if (desc.includes('阴')) return '☁️';
  if (desc.includes('雨')) return '🌧️';
  if (desc.includes('雷')) return '⛈️';
  if (desc.includes('雪')) return '❄️';
  if (desc.includes('雾')) return '🌫️';
  return '🌤️';
}
