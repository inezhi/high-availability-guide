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
VERSION = "20261022-17"
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


def _current(page, active):
    return page["nav"] == active


def build_topbar(active: str | None) -> str:
    chapters = PAGES[1:]
    chapter_links = []
    for page in chapters:
        current = _current(page, active)
        cls = " is-current" if current else ""
        aria = ' aria-current="page"' if current else ""
        chapter_links.append(
            '          <a class="topnav-link%s" href="%s"%s>'
            '<span class="topnav-link-num">%s</span>%s</a>'
            % (cls, page["slug"], aria, page["num"], page["label"])
        )

    groups = [
        (
            "高可用架构",
            "系统设计系列 · 01",
            '<a class="topnav-link topnav-overview" href="index.html">总览</a>\n' + "\n".join(chapter_links),
            True,
        ),
        (
            "高伸缩",
            "本手册相关章节",
            """          <a class="topnav-link" href="load-balancing.html"><span class="topnav-link-num">01</span>负载均衡与水平扩展</a>
          <a class="topnav-link" href="load-balancing.html#consistent-hash"><span class="topnav-link-num">02</span>一致性哈希</a>
          <a class="topnav-link" href="middleware.html#mongodb"><span class="topnav-link-num">03</span>MongoDB 分片</a>
          <a class="topnav-link" href="redundancy.html#active-active"><span class="topnav-link-num">04</span>单元化多活</a>""",
            False,
        ),
        (
            "高并发",
            "本手册相关章节",
            """          <a class="topnav-link" href="rate-limiting.html"><span class="topnav-link-num">01</span>限流与过载保护</a>
          <a class="topnav-link" href="rate-limiting.html#layers"><span class="topnav-link-num">02</span>分层限流</a>
          <a class="topnav-link" href="rate-limiting.html#algorithms"><span class="topnav-link-num">03</span>漏桶与令牌桶</a>
          <a class="topnav-link" href="rate-limiting.html#distributed"><span class="topnav-link-num">04</span>分布式限流</a>
          <a class="topnav-link" href="middleware.html#kafka"><span class="topnav-link-num">05</span>Kafka 分区副本</a>""",
            False,
        ),
        (
            "高性能",
            "本手册相关章节",
            """          <a class="topnav-link" href="middleware.html#redis"><span class="topnav-link-num">01</span>缓存与持久化</a>
          <a class="topnav-link" href="middleware.html#kafka"><span class="topnav-link-num">02</span>消息队列</a>
          <a class="topnav-link" href="load-balancing.html#l4-l7"><span class="topnav-link-num">03</span>四层与七层</a>
          <a class="topnav-link" href="middleware.html#mysql"><span class="topnav-link-num">04</span>数据库复制</a>""",
            False,
        ),
    ]

    items = []
    for label, meta, links, is_active in groups:
        trigger_cls = " is-active" if is_active else ""
        items.append(
            """        <div class="topnav-item">
          <button class="topnav-trigger%s" type="button" aria-expanded="false">
            %s
            <svg class="icon topnav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div class="topnav-dropdown">
            <p class="topnav-menu-label">%s</p>
%s
          </div>
        </div>"""
            % (trigger_cls, label, meta, links)
        )
    return "\n".join(items)


def build_mobile_nav(active: str | None) -> str:
    chapters = PAGES[1:]
    chapter_links = []
    for page in chapters:
        current = _current(page, active)
        cls = " is-current" if current else ""
        aria = ' aria-current="page"' if current else ""
        chapter_links.append(
            '        <a class="mobile-link%s" href="%s"%s><span>%s</span>%s</a>'
            % (cls, page["slug"], aria, page["num"], page["label"])
        )

    ha_block = "\n".join(chapter_links)
    return """    <details class="mobile-nav-group" open>
      <summary><span>高可用架构</span><small>01</small></summary>
      <a class="mobile-link mobile-overview" href="index.html">总览</a>
%s
    </details>
    <details class="mobile-nav-group">
      <summary><span>高伸缩</span><small>相关章节</small></summary>
      <a class="mobile-link" href="load-balancing.html">负载均衡与水平扩展</a>
      <a class="mobile-link" href="load-balancing.html#consistent-hash">一致性哈希</a>
      <a class="mobile-link" href="middleware.html#mongodb">MongoDB 分片</a>
      <a class="mobile-link" href="redundancy.html#active-active">单元化多活</a>
    </details>
    <details class="mobile-nav-group">
      <summary><span>高并发</span><small>相关章节</small></summary>
      <a class="mobile-link" href="rate-limiting.html">限流与过载保护</a>
      <a class="mobile-link" href="rate-limiting.html#layers">分层限流</a>
      <a class="mobile-link" href="rate-limiting.html#algorithms">漏桶与令牌桶</a>
      <a class="mobile-link" href="rate-limiting.html#distributed">分布式限流</a>
      <a class="mobile-link" href="middleware.html#kafka">Kafka 分区副本</a>
    </details>
    <details class="mobile-nav-group">
      <summary><span>高性能</span><small>相关章节</small></summary>
      <a class="mobile-link" href="middleware.html#redis">缓存与持久化</a>
      <a class="mobile-link" href="middleware.html#kafka">消息队列</a>
      <a class="mobile-link" href="load-balancing.html#l4-l7">四层与七层</a>
      <a class="mobile-link" href="middleware.html#mysql">数据库复制</a>
    </details>""" % ha_block


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
            "{{TOPBAR}}": build_topbar(page["nav"]),
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
