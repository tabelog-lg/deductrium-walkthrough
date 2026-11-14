# 本次改动清单（2026-11-14）

## A. `deductrium-walkthrough` —— 修掉「线上滞后一版」

**问题**：Pages 是 `Deploy from a branch / main / (root)`，构建由 push 触发；
而 `walkthrough.yml` 用 `GITHUB_TOKEN` 回推重建结果、commit 还带 `[skip ci]`。
GitHub 明确规定 **GITHUB_TOKEN 的推送不会触发 Pages 构建**，
所以仓库里页面是最新的，线上永远停在上一版，且不报错。

**改动**（`.github/workflows/walkthrough.yml`）：

| 项 | 旧 | 新 |
| --- | --- | --- |
| checkout / push 凭据 | `GITHUB_TOKEN`（`permissions: contents: write`） | `secrets.PAT`（`permissions: contents: read`） |
| commit message | `chore: ... [skip ci]` | `chore: normalize filenames and rebuild walkthrough pages` |
| concurrency | `cancel-in-progress: true` | `false`（让回推触发的第二次排队跑完） |
| 新增步骤 | — | `Verify PAT secret`：缺失时 `::error::` 直接失败并提示，不静默 |

机制：真人 push → 第 1 次 Rebuild（改名 + 重建 + **PAT 回推**）→
回推同时触发 `pages build and deployment`（线上更新）与第 2 次 Rebuild →
第 2 次因 `gen_walkthrough.py` 幂等，`git diff --staged --quiet` 为真 → 不 commit → 停。
**每次 push 看到 2 次 Rebuild + 1 次 Pages 部署是设计如此，不是死循环。**

`README.md` 已同步：部署从 3 步改 4 步、新增「为什么需要 PAT」一节、
改掉旧的双保险描述。

### 你要做的一次性配置

1. 账号头像 → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token。
2. Repository access 选 *Only select repositories*，只勾 `deductrium-walkthrough`。
3. Permissions → Repository permissions → **Contents: `Read and write`**
   （其余不动，不要给 Workflows 权限）。
4. Expiration 选最长，记得到期换新。
5. 仓库 `Settings → Secrets and variables → Actions → New repository secret`，
   名字**必须**是 `PAT`，值粘贴 token。
6. push 一个空提交或在 Actions 手动 `Run workflow` 触发一次。

> `Settings → Actions → General → Workflow permissions` 保持默认即可，
> 写操作走 PAT。上一轮给的 `deploy-pages.yml` **不要加**（那是 GitHub Actions 发布源模式用的）。

### 已校验
- workflow YAML 语法通过；`git commit -m` 那行不含 `[skip ci]`；
  文件里其余 `[skip ci]` 只出现在说明性注释里。
- 本地连续两次运行 `gen_walkthrough.py`，第二次「本次页面变更 0 个」，
  `--check` 退出码 0 → 幂等终止成立。

---

## B. `tabelog-lg.github.io` —— 改链接 + 清掉不再用的脚本

> 站点已确认能正常访问（新站返回「共 10 篇攻略文档、1 份历史存档」）。

| 改动 | 说明 |
| --- | --- |
| `deductrium/index.html` | 「📘 攻略 · 攻略存档」入口 `href="walkthrough/index.html"` → `https://tabelog-lg.github.io/deductrium-walkthrough/`（加 `target="_blank" rel="noopener"`），标题加「（已独立成站）」，描述换成新站地址 + 在线查看 |
| `deductrium/walkthrough/index.html` | 顶部加迁移提示条（链到新站，说明下方历史存档保留为只读快照）；「由 gen_walkthrough.py 自动生成」→「本页为静态快照，不再自动更新」；「重新运行生成脚本 / Actions 自动重建」→「生成脚本与工作流已移出，新增存档请放新站」 |
| `deductrium/walkthrough/README.md` | 顶部加「本目录已迁出」提示，正文保留作历史记录 |
| `README.md` | 目录结构删掉 `scripts/` 与 `.github/workflows/` 两行；新增「攻略存档已迁至独立站点」一节；修正两条已失效的约定 |
| **删除 `scripts/` 整个目录** | `gen_walkthrough.py`、`shell_common.py`、`sync-shell.py`、`__pycache__/shell_common.cpython-315.pyc` |
| **删除 `.github/workflows/walkthrough.yml`** | 攻略存档重建工作流已搬去新仓库 |

### 关于「那两个 py」

按「攻略存档搬走后不再需要的生成脚本」处理，我删的是**整个 `scripts/`（3 个 py + 1 个 pyc）**
加唯一的 workflow，而不是只删两个：

- `gen_walkthrough.py` 只服务攻略存档，必删；
- `sync-shell.py` 只是一次性把顶栏/面包屑刷进 11 个内容页的维护工具，
  攻略存档搬走后没有新增页面要同步；
- `shell_common.py` 是上面两者 import 的模板模块，两个都删了它就是孤儿，一并清掉。

**这些都不是运行时依赖**：nav / crumb 早已静态写入各 HTML，`site.js` 是唯一的运行时 JS，
删掉后所有页面照常显示。原站回到 README 里写的「无构建步骤、无运行时依赖」纯静态状态。

> 如果你想保留 `sync-shell.py`（以后批量改顶栏用），说一声，我把 `scripts/`
> 里的 `sync-shell.py` + `shell_common.py` 放回去，只删 `gen_walkthrough.py`。

### 刻意保留（没删）

- `deductrium/walkthrough/` 下 **933 份真实 `.md` 存档**、`docs/` 11 个中心页、
  `articles.json`、`names.json`、`static/`、`.nojekyll` —— 旧路径继续可用，作为完整历史快照。
  新仓库目前只有 1 份示例存档，所以没有把旧路径改成纯重定向。
- `assets/walkthrough.css` 等资源、`deductrium/index.html` 里 13 个 HedgeDoc 原文链接、全站其它栏目。

### 已校验
- 998 个文件（原 1003 − 删除 5）；archives 933 份、docs 11 页、`.nojekyll` 都在。
- 入口链接只剩新站地址，旧相对链接 0 残留；README 里 scripts / 生成脚本描述 0 残留。
- 所有 HTML 站内链接本地文件检查全部存在（外链跳过）。

---

## 两个包怎么放

- `deductrium-walkthrough-pat-fixed.zip` → 解压覆盖 `deductrium-walkthrough/` 仓库根目录
  （只改了 `.github/workflows/walkthrough.yml` 和 `README.md`，其余文件未动）。
- `tabelog-lg.github.io-updated.zip` → 解压覆盖原站仓库根目录
  （`git` 会识别出 4 个修改 + 5 个删除；commit 前 `git status` 核对一下）。
