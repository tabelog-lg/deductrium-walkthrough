# 查看器修复：缓存 + 居中布局

> **只覆盖这 3 个文件即可，不要用之前的整仓包覆盖！**
> 线上仓库现在已有 933 份真实存档和 PAT 工作流，整仓覆盖会把它们冲掉。
> `view.html`、`assets/viewer.js`、`assets/viewer.css` 与存档内容完全无关。

## 一、为什么「改了 .md 内容，在线查看还是示例文档」

**仓库和部署都是好的。** 我查了线上状态：

- `archives/ch1_1793907529136.md` 已是真实内容：**20,693 字节 / 12,841 字符**，开头是「第一章 命题逻辑」那串 HedgeDoc 链接，不含「示例存档」字样。
- 线上主页显示「共 10 篇攻略文档、**933 份**历史存档」，ch1 最新格显示 **12,841 字符**。
- `pages build and deployment` 在 `def70982` 上成功，deployments 共 4 条。

问题在 `assets/viewer.js` 里我写的这一行：

```js
fetch(encodeURI(rawFile), { cache: 'force-cache' })
```

`force-cache` 让浏览器**无条件复用第一次看到的旧副本，连网络请求都不发**。
所以你替换了 `.md`、重新部署了 Pages，浏览器还在渲染最初那份 2.2 KB 示例文档——
而且因为压根没请求，页面不报任何错，极难察觉。

**修法**：改成时间戳破 URL 缓存 + `no-store`：

```js
var mdUrl = encodeURI(rawFile) + '?v=' + Date.now();
fetch(mdUrl, { cache: 'no-store' })
```

同时给 `view.html` 里的 `viewer.js` / `viewer.css` 引用加了 `?v=2`。
**这一步同样关键**：否则浏览器连修好的脚本本身都还用旧缓存，改了也白改。

> 代价：每次查看多一次全量下载（中位 15 KB、最大 130 KB），存档站完全可接受。
> 下载 / 原文按钮仍是直链，不受影响。GitHub Pages 按路径取静态文件、忽略 query，
> 与你现在正常使用的 `view.html?f=...` 是同一机制。

## 二、为什么顶栏缩在左上角、文档偏右

原站 `assets/site.css` 把 `body` 设成了横向 flex（给「`.site-nav` + `.container`」并排用的）：

```css
body { display: flex; justify-content: center; align-items: flex-start; padding: 32px 24px; }
body.has-site-nav { padding-top: calc(var(--nav-height) + 28px) !important; }
```

`view.html` 复用了同样的 body class，于是 **顶栏和文档区被当成两个并排的 flex item**：
顶栏被压成 498px 的窄块还换了行，文档区被挤到右边，顶部还多出 84px 偏移。
这就是你截图里的样子。

**修法**：在 `viewer.css` 里覆盖回标准块级流（`viewer.css` 只在查看器页加载，
主页 / 中心页不受影响，字体、背景、颜色等仍继承 `site.css`）：

```css
body.page-walkthrough { display: block !important; padding: 0 !important; ... }
```

然后按你的要求重排：

| 要求 | 实现 |
| --- | --- |
| 顶栏居中放在最上部 | `justify-content: center`、停用 `spacer`、`position: sticky; top: 0`，且 body 去掉 84px 顶部 padding |
| 渲染出的文档居中 | 正文列固定 780px，容器 `margin-left: calc(50% - 648px)`，使正文列中心恰好落在视口中心线 |
| 目录与文档相对位置不变 | 目录仍是左侧相邻列，**宽 230px、间距 28px 与原来完全一致** |
| 窄屏不溢出 | ≤1320px 时目录收起，正文独占一列居中 |

## 三、实测（Chromium + Playwright，本地 1440/1280/1100/900 四种宽度）

**缓存修复**：同一浏览器上下文里先加载示例内容 → 只改服务端 `.md` →
重访**同一个 URL**，显示新内容、旧内容标记消失，`.md` 请求带上了 `?v=...`。✅

**布局**：

| 视口 | 顶栏中心 | 正文中心 | 顶栏 top | 目录 | 横向溢出 |
| --- | --- | --- | --- | --- | --- |
| 1440 | 720（偏差 0） | 720（偏差 0） | 0 | x72–302，与正文间距 28px | 无 |
| 1280 | 640（偏差 0） | 640（偏差 0） | 0 | 收起 | 无 |
| 1100 | 550（偏差 0） | 550（偏差 0） | 0 | 收起 | 无 |
| 900 | 450（偏差 0） | 450（偏差 0） | 0 | 收起 | 无 |

**功能回归**（用 933 份里的真实文件）：

| 文件 | 结果 |
| --- | --- |
| 真实 ch1（12,841 字符） | 55 个代码块、`$0` 原样保留、0 个公式误渲染、目录 12 项 |
| 真实 ch6 | **232 个 KaTeX 节点、0 错误**（`\newcommand` 宏解析未受影响） |
| 真实 route94（133 KB） | 333 个代码块、2 个表格、`<Esc>` 转义显示 |
| `?nomath=1` / 路径白名单 | 均正常，非法参数 0 个 `.md` 请求 |
| 资源版本号 | `assets/viewer.js?v=2` / `assets/viewer.css?v=2` |

全程 0 个 JS 异常、0 个 4xx。

## 四、部署

1. 把 `view.html`、`assets/viewer.js`、`assets/viewer.css` 覆盖到仓库对应路径。
2. `git add` / `commit` / `push`。这三个路径都在 `walkthrough.yml` 的 `paths:` 里，
   会自动触发重建 + Pages 部署。
3. **强刷一次**（Ctrl/Cmd + Shift + R）——让浏览器拿到新的 `view.html`；
   之后 `?v=2` 会保证脚本和样式是新的，`?v=<时间戳>` 保证每次 `.md` 都是最新内容。
   这一步之后就不再需要手动刷新了。

`VIEWER-FIX.md` 只是说明，可以直接删掉，不影响功能。
