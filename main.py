"""
每日音乐榜单聚合工具 —— 入口文件

用法：
    # 抓取网易云热歌榜（默认）
    python main.py

    # 指定平台和榜单
    python main.py --platform netease --list-id 3779629
    python main.py --platform qqmusic --list-id 26
    python main.py --platform kugou --list-id 8888

    # 抓取单个平台所有主要榜单
    python main.py --platform netease --all
    python main.py --platform qqmusic --all
    python main.py --platform kugou --all

    # 抓取所有平台的所有主要榜单
    python main.py --all
"""

import argparse
import sys
import time

from crawlers import (
    NeteaseSpider, NETEASE_CHARTS,
    QQMusicSpider, QQMUSIC_CHARTS,
    KugouSpider, KUGOU_CHARTS,
)


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
        "default_id": "6666",
        "name": "酷狗音乐",
    },
}


# ============================================================
# 运行函数
# ============================================================

def run_spider(platform: str, list_id: str | None = None) -> None:
    """运行单个平台的单个榜单爬虫"""
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

    if songs:
        print(f"\n{'='*50}")
        print(f"  {config['name']} · {spider.list_name} (共 {len(songs)} 首)")
        print(f"{'='*50}")
        for s in songs[:20]:
            print(f"  {s.rank:>3}. {s.name:<30} - {s.artist}")
        if len(songs) > 20:
            print(f"  ... 还有 {len(songs) - 20} 首，详见 JSON 文件")
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
# 主入口
# ============================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="每日音乐榜单聚合工具 —— 自动获取各大音乐平台排行榜数据",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py                                # 默认抓取网易云热歌榜
  python main.py --platform qqmusic             # 抓取QQ音乐热歌榜
  python main.py --platform kugou --list-id 6666  # 抓取酷狗飙升榜
  python main.py --platform netease --all       # 抓取网易云所有榜单
  python main.py --all                          # 抓取所有平台所有榜单
  python main.py --list                         # 显示所有可用榜单
        """,
    )

    parser.add_argument(
        "--platform", "-p",
        type=str,
        choices=["netease", "qqmusic", "kugou"],
        default=None,
        help="音乐平台 (默认: netease)",
    )
    parser.add_argument(
        "--list-id", "-i",
        type=str,
        default=None,
        help="榜单 ID（使用 --list 查看可用ID）",
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="抓取所有主要榜单",
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="显示所有可用榜单",
    )

    args = parser.parse_args()

    # 显示榜单列表
    if args.list:
        list_charts()
        return

    # 抓取所有平台（--all 且未指定平台）
    if args.all and args.platform is None:
        run_all_platforms()
    # 抓取单个平台所有榜单（--all 且指定了平台）
    elif args.all:
        run_platform_all(args.platform)
    # 抓取单个榜单（未指定平台时默认 netease）
    else:
        platform = args.platform or "netease"
        run_spider(platform, args.list_id)

    print("Done!")


if __name__ == "__main__":
    main()
