"""
酷狗音乐爬虫实现
通过解析HTML页面获取榜单数据
"""

import re
from typing import Optional

from bs4 import BeautifulSoup

from .base import BaseSpider, SongInfo


# ============================================================
# 榜单配置
# ============================================================

CHART_CONFIG: dict[str, str] = {
    "6666":  "酷狗飙升榜",
    "52144": "抖音热歌榜",
    "52767": "快手热歌榜",
    "24971": "DJ热歌榜",
    "31308": "内地榜",
}


class KugouSpider(BaseSpider):
    """
    酷狗音乐榜单爬虫

    实现思路：
    - 酷狗音乐排行榜页面是服务端渲染的静态 HTML
    - 歌曲列表在 <ul> 中，每首歌是一个 <li> 元素
    - <li> 的 title 属性格式为 "歌手 - 歌曲名"
    - <span class="pc_temp_num"> 包含排名
    - 使用 BeautifulSoup 解析即可，无需调用额外 API
    """

    def __init__(self, list_id: str = "8888", page: int = 1) -> None:
        """
        Parameters
        ----------
        list_id : str
            榜单 ID，默认 "8888"（酷狗TOP500）
        page : int
            页码，默认 1（酷狗榜单分页，每页通常 22 首）
        """
        self.list_id = list_id
        self.page = page
        list_name = CHART_CONFIG.get(list_id, f"未知榜单({list_id})")

        super().__init__(
            platform_name="kugou",
            list_name=list_name,
            base_url=f"https://www.kugou.com/yy/rank/home/{page}-{list_id}.html",
            request_interval=(1.0, 3.0),
        )

    # ----------------------------------------------------------
    # 实现抽象方法
    # ----------------------------------------------------------

    def fetch(self) -> str:
        """
        请求酷狗音乐榜单页面。
        """
        extra_headers = {
            "Referer": "https://www.kugou.com/",
        }
        return self._request(self.base_url, headers={**self._get_headers(), **extra_headers})

    def parse(self, html: str) -> list[SongInfo]:
        """
        解析 HTML，提取歌曲列表。

        页面结构：
        <li class="" title="歌手 - 歌曲名" data-index="0" data-eid="xxx">
            <span class="pc_temp_num"><strong>1</strong></span>
            <a class="pc_temp_songname" href="..." title="歌手 - 歌曲名">
                歌曲名
                <span style="color: #999;"> - 歌手</span>
            </a>
            <span class="pc_temp_time">3:44</span>
        </li>
        """
        soup = BeautifulSoup(html, "html.parser")

        # 找到歌曲列表容器
        song_list = soup.select("#rankWrap .pc_temp_songlist ul li")
        if not song_list:
            # 尝试备用选择器
            song_list = soup.select("div.pc_temp_songlist ul li")

        if not song_list:
            self.logger.error("未找到歌曲列表，页面结构可能已变更")
            return []

        songs: list[SongInfo] = []
        for idx, li in enumerate(song_list):
            try:
                song = self._parse_song_item(li, idx)
                if song:
                    songs.append(song)
            except Exception as e:
                self.logger.warning(f"解析第 {idx + 1} 首歌曲时出错: {e}")
                continue

        return songs

    def _parse_song_item(self, li, index: int) -> Optional[SongInfo]:
        """
        解析单个 <li> 元素，提取歌曲信息。

        优先从 title 属性提取 "歌手 - 歌曲名"，
        如果 title 不可用则从 <a> 标签和内部 <span> 提取。
        """
        # 1. 提取排名
        rank_elem = li.select_one("span.pc_temp_num")
        if rank_elem:
            # 优先取 <strong> 中的数字
            strong = rank_elem.select_one("strong")
            rank_text = strong.get_text(strip=True) if strong else rank_elem.get_text(strip=True)
            # 清理排名文本，去掉非数字字符
            rank_text = re.sub(r'[^\d]', '', rank_text)
            rank = int(rank_text) if rank_text else index + 1
        else:
            rank = index + 1

        # 2. 提取歌曲名和歌手
        title_attr = li.get("title", "")
        name = ""
        artist = ""

        if title_attr and " - " in title_attr:
            # title 格式: "歌手 - 歌曲名"
            parts = title_attr.split(" - ", 1)
            artist = parts[0].strip()
            name = parts[1].strip()
        else:
            # 备用方案：从 <a> 标签提取
            song_link = li.select_one("a.pc_temp_songname")
            if song_link:
                # 获取链接文本（不含子元素的纯文本是歌曲名）
                link_text = song_link.get_text(strip=True)
                # 去掉 " - 歌手" 部分
                if " - " in link_text:
                    parts = link_text.split(" - ", 1)
                    name = parts[0].strip()
                    artist = parts[1].strip()
                else:
                    name = link_text
                    # 尝试从 <span style="color:#999"> 提取歌手
                    singer_span = song_link.select_one("span[style*='color']")
                    if singer_span:
                        singer_text = singer_span.get_text(strip=True)
                        artist = singer_text.lstrip(" -").strip()

        if not name:
            return None

        # 3. 提取歌曲 ID（从链接 href）
        song_id = ""
        song_link = li.select_one("a[href*='/mixsong/']")
        if song_link:
            href = song_link.get("href", "")
            match = re.search(r'/mixsong/(\w+)\.html', href)
            if match:
                song_id = match.group(1)

        # 如果没有从链接获取到 ID，使用 data-eid 属性
        if not song_id:
            song_id = li.get("data-eid", "")

        return SongInfo(
            rank=rank,
            song_id=song_id,
            name=name,
            artist=artist,
        )

    def fetch_all_pages(self, max_pages: int = 3, max_songs: int = 50) -> list[SongInfo]:
        """
        抓取所有分页的数据。

        酷狗榜单分多页显示，每页约 22 首。
        此方法自动翻页抓取，合并结果。

        Parameters
        ----------
        max_pages : int
            最大抓取页数，默认 3
        max_songs : int
            最大歌曲数量，默认 50

        Returns
        -------
        list[SongInfo]
            合并后的完整歌曲列表
        """
        all_songs: list[SongInfo] = []

        for page in range(1, max_pages + 1):
            self.logger.info(f"正在抓取第 {page} 页...")
            self.page = page
            self.base_url = f"https://www.kugou.com/yy/rank/home/{page}-{self.list_id}.html"

            try:
                html = self.fetch()
                songs = self.parse(html)

                if not songs:
                    self.logger.info(f"第 {page} 页无数据，停止翻页")
                    break

                all_songs.extend(songs)
                self.logger.info(f"第 {page} 页获取 {len(songs)} 首歌曲")

            except Exception as e:
                self.logger.error(f"第 {page} 页抓取失败: {e}")
                break

        # 限制歌曲数量
        if len(all_songs) > max_songs:
            all_songs = all_songs[:max_songs]

        # 重新分配 rank，确保从1开始连续
        for idx, song in enumerate(all_songs):
            song.rank = idx + 1

        self.logger.info(f"共获取 {len(all_songs)} 首歌曲")
        return all_songs


# ----------------------------------------------------------
# 便捷入口
# ----------------------------------------------------------

def create_kugou_spider(list_id: str = "8888", page: int = 1) -> KugouSpider:
    """工厂函数，根据榜单 ID 创建酷狗音乐爬虫实例"""
    return KugouSpider(list_id=list_id, page=page)
