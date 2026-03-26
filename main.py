"""
每日直播歌单工具 —— 入口文件

功能：
- 爬取各大音乐平台榜单数据
- 自动生成明日直播歌单

用法：
    python main.py                    # 默认：更新榜单，生成歌单
    python main.py --crawl            # 仅爬取榜单（不生成歌单）
    python main.py --playlist         # 仅生成歌单（不爬取）
    python main.py --all              # 爬取所有平台所有榜单
    python main.py --list             # 显示所有可用榜单
"""

import argparse
import sys
import time
from datetime import datetime
from pathlib import Path

from crawlers import (
    NeteaseSpider, NETEASE_CHARTS,
    QQMusicSpider, QQMUSIC_CHARTS,
    KugouSpider, KUGOU_CHARTS,
)
from generator.playlist_gen import PlaylistGenerator


# ============================================================
# 平台配置
# ============================================================

PLATFORMS = {
    "netease": {
        "spider_cls": NeteaseSpider,
        "charts": NETEASE_CHARTS,
        "default_id": "3778678",
        "name": "网易云音乐",
    },
    "qqmusic": {
        "spider_cls": QQMusicSpider,
        "charts": QQMUSIC_CHARTS,
        "default_id": "26",
        "name": "QQ音乐",
    },
    "kugou": {
        "spider_cls": KugouSpider,
        "charts": KUGOU_CHARTS,
        "default_id": "24971",  # 默认 DJ 热歌榜
        "name": "酷狗音乐",
    },
}

# 默认爬取的榜单：酷狗 DJ热歌榜 + 酷狗飙升榜
DEFAULT_CHARTS = [
    {"platform": "kugou", "chart_id": "24971", "chart_name": "DJ热歌榜"},
    {"platform": "kugou", "chart_id": "6666", "chart_name": "酷狗飙升榜"},
]

# 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent


# ============================================================
# 爬虫运行函数
# ============================================================

def run_spider(platform: str, list_id: str | None = None, silent: bool = False) -> None:
    """
    运行单个平台的单个榜单爬虫

    Parameters
    ----------
    platform : str
        平台名称
    list_id : str | None
        榜单 ID
    silent : bool
        是否静默模式（不显示歌单详情）
    """
    config = PLATFORMS[platform]
    spider_cls = config["spider_cls"]
    _id = list_id or config["default_id"]

    if platform == "kugou":
        # 酷狗需要多页抓取
        spider = spider_cls(list_id=_id)
        songs = spider.fetch_all_pages(max_pages=3, max_songs=50)
        if songs:
            spider.save(songs)
    elif platform == "qqmusic":
        spider = spider_cls(list_id=_id, num=50)
        songs = spider.run()
    else:
        spider = spider_cls(list_id=_id)
        songs = spider.run()

    # 非静默模式下显示歌单详情
    if songs and not silent:
        print(f"\n{'='*50}")
        print(f"  {config['name']} · {spider.list_name} (共 {len(songs)} 首)")
        print(f"{'='*50}")
        for s in songs[:10]:
            print(f"  {s.rank:>3}. {s.name:<30} - {s.artist}")
        if len(songs) > 10:
            print(f"  ... 还有 {len(songs) - 10} 首，详见 JSON 文件")
        print()


def run_platform_all(platform: str) -> None:
    """抓取单个平台的所有主要榜单"""
    config = PLATFORMS[platform]
    spider_cls = config["spider_cls"]
    charts = config["charts"]

    print(f"\n{'#'*50}")
    print(f"  开始抓取 {config['name']} 所有榜单")
    print(f"{'#'*50}")

    for list_id, name in charts.items():
        print(f"\n>>> {name} (ID: {list_id})")

        if platform == "kugou":
            spider = spider_cls(list_id=list_id)
            songs = spider.fetch_all_pages(max_pages=3, max_songs=50)
        elif platform == "qqmusic":
            spider = spider_cls(list_id=list_id, num=50)
            songs = spider.run()
        else:
            spider = spider_cls(list_id=list_id)
            songs = spider.run()

        if songs:
            spider.save(songs)

        time.sleep(2)


def run_all_platforms() -> None:
    """抓取所有平台的所有主要榜单"""
    for platform in PLATFORMS:
        run_platform_all(platform)
        time.sleep(3)


def list_charts() -> None:
    """显示所有可用榜单"""
    print("\n可用榜单列表：")
    print("=" * 60)

    for platform, config in PLATFORMS.items():
        print(f"\n【{config['name']}】 (--platform {platform})")
        for list_id, name in config["charts"].items():
            print(f"  {list_id:<8} {name}")


# ============================================================
# 歌单生成
# ============================================================

def run_playlist_generator() -> None:
    """运行歌单生成器"""
    data_dir = PROJECT_ROOT / "data"
    generator = PlaylistGenerator(data_dir=str(data_dir))
    generator.run()


# ============================================================
# 默认流程：更新榜单 -> 生成歌单
# ============================================================

def run_default_flow() -> None:
    """
    默认流程：
    1. 每次运行都爬取更新所有榜单
    2. 运行歌单生成器
    """
    today = datetime.now().strftime("%Y-%m-%d")

    print("=" * 60)
    print("  每日直播歌单工具")
    print(f"  日期: {today}")
    print("=" * 60)
    print()

    # 每次都爬取更新所有榜单
    for chart in DEFAULT_CHARTS:
        platform = chart["platform"]
        chart_id = chart["chart_id"]
        chart_name = chart["chart_name"]

        print(f"正在更新 {chart_name}...")
        run_spider(platform, chart_id, silent=True)
        current_time = datetime.now().strftime("%H:%M:%S")
        print(f"[OK] {chart_name} 数据于 {current_time} 已更新")
        print()

    # 运行歌单生成器
    print("-" * 60)
    run_playlist_generator()


# ============================================================
# 主入口
# ============================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="每日直播歌单工具 —— 爬取榜单 + 生成歌单",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py                    # 默认流程：更新榜单 -> 生成歌单
  python main.py --crawl            # 仅爬取榜单
  python main.py --playlist         # 仅生成歌单（不爬取）
  python main.py --all              # 爬取所有平台所有榜单
  python main.py --list             # 显示所有可用榜单
        """,
    )

    parser.add_argument(
        "--crawl", "-c",
        action="store_true",
        help="仅爬取榜单（默认爬取酷狗DJ热歌榜）",
    )
    parser.add_argument(
        "--playlist", "-g",
        action="store_true",
        help="仅生成歌单（不爬取）",
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="爬取所有平台所有榜单",
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="显示所有可用榜单",
    )
    parser.add_argument(
        "--platform", "-p",
        type=str,
        choices=["netease", "qqmusic", "kugou"],
        default=None,
        help="指定平台（与 --crawl 配合使用）",
    )
    parser.add_argument(
        "--list-id", "-i",
        type=str,
        default=None,
        help="指定榜单 ID（与 --crawl 配合使用）",
    )

    args = parser.parse_args()

    # 显示榜单列表
    if args.list:
        list_charts()
        return

    # 爬取所有平台
    if args.all:
        run_all_platforms()
        return

    # 仅爬取榜单
    if args.crawl:
        if args.platform:
            # 指定了平台，使用指定的平台和榜单
            platform = args.platform
            list_id = args.list_id
        else:
            # 未指定平台，默认爬取第一个榜单（DJ热歌榜）
            platform = DEFAULT_CHARTS[0]["platform"]
            list_id = args.list_id or DEFAULT_CHARTS[0]["chart_id"]
        run_spider(platform, list_id)
        print("Done!")
        return

    # 仅生成歌单
    if args.playlist:
        run_playlist_generator()
        return

    # 默认流程：更新榜单 -> 生成歌单
    run_default_flow()


if __name__ == "__main__":
    main()
