---
name: release
description: >-
  Use when cutting a CalVer version and GitHub release for a lightxlab repo, or
  when shipping that release to server 245 / swapping files on the Windows
  production host.
---
# release

**发布 ≠ 部署。** 发版只让 GitHub 上出现 Release；245 不会自动部署，每次部署都要 Kip 明确点头。

只在 Kip 要求发版（或点名版本号）时启用。他答应这一次不等于授权你以后自己切版本——不是「PR 合并了」「感觉能发了」就 bump。

## 一、打版本（CalVer `YYYY.MM.N`，tag `v<YYYY.MM.N>`）

| Repo | 默认分支 | 版本位置 | 发布 workflow | 产物 |
|---|---|---|---|---|
| lightmind | default | `package.json` + `package-lock.json` | `.github/workflows/release-tag-gate.yml` | `LightMind-<ver>.exe` |
| lightology | `lighthouse`（**绝不用 master**） | `ontology-hub/package.json` + `ontology-hub/pnpm-lock.yaml` | 同上 | `ontology-hub-<ver>.exe` + 一个归档 |
| lightcli | default | `src/lightcli/__init__.py` 的 `__version__`（hatch 动态版本，无 package.json） | `.github/workflows/release.yml` | `lightmcp.exe` + checksum |

步骤：

1. **选版本**：`git ls-remote --tags origin 'v*'`，取比所有 tag 都大的下一个 `YYYY.MM.N`（N 按数字比，10.10 > 10.9）。
2. **bump PR**：从默认分支切，只改上表列的版本文件。PR 以 ready 开，然后 squash merge。
3. **打 tag**：在合并后的 commit 上推 `v<version>`。
4. **交给 workflow 发布**：tag 触发对应 workflow，gate 会校验 tag 与版本文件一致、比所有 tag 新，然后构建测试。lightmind / lightology 用 `gh release create --generate-notes --verify-tag`；lightcli 先建 draft，测试 + Windows exe 检查 + 上传字节数校验通过后才转正。**绝不手工创建或发布 Release**。workflow 失败就修因再重跑。
5. **保留自动生成的 notes**，不要重写（会丢作者和 PR 链接）。最多在顶部加一段 **Deploy notes**。
6. **验收**：release 已发布（非 draft）、上表产物都在、notes 里有 What's Changed（每行带作者和 PR 链接）和 Full Changelog。作者应为 `github-actions[bot]`；出现人类作者说明有人手工建过。

## 二、部署到 245（`47.115.227.245`，Windows 生产机）

exe 和 `.env` 由 **Kip 自己换**。bot 的活是：准备好发布、env 行、原因、事后核对。

### 访问边界

- **禁止 SSH 到这台机器**。只能走：Postgres `:5432`、lightX 平台 `:8080`（登录与身份源）、LightMind `:8822`（同时代理 Ontology Hub 的 `/ontology-hub/`）。
- Hub / LightMCP / Redis 只听 `127.0.0.1`，从外面连不到——通过 `:8822` 查，或让 Kip 代查。
- 身份用 `:8080`；`:8826` 是另一套环境，别碰。

### 步骤

1. **发版**：按 §一 把各 repo 发完，拿到 GitHub Release 链接。
2. **一次性把部署说明发给 Kip**：release 链接、要下哪个产物、env 要加/改哪些行、有没有 migration 和什么时候跑、重启顺序。env 按该 tag 里代码实际读的变量写，主机填 `127.0.0.1`。
3. **等 Kip 说他部署完了。**
4. **上线核查**：新版本在跑、`:8822` health 200、MCP 调用不返回 401、跑一遍 golden question：`2025 年税前净利润相比 2024 年变化了多少？请分解主要驱动因素。` 建过的测试对话要删掉。报告通过，或报出具体失败点。

### 踩过的 env 坑

- **Hub `DATABASE_URL`** 必须以 `?schema=ontology_hub` 结尾，密码里的特殊字符要 URL 编码。缺了的症状：`table public.ai_tools does not exist`。
- **`OHUB_JWT_SECRET`** 是平台签名密钥，等于 8080 RuoYi 的 `token.secret`，也等于 LightMind 的 `LIGHTMIND_JWT_SECRET`。以 `eyJ` 开头的登录 token 是错的。症状：401 `令牌已过期或验证不正确`。
- **`OHUB_JWT_KEY_DERIVATION`** 可以不给，默认 `utf8` 与 8080 一致；只接受 `utf8` / `jjwt09`，写成 `jjwt09` 会把 401 带回来。
- **MCP URL 存在 LightMind 的 DB 里**（agent 连接表），每次新对话读取。`LIGHTMIND_ONTOLOGY_HUB_MCP_ENDPOINT` 只决定用户的 bearer token 发给谁，必须与 DB 里的 URL 完全一致。改端口两处都要改。症状：`cannot reach MCP server: fetch failed`。
- **`LIGHTMIND_ONTOLOGY_HUB_UPSTREAM`** 决定本体中心入口，只给 scheme + host + port，带 path 会让 LightMind 起不来。
- **`LIGHTMIND_TRUSTED_MCP_CONNECTIONS`** 列出 LightMCP 的 connection id 和 endpoint，用来转发用户 token；缺了 LightMCP 报没有 session。
- **env 只在启动时读**，改完必须重启服务。

### 产物形态

- **Ontology Hub**：首次部署用整个 win-x64 zip（Prisma 的 `.dll.node` 和 `.env` 必须在 exe 旁边）；之后只换 exe，重命名覆盖 `ontology-hub.exe`。只有 `prisma` / `@prisma/client` 版本变了才换引擎文件。
- **LightMind**：exe 不跑 migration，migration 要和换 exe 一起安排（schema 变了会让旧 exe 崩）。新 skill 目录在 exe 外面，要拷进旁边的 `skills/`。
- **LightMCP**：`lightmcp.exe` 以 host 模式跑，`lightmcp.env` 放旁边，里面是 `PLATFORM_BASE_URL` 和 `LIGHTMCP_PORT`。

## 三、由 bot 自己换文件（仅当 Kip 明确要求）

默认 Kip 自己换。若他要求 bot 动手：

- 路径：Lighthouse `D:\app-alm\py_nb`，Lightmind `D:\app-agent`
- **RDP 前必须先问**（会踢掉别人的会话）
- 先看有没有任务在跑；Lighthouse 的 `py_total.exe` 必须空闲，**绝不在运行中覆盖**
- 只覆盖目标产品的目录，不要碰另一个产品的文件夹
- 完事后注销桌面
- **绝不**在聊天或记忆里保存 RDP 密码

## 铁律

- 解释在前，动手在后。任何生产写入（DB 行、migration、测试数据）先说清改什么、为什么，等 Kip 说 go。
- Kip 说「你先别改」→ 立刻停，确认没有改动，说明原因。
- 改 schema 前先备份。
- env 以 Kip 机器上的 `.env` 为准（他的端口和代码默认值不一样）。
- 绝不把密钥贴回聊天，用 `<数据库密码>` 这类占位符。
- 绝不 push `main`。
