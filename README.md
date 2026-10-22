# 高可用架构 · 交互式图解

依据《四大原则 · 01-高可用架构》整理的交互式学习页面。默认使用浅色主题，可切换深色主题；无外部依赖，直接由静态文件提供服务。

## 内容结构

- 可用性指标：几个 9、停机预算、串联链路
- 冗余：主备与多活、RTO/RPO、脑裂与 fencing、单元化
- 负载均衡：健康检查、双机主备、多级负载、四层/七层、调度策略、DNS 轮询
- 容灾：两地三中心、异地多活、伪多活与真多活
- 中间件：MongoDB、Redis、Kafka、MySQL 的副本、选举与复制策略
- 限流：倒金字塔、客户端手段、漏桶与令牌桶、Nginx 与网关限流
- 自测：七道选择题

页面中的所有图示均为内联 SVG / HTML，不依赖图片或 CDN。

## 本地预览

```bash
cd website
python3 -m http.server 4173
```

然后打开 `http://localhost:4173/`。

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

脚本会创建公开仓库 `high-availability-guide`、推送代码并开启 GitHub Pages，最后输出访问地址。也可以传入自定义仓库名：

```bash
./deploy.sh my-site-name
```

## 说明

- 内容依据原始文档整理，交互与视觉为学习用途重新制作。
- 默认主题为浅色；右上/左下角的主题按钮可切换深色。
- 页面支持键盘操作、`prefers-reduced-motion` 和移动端布局。
