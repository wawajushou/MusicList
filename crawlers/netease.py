"""
网易云音乐爬虫实现
支持抓取网易云音乐各类榜单（热歌榜、新歌榜、飙升榜等）
"""

import json
from typing import Optional

from bs4 import BeautifulSoup

from .base import BaseSpider, SongInfo


# ============================================================
# 榜单配置：ID 与中文名称的映射
# ============================================================

CHART_CONFIG: dict[str, str] = {
    "3778678":  "热歌榜",
    "19723756": "飙升榜",
}


class NeteaseSpider(BaseSpider):
    """
    网易云音乐榜单爬虫

    实现思路：
    - 网易云音乐的榜单页面将完整歌曲数据以 JSON 形式嵌入在
      <textarea id="song-list-pre-data"> 标签中
    - 我们只需用 BeautifulSoup 定位该标签，解析其文本内容即可
      获得结构化的歌曲列表，无需额外调用 API
    """

    def __init__(self, list_id: str = "3778678") -> None:
        """
        Parameters
        ----------
        list_id : str
            榜单 ID，默认 "3778678"（热歌榜）
        """
        self.list_id = list_id
        list_name = CHART_CONFIG.get(list_id, "未知榜单")

        super().__init__(
            platform_name="netease",
            list_name=list_name,
            base_url=f"https://music.163.com/discover/toplist?id={list_id}",
            request_interval=(1.0, 3.0),
        )

    # ----------------------------------------------------------
    # 实现抽象方法
    # ----------------------------------------------------------

    def fetch(self) -> str:
        """
        请求网易云音乐榜单页面。
        需要设置 Referer 头以通过服务端的基础校验。
        """
        extra_headers = {
            "Referer": "https://music.163.com/",
        }
        return self._request(self.base_url, headers={**self._get_headers(), **extra_headers})

    def parse(self, html: str) -> list[SongInfo]:
        """
        解析 HTML，提取歌曲列表。

        网易云页面结构：
        <textarea id="song-list-pre-data">
        [{"name":"xxx", "artists":[{"name":"yyy"}], ...}, ...]
        </textarea>

        每个元素的主要字段：
        - id        : 歌曲 ID
        - name      : 歌曲名称
        - artists   : 歌手列表（取第一个）
        - album.name: 专辑名称
        """
        soup = BeautifulSoup(html, "html.parser")

        # 定位包含数据的 textarea
        textarea = soup.find("textarea", id="song-list-pre-data")
        if textarea is None:
            self.logger.error("未找到 <textarea id='song-list-pre-data'>，页面结构可能已变更")
            return []

        raw_text: str = textarea.get_text()
        if not raw_text.strip():
            self.logger.error("textarea 内容为空")
            return []

        # 解析 JSON
        try:
            songs_raw: list[dict] = json.loads(raw_text)
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON 解析失败: {e}")
            return []

        # 提取字段，构造 SongInfo 列表
        songs: list[SongInfo] = []
        for idx, item in enumerate(songs_raw):
            try:
                song_id = str(item.get("id", ""))
                name = item.get("name", "").strip()

                # 歌手：artists 是一个列表，用 "/" 拼接多人
                artists = item.get("artists", [])
                artist = "/".join(a.get("name", "") for a in artists if a.get("name"))

                # 专辑
                album_obj = item.get("album") or {}
                album = album_obj.get("name", "")

                songs.append(SongInfo(
                    rank=idx + 1,
                    song_id=song_id,
                    name=name,
                    artist=artist,
                    album=album,
                ))
            except Exception as e:
                self.logger.warning(f"解析第 {idx + 1} 首歌曲时出错: {e}")
                continue

        return songs[:50]


# ----------------------------------------------------------
# 便捷入口：直接根据榜单 ID 创建爬虫
# ----------------------------------------------------------

def create_netease_spider(list_id: str = "3778678") -> NeteaseSpider:
    """工厂函数，根据榜单 ID 创建网易云爬虫实例"""
    return NeteaseSpider(list_id=list_id)
