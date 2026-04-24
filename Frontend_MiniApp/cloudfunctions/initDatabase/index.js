const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const BASE_LIBRARY = [
  { song_name: "深情只是个笑话", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "心上的罗加", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "画你", vibe: "动感热场 (适合带动气氛)", tempo: "中", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "今生最爱", vibe: "动感热场 (适合带动气氛)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "情罪", vibe: "抒情走心 (适合安静聆听)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "往事只能回味", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "心上人出嫁", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "爱情着了火", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "终于把你遇见", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "酒醉的蝴蝶", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "爱情一场梦", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "手心有你", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "你是我的城堡", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "情网", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "殇雪", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "童年老家", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "如是", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "心雨", vibe: "抒情走心 (易引发共鸣)", tempo: "快", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "百万个吻", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "晚风", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "蓝眼泪", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "旧梦", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "你本来就很美", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "来与不来我都在等你", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "好了伤疤忘了疼", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "有生之恋", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "寻找远方的你", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "我的楼兰", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "总以为来日方长", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "娥嫚", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "乌兰巴托的夜", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "月亮照山川", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "一路上有你", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "战马", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "半壶纱", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "最远的你是我最近的爱", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "青花", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "情火", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "一路生花", vibe: "抒情走心 (适合安静聆听)", tempo: "快", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "化风行万里", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "火火的姑娘", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "你的眼角流着我的泪", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "惜别的海岸", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "想你一次落一粒沙", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "露水情分泪满瞳", vibe: "抒情走心 (适合安静聆听)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "英雄泪", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "缘为冰", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "我曾用心爱着你", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "漂洋过海来看你", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "再也不是你", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "从此眼里都是你", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "听心", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "不能不想你", vibe: "抒情走心 (适合安静聆听)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "童年", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "哑巴新娘", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "昨夜星辰", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "只想跟你走", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "泪海", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "忘了你忘了我", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "翩翩", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "除了你", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "黄梅戏", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "潇洒走一回", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "西海情歌", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "追梦人", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "背着风流泪", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "咎由自取", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "见一面少一面", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "隐形的翅膀", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "白狐", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "桥边姑娘", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "后海酒吧", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "迟来的爱", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "既然你已不爱我", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "最美的情缘", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "拥有的回忆", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "埋在心底的爱", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "你是我唯一的执着", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "真的爱着你", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "明月夜", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "风雨中的承诺", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "约定", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "人生何处", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "一剪梅", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "恭喜发财", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "为你祈祷", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "从前说", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "不挽留没回头", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "最真的梦", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "雨蝶", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "成都", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "这一路", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "临近下播 (升华感情、固粉)" },
  { song_name: "拉萨夜雨", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "最美的期待", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "我曾像傻子一样爱你", vibe: "动感热场 (适合带动气氛)", tempo: "中", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "如水年华", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "高山青", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "被宠爱", vibe: "动感热场 (适合带动气氛，引发共鸣)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "我的梦", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "最幸福的人", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "命中注定", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "有一种思念叫永远", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "花轿里的人", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "手心里的温柔", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "天际", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "太多", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "千年等一回", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "青城山下白素贞", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "桃花诺", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "梦底", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "女人花", vibe: "经典回忆 (高传唱度，易引发共鸣)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "风吹麦浪", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "花心", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "苹果香", vibe: "动感热场 (适合带动气氛)", tempo: "快", broadcast_stage: "开播前期 (需要拉留存、吸引路人)" },
  { song_name: "如果一切可以重来", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "诺言", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "想你的时候问月亮", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "阿爸阿妈", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" },
  { song_name: "红山果", vibe: "抒情走心 (适合安静聆听)", tempo: "中", broadcast_stage: "直播中场 (稳固粉丝、提供情绪价值)" }
];

// 分批导入，每批20条，避免超时
async function importBatch(songs, batchIndex) {
  const baseLibCol = db.collection('baseLibrary');
  let successCount = 0;
  
  for (const song of songs) {
    try {
      await baseLibCol.add({ data: song });
      successCount++;
    } catch (e) {
      console.error(`导入失败: ${song.song_name}`, e.message);
    }
  }
  return successCount;
}

exports.main = async (event, context) => {
  console.log('========== 开始初始化数据库 ==========');
  console.log(`曲库总数: ${BASE_LIBRARY.length} 首`);

  try {
    // 1. 先检查当前曲库数量，如果已经是119首就跳过
    const baseLibCol = db.collection('baseLibrary');
    const countResult = await baseLibCol.count();
    console.log(`当前曲库数量: ${countResult.total}`);
    
    if (countResult.total >= BASE_LIBRARY.length) {
      console.log('曲库已存在，跳过导入');
      return { success: true, message: `曲库已存在，共 ${countResult.total} 首` };
    }

    // 2. 如果数量不足，先清空再重新导入
    if (countResult.total > 0) {
      console.log('清空现有曲库...');
      // 分批删除，每次删除100条
      while (true) {
        const existing = await baseLibCol.limit(100).get();
        if (existing.data.length === 0) break;
        
        for (const doc of existing.data) {
          await baseLibCol.doc(doc._id).remove();
        }
        console.log(`已删除 ${existing.data.length} 条`);
      }
    }

    // 3. 分批导入曲库
    console.log('开始导入曲库...');
    const batchSize = 20;
    let totalImported = 0;
    
    for (let i = 0; i < BASE_LIBRARY.length; i += batchSize) {
      const batch = BASE_LIBRARY.slice(i, Math.min(i + batchSize, BASE_LIBRARY.length));
      const imported = await importBatch(batch, Math.floor(i / batchSize));
      totalImported += imported;
      console.log(`批次 ${Math.floor(i / batchSize) + 1}: 导入 ${imported} 首`);
      
      // 短暂延迟，避免速率限制
      if (i + batchSize < BASE_LIBRARY.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`导入完成: 共 ${totalImported} 首`);
    return { success: true, message: `成功导入 ${totalImported} 首曲库` };

  } catch (error) {
    console.error('初始化失败:', error);
    return { success: false, error: error.message };
  }
};
