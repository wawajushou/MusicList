"""
QQ音乐爬虫实现
通过官方公开API获取榜单数据，稳定性高
"""

import json
from typing import Optional
from urllib.parse import quote

import requests

from .base import BaseSpider, SongInfo


# ============================================================
# 榜单配置
# ============================================================

CHART_CONFIG: dict[str, str] = {
    "4":   "飙升榜",
    "26":  "热歌榜",
    "28":  "内地榜",
}


class QQMusicSpider(BaseSpider):
    """
    QQ音乐榜单爬虫

    实现思路：
    - QQ音乐排行榜数据通过 u.y.qq.com 的公开 API 获取
    - API 返回标准 JSON，包含完整的歌曲排名、歌名、歌手等信息
    - 无需解析 HTML，直接处理 JSON 即可
    """

    API_URL: str = "https://u.y.qq.com/cgi-bin/musicu.fcg"

    def __init__(self, list_id: str = "26", num: int = 50) -> None:
        """
        Parameters
        ----------
        list_id : str
            榜单 ID，默认 "26"（热歌榜）
        num : int
            获取歌曲数量，默认 50（最多50首）
        """
        self.list_id = list_id
        self.num = num
        list_name = CHART_CONFIG.get(list_id, f"未知榜单({list_id})")

        super().__init__(
            platform_name="qqmusic",
            list_name=list_name,
            base_url=f"https://y.qq.com/n/ryqq/toplist/{list_id}",
            request_interval=(1.0, 3.0),
        )

    # ----------------------------------------------------------
    # 实现抽象方法
    # ----------------------------------------------------------

    def fetch(self) -> str:
        """
        请求QQ音乐排行榜 API。
        该API无需特殊认证，但需要构造正确的 data 参数。
        """
        # 构造请求参数
        payload = {
            "comm": {"ct": 24},
            "topList": {
                "module": "musicToplist.ToplistInfoServer",
                "method": "GetDetail",
                "param": {
                    "topId": int(self.list_id),
                    "offset": 0,
                    "num": self.num,
                },
            },
        }

        params = {
            "format": "json",
            "inCharset": "utf-8",
            "outCharset": "utf-8",
            "platform": "yqq",
            "data": json.dumps(payload, ensure_ascii=False),
        }

        extra_headers = {
            "Referer": "https://y.qq.com/",
        }

        # 拼接完整 URL
        query = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
        url = f"{self.API_URL}?{query}"

        return self._request(url, headers={**self._get_headers(), **extra_headers})

    def parse(self, html: str) -> list[SongInfo]:
        """
        解析 API 返回的 JSON 数据。

        响应结构：
        {
          "topList": {
            "data": {
              "data": {
                "title": "热歌榜",
                "song": [
                  {"rank": 1, "title": "xxx", "singerName": "yyy", "songId": 123},
                  ...
                ]
              }
            }
          }
        }
        """
        try:
            data = json.loads(html)
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON 解析失败: {e}")
            return []

        # 导航到歌曲列表
        try:
            top_data = data["topList"]["data"]["data"]
            songs_raw: list[dict] = top_data.get("song", [])
        except (KeyError, TypeError) as e:
            self.logger.error(f"JSON 结构异常，无法提取歌曲列表: {e}")
            return []

        if not songs_raw:
            self.logger.warning("API 返回的歌曲列表为空")
            return []

        # 提取字段
        songs: list[SongInfo] = []
        for item in songs_raw:
            try:
                rank = item.get("rank", 0)
                song_id = str(item.get("songId", ""))
                name = item.get("title", "").strip()
                artist = item.get("singerName", "").strip()

                # 歌手名可能是 "xxx/yyy" 格式，已经是拼接好的
                songs.append(SongInfo(
                    rank=rank,
                    song_id=song_id,
                    name=name,
                    artist=artist,
                ))
            except Exception as e:
                self.logger.warning(f"解析歌曲时出错: {e}, item={item}")
                continue

        return songs


# ----------------------------------------------------------
# 便捷入口
# ----------------------------------------------------------

def create_qqmusic_spider(list_id: str = "26", num: int = 100) -> QQMusicSpider:
    """工厂函数，根据榜单 ID 创建QQ音乐爬虫实例"""
    return QQMusicSpider(list_id=list_id, num=num)
