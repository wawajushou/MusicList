"""
爬虫基类模块
定义所有音乐平台爬虫的通用接口和公共逻辑
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path
from typing import Optional
import json
import logging
import random
import time

import requests


# ============================================================
# 数据模型
# ============================================================

@dataclass
class SongInfo:
    """歌曲信息数据类，作为爬虫解析结果的统一载体"""
    rank: int               # 排名（从 1 开始）
    song_id: str            # 平台歌曲 ID
    name: str               # 歌曲名称
    artist: str             # 歌手 / 艺术家名称
    album: str = ""         # 专辑名称（可选）


@dataclass
class ChartResult:
    """一次抓取任务的完整结果"""
    platform: str           # 平台标识（如 "netease"）
    list_name: str          # 榜单名称（如 "热歌榜"）
    date: str               # 抓取日期 YYYY-MM-DD
    update_time: str        # 任务执行时间 ISO 格式
    songs: list[dict] = field(default_factory=list)


# ============================================================
# 常量
# ============================================================

# 模拟浏览器的 User-Agent 池，随机选取以降低被识别风险
USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) "
    "Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]

# 项目根目录（crawlers/ 的上一级）
PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent


# ============================================================
# 爬虫基类
# ============================================================

class BaseSpider(ABC):
    """
    所有音乐平台爬虫的基类。

    设计思路：
    - 子类只需实现 fetch() 和 parse() 两个抽象方法
    - 基类负责日志、HTTP 请求封装、数据持久化、异常兜底
    - run() 方法串联完整流程，外部调用者只需 spider.run()
    """

    def __init__(
        self,
        platform_name: str,
        list_name: str,
        base_url: str,
        request_interval: tuple[float, float] = (1.0, 3.0),
        timeout: int = 15,
    ) -> None:
        """
        Parameters
        ----------
        platform_name : str
            平台唯一标识，如 "netease"、"qqmusic"
        list_name : str
            榜单中文名称，如 "热歌榜"
        base_url : str
            榜单页面地址
        request_interval : tuple[float, float]
            请求间隔随机范围（秒），模拟人类浏览节奏
        timeout : int
            单次 HTTP 请求超时秒数
        """
        self.platform_name = platform_name
        self.list_name = list_name
        self.base_url = base_url
        self.request_interval = request_interval
        self.timeout = timeout

        # 日志记录器
        self.logger = self._setup_logger()

        # 本次运行的日期（可被子类或外部覆盖）
        self.today: str = datetime.now().strftime("%Y-%m-%d")

    # ----------------------------------------------------------
    # 日志
    # ----------------------------------------------------------

    def _setup_logger(self) -> logging.Logger:
        """为当前爬虫实例创建独立的 logger，同时输出到控制台和日志文件"""
        logger = logging.getLogger(f"musictool.{self.platform_name}")
        logger.setLevel(logging.DEBUG)

        # 避免重复添加 handler（多次实例化时）
        if logger.handlers:
            return logger

        formatter = logging.Formatter(
            fmt="%(asctime)s [%(name)s] %(levelname)s  %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        # 控制台 handler（INFO 级别）
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        # 文件 handler（DEBUG 级别）
        log_dir = PROJECT_ROOT / "logs"
        log_dir.mkdir(exist_ok=True)
        file_handler = logging.FileHandler(
            log_dir / f"{self.platform_name}.log", encoding="utf-8"
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        return logger

    # ----------------------------------------------------------
    # HTTP 请求封装
    # ----------------------------------------------------------

    def _get_headers(self) -> dict[str, str]:
        """构造请求头，随机 User-Agent"""
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }

    def _request(self, url: str, headers: Optional[dict] = None) -> str:
        """
        发送 GET 请求并返回响应文本。
        封装了超时、重试、随机间隔等通用逻辑。

        Raises
        ------
        requests.RequestException
            请求最终失败时抛出
        """
        if headers is None:
            headers = self._get_headers()

        # 请求前随机等待，避免高频访问
        delay = random.uniform(*self.request_interval)
        self.logger.debug(f"等待 {delay:.2f}s 后请求: {url}")
        time.sleep(delay)

        self.logger.info(f"正在请求: {url}")
        response = requests.get(url, headers=headers, timeout=self.timeout)
        response.raise_for_status()
        response.encoding = response.apparent_encoding or "utf-8"
        self.logger.debug(f"响应状态: {response.status_code}, 长度: {len(response.text)}")
        return response.text

    # ----------------------------------------------------------
    # 数据持久化
    # ----------------------------------------------------------

    def save(self, songs: list[SongInfo], date: Optional[str] = None) -> Path:
        """
        将解析结果保存为 JSON 文件。
        路径格式: data/{date}/{platform_name}_{list_name}.json

        Returns
        -------
        Path
            实际写入的文件路径
        """
        if date is None:
            date = self.today

        # 构造输出目录: data/{platform}/{list_name}/
        output_dir = PROJECT_ROOT / "data" / self.platform_name / self.list_name
        output_dir.mkdir(parents=True, exist_ok=True)

        # 文件名: {date}.json
        filename = f"{date}.json"
        file_path = output_dir / filename

        # 组装数据结构
        result = ChartResult(
            platform=self.platform_name,
            list_name=self.list_name,
            date=date,
            update_time=datetime.now().isoformat(),
            songs=[asdict(s) for s in songs],
        )

        # 写入 JSON
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(asdict(result), f, ensure_ascii=False, indent=2)

        self.logger.info(f"数据已保存至: {file_path}  (共 {len(songs)} 首)")
        return file_path

    # ----------------------------------------------------------
    # 抽象方法 —— 子类必须实现
    # ----------------------------------------------------------

    @abstractmethod
    def fetch(self) -> str:
        """
        获取榜单页面的 HTML 内容。
        子类可根据目标平台特点自行实现（如需要特殊 header、cookie 等）。
        """

    @abstractmethod
    def parse(self, html: str) -> list[SongInfo]:
        """
        解析 HTML，提取歌曲列表。
        返回 SongInfo 列表，按排名升序排列。
        """

    # ----------------------------------------------------------
    # 主流程
    # ----------------------------------------------------------

    def run(self) -> list[SongInfo]:
        """
        执行一次完整的抓取流程：获取 -> 解析 -> 保存。
        包含异常兜底，单平台失败不会导致整个程序崩溃。

        Returns
        -------
        list[SongInfo]
            解析到的歌曲列表；若失败则返回空列表
        """
        self.logger.info(f"===== 开始抓取 [{self.platform_name}] {self.list_name} =====")
        songs: list[SongInfo] = []

        try:
            # 第一步：获取页面
            html = self.fetch()

            # 第二步：解析数据
            songs = self.parse(html)
            if not songs:
                self.logger.warning("解析结果为空，请检查页面结构是否变更")
                return songs

            self.logger.info(f"成功解析 {len(songs)} 首歌曲")

            # 第三步：持久化存储
            self.save(songs)

        except requests.RequestException as e:
            self.logger.error(f"网络请求失败: {e}")
        except Exception as e:
            self.logger.exception(f"抓取过程发生未知异常: {e}")

        self.logger.info(f"===== [{self.platform_name}] {self.list_name} 抓取结束 =====")
        return songs
