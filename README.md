# deductrium-walkthrough

把原站 [`tabelog-lg/tabelog-lg.github.io`](https://github.com/tabelog-lg/tabelog-lg.github.io) 的
`/deductrium/walkthrough/` 攻略存档**整个提到仓库根目录**，独立成一个 GitHub Pages 仓库。

**线上地址：`https://tabelog-lg.github.io/deductrium-walkthrough/`**

> 仓库名是什么，URL 里的子路径就是什么。Pages 项目页仓库的内容根直接对应
> `/<repo>/`，所以点开这个地址**就是攻略存档主页**，不再是
> `…/<repo>/deductrium/walkthrough/` 那样套两层。
> 若想连 `/deductrium-walkthrough` 这一段也去掉，只能绑自定义域名（CNAME）——
> 同一账号下的 `<user>.github.io` 用户页仓库只有一个，已被原站占用。

---

## 这个仓库里有什么

```
deductrium-walkthrough/
├── .github/workflows/walkthrough.yml   ★ push 时自动重建（含文件名规范化）
├── .nojekyll                          ★ 必须保留，否则 Jekyll 会处理 .md
├── .gitignore
├── 404.html                           统一 404 页
├── README.md                          本文件
├── ARCHIVE-GUIDE.md                   攻略存档维护规则（改名 / 命名 / 配置字段）
├── index.html                         【生成】攻略存档主页 ← 站点入口
├── view.html                          ★ 按需在线查看器（唯一的查看页）
├── articles.json                      文章配置：显示名 / 原文链接 / 静态文档
├── names.json                         ★ 中文文档名 → ASCII 代号（改名规则的单一来源）
├── archives/
│   └── ch1_1793907529136.md           ★ 唯一一份示例存档
├── static/
│   ├── fin.md                         静态文档示例（精简占位）
│   └── route94.md                     静态文档示例（精简占位）
├── docs/                              【生成】10 个中心页 + 1 个跳转页
│   ├── index.html
│   └── ch1.html … appendix.html
├── assets/
│   ├── site.css / site.js             独立站壳层（跨栏目链接已改为原站外链）
│   ├── walkthrough.css                存档栏目样式
│   ├── viewer.css / viewer.js         ★ 按需查看器（fetch + markdown-it + KaTeX）
│   └── vendor/                        ★ 全部自托管，零 CDN、零外部请求
│       ├── markdown-it.min.js        markdown-it 14.1.0（121 KB）
│       ├── katex.min.js              KaTeX 0.16.11（269 KB）
│       ├── auto-render.min.js        (3 KB)
│       ├── katex.min.css             (23 KB)
│       └── fonts/*.woff2             20 个字体（254 KB）
└── scripts/
    ├── gen_walkthrough.py             ★ 改名 + 生成主页/中心页（幂等）
    └── shell_common.py                顶栏 / 面包屑 / 页脚模板
```

**存档库里只有 1 份示例 `.md`。** 原站快照的 933 份历史存档没有搬过来。
把真实存档拷进 `archives/` 后 push 即可，其余 9 篇在示例状态下显示「暂无存档」，
这正好能演示脚本的「自动发现 / 空状态」两种行为。
`static/` 下两份也是精简示例占位，替换成真实内容即可。

---

## 部署（4 步）

1. 在 GitHub 新建仓库，**名字就叫 `deductrium-walkthrough`**，把本目录全部文件推到 `main`。
2. Settings → Pages → Build and deployment → Source 选 **Deploy from a branch**，分支 `main` / 目录 `/ (root)`。
3. **配置 `PAT` Secret**（见下一节，必须做）。没有它，重建结果虽写回仓库，线上却不会更新。
4. 触发一次构建：随便 push 一个空提交，或在 Actions 里手动 `Run workflow`。

推完访问 `https://tabelog-lg.github.io/deductrium-walkthrough/` 即可。

> 仓库名、原站链接硬编码在 `scripts/shell_common.py`（`REPO_NAME` / `REPO_URL` / `SITE_URL`）、
> `assets/site.js` 和 `404.html` 里。**改仓库名时同步改这三处**，其余全站路径都是相对路径，不用动。
> `Settings → Actions → General → Workflow permissions` 保持默认 `Read repository contents` 即可，
> 写操作走 PAT，不再依赖 `GITHUB_TOKEN` 的写权限。

---

## 为什么需要 PAT（不配会静默滞后）

本仓 Pages 用 **Deploy from a branch / main / (root)**，构建由「push 到 main」触发。
而 GitHub 明确规定：**用 `GITHUB_TOKEN` 的 Actions 工作流推送的提交不会触发
GitHub Pages 构建**。早期版本的工作流正是用 `GITHUB_TOKEN` 回推重建页面，
还带 `[skip ci]`，结果就是：仓库里的 `index.html` / `docs/` 是最新的，
线上却停在上一版，而且不报任何错。

修法：回推改用**细粒度 PAT**，让 GitHub 把这次推送当成真人推送。

**创建 PAT**（在账号级设置里操作一次）：

1. 头像 → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token。
2. Name 随意；**Repository access** 选 *Only select repositories*，只勾 `deductrium-walkthrough`。
3. **Permissions → Repository permissions → Contents: `Read and write`**（其余一律不动，不要给 Workflows 权限）。
4. Expiration 建议选最长；记得到期前换新值。
5. 生成后复制 token。

**加到仓库**：`Settings → Secrets and variables → Actions → New repository secret`，
名字**必须**是 `PAT`，值粘贴刚才的 token。

工作流第一步会检查这个 Secret，缺失时直接 `::error::` 失败并提示，不会静默跑完。

> 用经典 PAT（`repo` scope）也行，但权限范围大，推荐细粒度。
> 如果你更愿意把 Pages 的 Source 改成 **GitHub Actions**，那就完全不需要 PAT ——
> 但那是另一套发布模式，与当前 branch 模式二选一，不要混用。

---

## 不用手动跑 `gen_walkthrough.py`

`.github/workflows/walkthrough.yml` 的 `paths:` 覆盖 `archives/**`、`static/**`、
`articles.json`、`names.json`、`scripts/**`、`assets/viewer.*`、`view.html`。
push 命中任一项就自动跑 `python3 scripts/gen_walkthrough.py`，把**改名后的文件、
`names.json`、生成的主页与中心页一起提交**回仓库。

**回推机制（已修）**：提交用 `secrets.PAT` 推送、commit message **不带 `[skip ci]`**。
这样那次回推会同时触发 `pages build and deployment`（线上更新）和本工作流再跑一次；
第二次因 `gen_walkthrough.py` 幂等，`git diff --staged --quiet` 为真 → 不 commit → 链条自然停。

所以每次你 push 一份新 `.md`，正常会看到 **2 次 Rebuild 运行 + 1 次 Pages 部署**：
第 1 次改名/重建并回推，第 2 次空跑确认。这是设计如此，不是死循环。
`concurrency` 用 `cancel-in-progress: false`，避免这两次互相取消。

新增 / 删除 / 改名存档，你只需要 `git push`。

想本地预览：

```bash
python3 -m http.server 8000     # 打开 http://localhost:8000/
python3 scripts/gen_walkthrough.py --check   # 只检查待改名/待生成，不写文件
```

---

## ✅ 改名操作完整保留（实测）

`scripts/gen_walkthrough.py` 的 `normalize_filenames()` / `slug_for_prefix()` /
`ensure_code()` / `_plan_move()` / aliases 逻辑**一字未删**，只改了路径常量与链接模板。
在独立副本上实测（2026-11-14）：

| 操作 | 实测结果 |
| --- | --- |
| 放入 `Deductrium 攻略第一章 命题逻辑_1793907529000.md`，跑 `--check` | 退出码 1，报告 `→ ch1_1793907529000.md`，不写文件 |
| 正式运行 | 中文名消失，出现 `ch1_1793907529000.md`，`index.html` + `docs/ch1.html` 同步重建 |
| 放入全新的中文文档名 | 自动分配 `doc-3c8552c6`，写回 `names.json`，自动生成 `docs/doc-3c8552c6.html` |
| 把 `names.json` 里 `ch1` 改成 `sec1` 再跑 | 2 个旧文件批量迁移到 `sec1_*`，`docs/ch1.html` 作为孤儿被删除，`docs/sec1.html` 生成 |
| 幂等复跑 `--check` | 退出码 0，「文件名与攻略存档页面均已是最新」 |

规则详见 `ARCHIVE-GUIDE.md`：文件名 `[代号]_[13位毫秒时间戳].md`、时间取文件名而非 mtime、
UTF-8 字符数含换行与空白、改名冲突不覆盖、改代号自动迁移。

---

## 在线查看：不预生成任何 HTML

即使把原站那 936 份 `.md` 全放进来，**依然不会有任何一份对应 HTML**。
`view.html?f=archives/ch1_1793907529136.md` 才 `fetch` 那一份 Markdown，
用 **markdown-it**（已直接放进 `assets/vendor/`）在浏览器里转 HTML，公式交给 KaTeX。

| | 现有 `.md` | 预生成 HTML | 按需 |
| --- | --- | --- | --- |
| 新增文件 | — | 936 个 HTML | 1 个 `view.html` + 脚本 |
| 仓库总量 | 13.50 MB | 30.79 MB（下限） | **14.17 MB** |
| 增量 | — | +17.29 MB 且随存档线性涨 | **+0.68 MB 常量** |

含公式的页面预生成会爆炸：实测原站 `ch6` 原文 46 KB，
渲染后（含 KaTeX MathML）是 **578 KB，12.7 倍**。按需方案单次只拉中位 15 KB / 最大 130 KB。

**三个针对这批存档的处理**（都在 `assets/viewer.js`，改动前务必读注释）：

1. **`$0→$1` 是游戏替换变量，不是行内公式**。块级 `$$`/`\[` 无条件渲染，行内公式走
   `isInlineMath()` 启发式白名单（排除数字开头、含空格、含 `→><|~&` 等游戏符号），
   并提供 `?nomath=1` 关公式开关。
2. **`\newcommand` 宏跨不过公式边界**（KaTeX 每次 render 宏不共享，且
   `\newcommand{\not}` 会撞内建命令报错）。把定义解析成 KaTeX 的 `macros` 选项：
   跨公式生效、可覆盖内建、支持 `#1` 参数。原站 `ch6` 实测 232 个公式节点、0 错误。
3. **`markdown-it({ html: false })` 必须保持关闭**。存档里的 `<Esc>`、`<a1>`、`<s>`
   是按键和游戏记号，开启 raw HTML 会吞内容并引入 XSS。

另外：数学片段与代码块先抽成占位符，避免 markdown 改写 LaTeX 的 `_ \ *`；
`f` 参数白名单 `^(archives|static)/[A-Za-z0-9_-]+\.md$` 防路径穿越；
回填用 `textContent` 而非 `innerHTML`；站内 `.md` 链接自动改写成查看器地址；
带侧边目录、代码块复制、原文 / 下载按钮、UTC+8 时间与字符数显示。

---

## 实测验证（Chromium + Playwright，模拟项目页子路径）

把仓库挂到 `/deductrium-walkthrough/` 下用 `ThreadingHTTPServer` 模拟 Pages：

- **86 个站内链接全部 200，0 死链**（14 个 HTML 页面里所有 `href` / `src`，
  含 `docs/` 下的 `../assets/*`、`../view.html?f=...`、KaTeX 字体）。
  上一版拆仓库时跨栏目导航产生的 6 个 404 已通过独立壳层消除。
- 主页 → 点击「在线查看」→ 示例存档：**4 个 KaTeX 节点、0 错误**，
  2 个代码块、1 个表格、侧边目录 5 项，`$0` / `<Esc>` / `<a1>` 原样保留，
  站内 `.md` 链接正确改写。
- 中心页 `docs/ch1.html` → `../view.html?f=...` 层级正确。
- `static/fin.md`、`?nomath=1`、`?f=../../etc/passwd`（被拦、0 个 .md 请求）、`404.html` 均通过。
- **0 个资源 404、0 个 JS 异常**；每次查看只 `fetch` 当前那一份 `.md`。

> 所有页面资源都用相对路径，因此 `/deductrium-walkthrough/` 子路径与
> 自定义域名根路径都能直接工作，不需要改配置。

---

## 已知边界

- 查看器依赖 JS；无 JS 时「下载 .md」链接仍可用（生成脚本保留了所有 `download` 直链）。
- SEO 只看到 `view.html` 空壳，抓不到正文。若在意，可只对每篇「最新存档」预生成一份 HTML 做入口。
- 首次加载 vendor 约 0.43 MB（markdown-it + KaTeX + CSS），之后走 HTTP 缓存；
  20 个字体自托管，无外部请求。
- 想加搜索 / 时间轴筛选：让 `gen_walkthrough.py` 顺手吐一个 `index.json`，前端无刷新过滤，
  仍可保持零预生成。
- 写入型 / 服务端动态（登录、评论写入、实时协同）GitHub Pages 本身做不到；
  真需要就得外接 Discussions 或换带 Functions 的托管平台。

---

## 来源

基于 `tabelog-lg/tabelog-lg.github.io` 的 `main` 分支快照（2026-11-14，1003 个文件 /
933 份历史存档）。本仓库只搬结构与代码，存档内容仅保留 1 份示例。
