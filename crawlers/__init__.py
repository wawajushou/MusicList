"""
musictool.crawlers —— 音乐榜单爬虫模块

对外导出：
- BaseSpider      : 爬虫基类，扩展新平台时继承它
- SongInfo        : 歌曲信息数据类
- NeteaseSpider   : 网易云音乐爬虫
- QQMusicSpider   : QQ音乐爬虫
- KugouSpider     : 酷狗音乐爬虫
"""

from .base import BaseSpider, SongInfo, ChartResult
from .netease import NeteaseSpider, CHART_CONFIG as NETEASE_CHARTS
from .qqmusic import QQMusicSpider, CHART_CONFIG as QQMUSIC_CHARTS
from .kugou import KugouSpider, CHART_CONFIG as KUGOU_CHARTS

__all__ = [
    "BaseSpider",
    "SongInfo",
    "ChartResult",
    "NeteaseSpider",
    "NETEASE_CHARTS",
    "QQMusicSpider",
    "QQMUSIC_CHARTS",
    "KugouSpider",
    "KUGOU_CHARTS",
]
