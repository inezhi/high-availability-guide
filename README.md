# 高可用架构 · 从指标到故障转移

依据《四大原则 · 01-高可用架构》整理的交互式多页指南。默认使用浅色主题，可切换深色主题；无外部依赖，所有图示均为内联 SVG，由原生 JavaScript 提供交互。

在线地址：https://inezhi.github.io/high-availability-guide/

## 页面结构

站点采用“首页 + 每章一页”的博客式结构，左侧是全书章节导航，右侧是当前页的目录：

| 页面 | 内容 |
| --- | --- |
| `index.html` | 首页：阅读路径、章节索引与核心原则 |
| `availability.html` | 可用性指标、停机预算、SLO / 错误预算、MTTR |
| `redundancy.html` | 冗余层次、主备切换、RTO / RPO、脑裂与 fencing、多活 |
| `load-balancing.html` | 健康检查、调度算法、四层 / 七层、GSLB、一致性哈希 |
| `disaster-recovery.html` | 两地三中心、容灾等级、异地多活、切换与回切、演练 |
| `middleware.html` | MongoDB、Redis、Kafka、MySQL 的副本、选举与复制 |
| `rate-limiting.html` | 分层限流、漏桶 / 令牌桶、分布式限流、过载保护 |
| `quiz.html` | 十二道选择题与逐题解释 |

原始文档提供了概念骨架与关键结论；页面在此基础上补充了公开资料中较通用的工程实践，例如错误预算、fencing、ISR、GTID、滑动窗口和过载保护组合。

## 本地预览

在 `website` 目录执行：

```bash
python3 -m http.server 4173
```

然后打开 `http://localhost:4173/`。

## 修改内容

页面由 `src/` 下的源文件生成：

- `src/base.html`：共享的页面骨架、左侧导航、页脚。
- `src/pages/*.html`：各页正文。章节页使用 `{{TOC}}`、`{{MOBILE_TOC}}` 占位符。
- `src/fragments/sprite.html`：SVG 图标与品牌图标。
- `tools/build.py`：读取 `data-toc` 标题生成右侧目录，并输出根目录下的 HTML。

修改 `src/pages` 后执行：

```bash
python3 tools/build.py
```

构建脚本会自动从带 `data-toc` 的 `h2` / `h3` 生成桌面端和移动端目录。新增章节时，在 `tools/build.py` 的 `PAGES` 列表中登记即可。

## 发布到 GitHub Pages

需要本机安装并登录 GitHub CLI：

```bash
brew install gh
gh auth login
```

登录后，在 `website` 目录执行：

```bash
./deploy.sh
```

脚本会创建或复用公开仓库 `high-availability-guide`、推送代码并开启 GitHub Pages。也可以传入自定义仓库名：

```bash
./deploy.sh my-site-name
```

## 说明

- 内容依据原始文档整理，并补充了通用工程实践；交互与视觉为学习用途重新制作。
- 默认主题为浅色；左侧/底部的主题按钮可切换深色。
- 页面支持键盘操作、`prefers-reduced-motion` 和移动端布局；较宽的图示在窄屏上可横向滚动。
