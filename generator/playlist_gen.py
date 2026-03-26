"""
直播歌单自动生成器

功能：
1. 从基础曲库按阶段抽取歌曲生成歌单
2. 每日歌单保持一致（存储到文件）
3. 从每日榜单选取新歌推荐（仅展示，不记录）
"""

import json
import random
import re
from datetime import datetime
from pathlib import Path


def normalize_song_name(name: str) -> str:
    """
    标准化歌名：去掉括号内容、特殊符号等

    用于匹配时判断两首歌是否为同一首（不同版本）。

    Examples
    --------
    >>> normalize_song_name("情罪（DJ版）")
    "情罪"
    >>> normalize_song_name("我曾像傻子一样爱你 (DJEva版)")
    "我曾像傻子一样爱你"
    """
    # 去掉中文括号及其内容
    name = re.sub(r'（.*?）', '', name)
    # 去掉英文括号及其内容
    name = re.sub(r'\(.*?\)', '', name)
    # 去掉首尾空格
    name = name.strip()
    return name


class PlaylistGenerator:
    """
    直播歌单自动生成器

    核心流程：
    1. 检查今日歌单是否已生成（有则加载，无则生成）
    2. 从今日榜单选取新歌推荐（仅展示）
    3. 输出歌单
    """

    # 歌单配置：阶段 -> 抽取数量
    STAGE_CONFIG = {
        "开播前期": 12,
        "直播中场": 15,
    }

    # 新歌推荐数量
    NEW_SUGGESTIONS_COUNT = 2

    def __init__(self, data_dir: str = "data") -> None:
        """
        Parameters
        ----------
        data_dir : str
            数据目录路径，默认 "data"
        """
        self.data_dir = Path(data_dir)
        self.base_library_path = self.data_dir / "base_library.json"
        self.playlists_dir = self.data_dir / "playlists"

        # 今日日期
        self.today = datetime.now().strftime("%Y-%m-%d")

        # 加载的数据
        self.base_library: list[dict] = []
        self.today_charts: list[dict] = []

    # ----------------------------------------------------------
    # 主流程
    # ----------------------------------------------------------

    def run(self) -> None:
        """执行歌单生成主流程"""
        print("=" * 60)
        print("  直播歌单自动生成器")
        print(f"  日期: {self.today}")
        print("=" * 60)
        print()

        # 1. 加载数据
        self._load_data()

        # 2. 生成或加载歌单
        playlist = self._load_or_generate_playlist()

        # 3. 选取新歌推荐（仅展示）
        suggestions = self._select_new_suggestions()

        # 4. 打印歌单
        self._print_playlist(playlist, suggestions)

    # ----------------------------------------------------------
    # 数据加载
    # ----------------------------------------------------------

    def _load_data(self) -> None:
        """加载所有必要数据"""
        # 加载基础曲库
        self._load_base_library()

        # 加载今日榜单数据
        self._load_today_charts()

    def _load_base_library(self) -> None:
        """加载基础曲库"""
        if not self.base_library_path.exists():
            print(f"错误: 基础曲库文件不存在: {self.base_library_path}")
            raise FileNotFoundError(f"基础曲库不存在: {self.base_library_path}")

        with open(self.base_library_path, "r", encoding="utf-8") as f:
            self.base_library = json.load(f)

        print(f"[OK] 已加载基础曲库: {len(self.base_library)} 首歌曲")

    def _load_today_charts(self) -> None:
        """加载今日所有榜单数据"""
        self.today_charts = []

        if not self.data_dir.exists():
            print("[!] 数据目录不存在，跳过榜单加载")
            return

        # 遍历 data/{platform}/{chart}/{date}.json
        for platform_dir in self.data_dir.iterdir():
            if not platform_dir.is_dir() or platform_dir.name.startswith("."):
                continue

            for chart_dir in platform_dir.iterdir():
                if not chart_dir.is_dir():
                    continue

                chart_file = chart_dir / f"{self.today}.json"
                if chart_file.exists():
                    with open(chart_file, "r", encoding="utf-8") as f:
                        chart_data = json.load(f)

                    # 标记榜单来源
                    for song in chart_data.get("songs", []):
                        song["source_chart"] = f"{platform_dir.name}/{chart_dir.name}"

                    self.today_charts.append(chart_data)

        if self.today_charts:
            total_songs = sum(len(c.get("songs", [])) for c in self.today_charts)
            print(f"[OK] 已加载今日榜单: {len(self.today_charts)} 个，共 {total_songs} 首歌曲")
        else:
            print("[!] 今日榜单数据不存在")

    # ----------------------------------------------------------
    # 歌单生成与存储
    # ----------------------------------------------------------

    def _load_or_generate_playlist(self) -> dict[str, list[dict]]:
        """
        加载或生成今日歌单

        如果今日歌单文件已存在，则直接加载；
        否则生成新的歌单并保存。

        Returns
        -------
        dict[str, list[dict]]
            各阶段的歌曲列表
        """
        # 确保 playlists 目录存在
        self.playlists_dir.mkdir(parents=True, exist_ok=True)

        playlist_file = self.playlists_dir / f"{self.today}.json"

        # 检查今日歌单是否已存在
        if playlist_file.exists():
            with open(playlist_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"[OK] 已加载今日歌单: {playlist_file}")
            return data.get("stages", {})

        # 生成新的歌单
        print("[*] 今日歌单不存在，开始生成...")
        playlist = self._generate_playlist()

        # 保存歌单
        self._save_playlist(playlist, playlist_file)

        return playlist

    def _find_latest_playlist(self) -> dict[str, list[dict]]:
        """
        查找最近一次有歌单的日期，返回该歌单

        Returns
        -------
        dict[str, list[dict]]
            最近歌单的各阶段歌曲列表，如果没找到则返回空字典
        """
        if not self.playlists_dir.exists():
            return {}

        # 获取所有歌单文件，按日期倒序排列
        playlist_files = sorted(self.playlists_dir.glob("*.json"), reverse=True)

        for file in playlist_files:
            file_date = file.stem
            # 只找今天之前的歌单
            if file_date < self.today:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                print(f"[OK] 找到历史歌单: {file_date}")
                return data.get("stages", {})

        return {}

    def _generate_playlist(self) -> dict[str, list[dict]]:
        """
        生成歌单

        逻辑：
        1. 查找最近一次有歌单的日期
        2. 如果有历史歌单，每阶段保留 30%-50% 的歌曲
        3. 如果没有历史歌单，全部从曲库随机抽取

        Returns
        -------
        dict[str, list[dict]]
            各阶段的歌曲列表
        """
        # 查找历史歌单
        reference_songs = self._find_latest_playlist()

        playlist = {}
        for stage, count in self.STAGE_CONFIG.items():
            # 筛选该阶段候选歌曲
            candidates = [
                song for song in self.base_library
                if stage in song.get("broadcast_stage", "")
            ]

            if not candidates:
                print(f"[!] 曲库中没有找到包含 '{stage}' 的歌曲")
                playlist[stage] = []
                continue

            # 历史歌单中该阶段的歌曲
            history_stage = reference_songs.get(stage, [])

            if history_stage:
                # 随机保留 30%-50%
                min_keep = max(1, int(count * 0.3))  # 最低 30%
                max_keep = int(count * 0.5)          # 最高 50%
                keep_count = random.randint(min_keep, max_keep)

                # 从历史歌单中随机保留
                kept = random.sample(history_stage, min(keep_count, len(history_stage)))

                # 剩余从曲库抽取（排除已保留的）
                kept_names = {s["song_name"] for s in kept}
                remaining_candidates = [
                    s for s in candidates
                    if s["song_name"] not in kept_names
                ]

                new_count = count - len(kept)
                new_songs = random.sample(remaining_candidates, min(new_count, len(remaining_candidates)))

                playlist[stage] = kept + new_songs

                print(f"[OK] {stage}: 保留 {len(kept)} 首历史歌曲 + {len(new_songs)} 首新歌")
            else:
                # 无历史歌单，全部随机抽取
                actual_count = min(count, len(candidates))
                playlist[stage] = random.sample(candidates, actual_count)

                if actual_count < count:
                    print(f"[!] {stage} 分类仅有 {actual_count} 首歌曲，不足 {count} 首")

        return playlist

    def _save_playlist(self, playlist: dict[str, list[dict]], file_path: Path) -> None:
        """
        保存歌单到文件

        Parameters
        ----------
        playlist : dict[str, list[dict]]
            各阶段歌单
        file_path : Path
            保存路径
        """
        data = {
            "date": self.today,
            "stages": playlist,
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"[OK] 歌单已保存: {file_path}")

    # ----------------------------------------------------------
    # 新歌推荐
    # ----------------------------------------------------------

    def _select_new_suggestions(self) -> list[dict]:
        """
        从今日榜单中选取新歌推荐（仅展示，不记录）

        选取规则：
        - 从DJ热歌榜选取1首
        - 从酷狗飙升榜选取1首
        - 排除已在基础曲库中的歌曲（使用标准化匹配）

        Returns
        -------
        list[dict]
            新歌推荐列表
        """
        if not self.today_charts:
            return []

        # 标准化基础曲库歌名
        library_names = {normalize_song_name(s["song_name"]) for s in self.base_library}

        suggestions = []

        # 分别从两个榜单各选1首
        target_charts = ["DJ热歌榜", "酷狗飙升榜"]

        for chart in self.today_charts:
            chart_name = chart.get("list_name", "")

            # 只处理指定的两个榜单
            if chart_name not in target_charts:
                continue

            # 获取候选歌曲（排除已存在曲库的）
            candidates = []
            for song in chart.get("songs", []):
                song_name = song.get("name", "")
                if normalize_song_name(song_name) not in library_names:
                    candidates.append({
                        "song_name": song_name,
                        "artist": song.get("artist", "未知歌手"),
                        "source_chart": f"kugou/{chart_name}",
                        "rank": song.get("rank", 0),
                    })

            # 从前20名中随机选1首
            top_candidates = [s for s in candidates if s["rank"] <= 20]
            if top_candidates:
                suggestions.append(random.choice(top_candidates))

        return suggestions

    # ----------------------------------------------------------
    # 输出
    # ----------------------------------------------------------

    def _print_playlist(
        self,
        playlist: dict[str, list[dict]],
        suggestions: list[dict],
    ) -> None:
        """
        格式化打印歌单

        Parameters
        ----------
        playlist : dict[str, list[dict]]
            各阶段歌单
        suggestions : list[dict]
            新歌推荐列表
        """
        print("\n" + "=" * 60)
        print(f"  明日直播歌单 ({self.today})")
        print("=" * 60)

        total_songs = 0
        song_index = 1

        # 打印各阶段歌单
        for stage, songs in playlist.items():
            if not songs:
                continue

            print(f"\n{stage}（{len(songs)} 首）")
            print("-" * 40)

            for song in songs:
                vibe = song.get("vibe", "")
                tempo = song.get("tempo", "")
                print(f"  {song_index:>2}. {song['song_name']}")
                song_index += 1

            total_songs += len(songs)

        print(f"\n歌单总计: {total_songs} 首")

        # 打印新歌推荐
        if suggestions:
            print("\n" + "=" * 60)
            print("  今日热榜新歌推荐")
            print("=" * 60)
            print()

            for i, song in enumerate(suggestions, 1):
                print(f"  {i}. 《{song['song_name']}》- {song['artist']}")
                print(f"     来源: {song['source_chart']} (排名 #{song.get('rank', '?')})")

        print("\n" + "=" * 60)
        print("  歌单生成完成！")
        print("=" * 60)


# ----------------------------------------------------------
# 入口
# ----------------------------------------------------------

def main() -> None:
    """入口函数"""
    # 自动计算项目根目录（data 目录在脚本文件的上一级）
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "data"

    generator = PlaylistGenerator(data_dir=str(data_dir))
    generator.run()


if __name__ == "__main__":
    main()
