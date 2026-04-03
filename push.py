"""
WxPusher 推送模块
通过 WxPusher 向微信用户推送每日直播歌单
"""

import json
import sys
import requests
from datetime import datetime
from pathlib import Path

from crawlers import KugouSpider
from generator.playlist_gen import PlaylistGenerator


# ============================================================
# 配置
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent
CONFIG_PATH = PROJECT_ROOT / "config.json"
WXPUSHER_API = "https://wxpusher.zjiecode.com/api/send/message"

# 默认爬取的榜单
DEFAULT_CHARTS = [
    {"platform": "kugou", "chart_id": "24971", "chart_name": "DJ热歌榜"},
    {"platform": "kugou", "chart_id": "6666", "chart_name": "酷狗飙升榜"},
]


def load_config() -> dict:
    """加载配置文件"""
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# 爬取榜单
# ============================================================

def crawl_charts() -> None:
    """爬取今日榜单数据"""
    today = datetime.now().strftime("%Y-%m-%d")
    data_dir = PROJECT_ROOT / "data"

    for chart in DEFAULT_CHARTS:
        chart_id = chart["chart_id"]
        chart_name = chart["chart_name"]

        # 检查今日数据是否已存在
        chart_file = data_dir / "kugou" / chart_name / f"{today}.json"
        if chart_file.exists():
            print(f"[OK] {chart_name} 今日数据已存在，跳过")
            continue

        print(f"正在爬取 {chart_name}...")
        spider = KugouSpider(list_id=chart_id)
        songs = spider.fetch_all_pages(max_pages=3, max_songs=50)
        if songs:
            spider.save(songs)
        current_time = datetime.now().strftime("%H:%M:%S")
        print(f"[OK] {chart_name} 数据于 {current_time} 已更新")

    print()


# ============================================================
# 消息格式化
# ============================================================

def format_playlist_message(playlist: dict, suggestions: list) -> str:
    """
    将歌单格式化为可推送的消息

    示例输出：
    📅 2026年3月24日 直播歌单

    【开播前期】12首
      1. 酒醉的蝴蝶
      2. 昨夜的霓虹
    ...

    【直播中场】15首
      13. 化作孤岛的蓝
    ...

    ────────────
    🎵 今日热榜新歌推荐
    ────────────
    • 某某某 (DJ版) - 来自DJ热歌榜
    • 某某某 - 来自酷狗飙升榜
    """
    today = datetime.now().strftime("%Y年%m月%d日")
    lines = []

    lines.append(f"📅 {today} 直播歌单")
    lines.append("")

    # 歌单部分
    song_index = 1
    for stage, songs in playlist.items():
        lines.append(f"【{stage}】{len(songs)}首")
        for song in songs:
            lines.append(f"  {song_index}. {song['song_name']}")
            song_index += 1
        lines.append("")

    # 新歌推荐部分
    if suggestions:
        lines.append("────────────")
        lines.append("🎵 今日热榜新歌推荐")
        lines.append("────────────")
        for song in suggestions:
            source = song.get("source_chart", "").split("/")[-1]
            lines.append(f"• {song['song_name']} - 来自{source}")

    return "\n".join(lines)


# ============================================================
# WxPusher 推送
# ============================================================

def push_message(title: str, content: str) -> dict:
    """
    通过 WxPusher 推送消息

    Parameters
    ----------
    title : str
        消息标题（摘要）
    content : str
        消息正文

    Returns
    -------
    dict
        API 响应结果
    """
    config = load_config()
    wx_config = config["wxpusher"]

    payload = {
        "appToken": wx_config["appToken"],
        "content": content,
        "contentType": 1,  # 1=文字, 2=HTML
        "uids": wx_config["uids"],
        "summary": title,
    }

    response = requests.post(WXPUSHER_API, json=payload)
    return response.json()


# ============================================================
# 主流程
# ============================================================

def main() -> None:
    """生成歌单并推送到微信"""
    # Windows 控制台编码修复
    sys.stdout.reconfigure(encoding='utf-8')

    today = datetime.now().strftime("%Y-%m-%d")

    print("=" * 60)
    print(f"  每日歌单推送")
    print(f"  日期: {today}")
    print("=" * 60)
    print()

    # 1. 爬取今日榜单数据
    crawl_charts()

    # 2. 初始化歌单生成器
    data_dir = PROJECT_ROOT / "data"
    generator = PlaylistGenerator(data_dir=str(data_dir))

    # 3. 加载数据
    generator._load_data()

    # 4. 生成或加载歌单
    playlist = generator._load_or_generate_playlist()

    # 5. 获取新歌推荐
    suggestions = generator._select_new_suggestions()

    # 5. 格式化消息
    title = f"{today} 直播歌单"
    content = format_playlist_message(playlist, suggestions)

    print("-" * 60)
    print("推送内容预览：")
    print("-" * 60)
    print(content)
    print("-" * 60)
    print()

    # 6. 推送
    print("正在推送...")
    result = push_message(title, content)

    if result.get("code") == 1000:
        print(f"[OK] 推送成功！")
        print(f"     消息ID: {result['data'][0]['messageId']}")
    else:
        print(f"[!] 推送失败: {result.get('msg', '未知错误')}")


if __name__ == "__main__":
    main()
