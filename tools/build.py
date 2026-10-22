#!/usr/bin/env python3
"""Assemble the static multi-page guide from src/base.html and src/pages/*.html.

Run from the website directory: python3 tools/build.py
"""
from __future__ import annotations

import html as html_lib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
VERSION = "20261022-4"
YEAR = "2026"

PAGES = [
    {
        "slug": "index.html",
        "source": "index.html",
        "nav": None,
        "title": "高可用架构 · 从指标到故障转移",
        "description": "一份可交互的高可用架构指南：从几个 9、停机预算，到主备、多活、负载均衡、容灾、中间件高可用与限流。",
        "og_type": "website",
        "body_class": "home-page",
        "main_class": "home-main",
    },
    {
        "slug": "availability.html",
        "source": "availability.html",
        "nav": "availability",
        "num": "01",
        "label": "可用性",
        "title": "可用性指标：从几个 9 到停机预算 · 高可用架构",
        "description": "理解可用性的计算方式、几个 9 的停机预算、串联与并联链路、SLO / SLI / SLA 与错误预算。",
        "og_type": "article",
        "body_class": "article-page",
        "main_class": "article-main",
    },
    {
        "slug": "redundancy.html",
        "source": "redundancy.html",
        "nav": "redundancy",
        "num": "02",
        "label": "冗余",
        "title": "冗余与故障转移：主备、多活与脑裂 · 高可用架构",
        "description": "从冷备、温备、热备到主备切换、RTO / RPO、脑裂与 fencing，再到单元化多活与冲突解决。",
        "og_type": "article",
        "body_class": "article-page",
        "main_class": "article-main",
    },
    {
        "slug": "load-balancing.html",
        "source": "load-balancing.html",
        "nav": "loadbalancing",
        "num": "03",
        "label": "负载均衡",
        "title": "负载均衡：调度算法、健康检查与多级冗余 · 高可用架构",
        "description": "负载均衡的层次、调度算法、健康检查、会话保持、一致性哈希、DNS 与全局负载。",
        "og_type": "article",
        "body_class": "article-page",
        "main_class": "article-main",
    },
    {
        "slug": "disaster-recovery.html",
        "source": "disaster-recovery.html",
        "nav": "disaster",
        "num": "04",
        "label": "容灾",
        "title": "容灾架构：两地三中心与异地多活 · 高可用架构",
        "description": "从备份、冷备、温备到双活，拆解两地三中心、异地多活的收益、代价与切换流程。",
        "og_type": "article",
        "body_class": "article-page",
        "main_class": "article-main",
    },
    {
        "slug": "middleware.html",
        "source": "middleware.html",
        "nav": "middleware",
        "num": "05",
        "label": "中间件",
        "title": "中间件高可用：MongoDB、Redis、Kafka 与 MySQL · 高可用架构",
        "description": "副本、选举、复制与故障转移：MongoDB 副本集与分片、Redis 哨兵与集群、Kafka 分区副本、MySQL 主从与复制策略。",
        "og_type": "article",
        "body_class": "article-page",
        "main_class": "article-main",
    },
    {
        "slug": "rate-limiting.html",
        "source": "rate-limiting.html",
        "nav": "ratelimit",
        "num": "06",
        "label": "限流",
        "title": "限流与过载保护：让系统在洪峰中活下来 · 高可用架构",
        "description": "倒金字塔分层限流、漏桶与令牌桶、滑动窗口、分布式限流、Nginx 与网关限流，以及过载保护组合拳。",
        "og_type": "article",
        "body_class": "article-page",
        "main_class": "article-main",
    },
    {
        "slug": "quiz.html",
        "source": "quiz.html",
        "nav": "quiz",
        "num": "07",
        "label": "自测",
        "title": "知识自测：高可用架构 · 高可用架构",
        "description": "用十二道题检验对可用性指标、冗余、负载均衡、容灾、中间件与限流的理解。",
        "og_type": "article",
        "body_class": "article-page",
        "main_class": "article-main",
    },
]

HEADING_RE = re.compile(r"<h([23])\b([^>]*)>(.*?)</h\1>", re.S | re.I)
ATTR_ID_RE = re.compile(r'\bid="([^"]+)"')
TAG_RE = re.compile(r"<[^>]+>")


def build_toc(body: str) -> str:
    items = []
    for match in HEADING_RE.finditer(body):
        level, attrs, inner = match.group(1), match.group(2), match.group(3)
        if "data-toc" not in attrs:
            continue
        id_match = ATTR_ID_RE.search(attrs)
        if not id_match:
            continue
        label = html_lib.unescape(TAG_RE.sub("", inner))
        label = re.sub(r"\s+", " ", label).strip()
        if not label:
            continue
        items.append((level, id_match.group(1), label))

    if not items:
        return ""

    links = "\n".join(
        f'          <a class="toc-link toc-level-{level}" href="#{html_lib.escape(hid)}">{html_lib.escape(label)}</a>'
        for level, hid, label in items
    )
    return f'        <nav class="toc-nav" id="tocNav" aria-label="本页小节">\n{links}\n        </nav>'


def build_mobile_toc(body: str) -> str:
    items = []
    for match in HEADING_RE.finditer(body):
        level, attrs, inner = match.group(1), match.group(2), match.group(3)
        if "data-toc" not in attrs:
            continue
        id_match = ATTR_ID_RE.search(attrs)
        if not id_match:
            continue
        label = html_lib.unescape(TAG_RE.sub("", inner))
        label = re.sub(r"\s+", " ", label).strip()
        if label:
            items.append((level, id_match.group(1), label))
    if not items:
        return ""
    links = "\n".join(
        f'            <a class="toc-level-{level}" href="#{html_lib.escape(hid)}">{html_lib.escape(label)}</a>'
        for level, hid, label in items
    )
    return (
        '        <details class="toc-mobile">\n'
        "          <summary>本页目录</summary>\n"
        f'          <nav aria-label="本页小节">\n{links}\n          </nav>\n'
        "        </details>"
    )


def build_nav(active: str | None) -> str:
    rows = []
    for page in PAGES[1:]:
        current = page["nav"] == active
        cls = " class=\"is-active\"" if current else ""
        aria = ' aria-current="page"' if current else ""
        rows.append(
            f'        <a href="{page["slug"]}" data-page="{page["nav"]}"{cls}{aria}>'
            f'<span class="nav-num">{page["num"]}</span><span>{page["label"]}</span></a>'
        )
    return "\n".join(rows)


def build_mobile_nav(active: str | None) -> str:
    rows = []
    for page in PAGES[1:]:
        current = page["nav"] == active
        cls = ' class="is-active"' if current else ""
        aria = ' aria-current="page"' if current else ""
        rows.append(
            f'    <a href="{page["slug"]}"{cls}{aria}><span>{page["num"]}</span>{page["label"]}</a>'
        )
    return "\n".join(rows)


def build_pager(active: str | None) -> str:
    chapters = PAGES[1:]
    index = next((i for i, page in enumerate(chapters) if page["nav"] == active), None)
    if index is None:
        return ""
    prev_page = chapters[index - 1] if index > 0 else None
    next_page = chapters[index + 1] if index + 1 < len(chapters) else None
    prev_html = (
        f'<a class="pager-link pager-prev" href="{prev_page["slug"]}"><span>上一篇 · {prev_page["num"]}</span><strong>{prev_page["label"]}</strong></a>'
        if prev_page
        else '<a class="pager-link pager-home" href="index.html"><span>返回</span><strong>全书目录</strong></a>'
    )
    next_html = (
        f'<a class="pager-link pager-next" href="{next_page["slug"]}"><span>下一篇 · {next_page["num"]}</span><strong>{next_page["label"]}</strong></a>'
        if next_page
        else '<a class="pager-link pager-home" href="index.html"><span>读完啦</span><strong>返回全书目录</strong></a>'
    )
    return f'      <nav class="post-pager" aria-label="章节导航">\n        {prev_html}\n        {next_html}\n      </nav>'


def main() -> None:
    base = (SRC / "base.html").read_text(encoding="utf-8")
    sprite = (SRC / "fragments" / "sprite.html").read_text(encoding="utf-8").strip()

    for page in PAGES:
        source_path = SRC / "pages" / page["source"]
        if not source_path.exists():
            print(f"skip missing source: {source_path}")
            continue
        body = source_path.read_text(encoding="utf-8")
        body = body.replace("{{TOC}}", build_toc(body))
        body = body.replace("{{MOBILE_TOC}}", build_mobile_toc(body))
        body = body.replace("{{PREV_NEXT}}", build_pager(page["nav"]))

        output = base
        replacements = {
            "{{TITLE}}": page["title"],
            "{{DESCRIPTION}}": page["description"],
            "{{OG_TYPE}}": page["og_type"],
            "{{SLUG}}": page["slug"],
            "{{VERSION}}": VERSION,
            "{{YEAR}}": YEAR,
            "{{BODY_CLASS}}": page["body_class"],
            "{{MAIN_CLASS}}": page["main_class"],
            "{{NAV}}": build_nav(page["nav"]),
            "{{MOBILE_NAV}}": build_mobile_nav(page["nav"]),
            "{{SPRITE}}": sprite,
            "{{BODY}}": body,
        }
        for key, value in replacements.items():
            output = output.replace(key, value)

        leftover = re.findall(r"\{\{[A-Z_]+\}\}", output)
        if leftover:
            raise SystemExit(f"{page['slug']}: unresolved placeholders {leftover}")

        (ROOT / page["slug"]).write_text(output, encoding="utf-8")
        print(f"built {page['slug']} ({len(output):,} bytes)")


if __name__ == "__main__":
    main()
