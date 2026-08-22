# Issue Summary 示例（EXAMPLES）

覆盖六类 vehicle 的样本，避免把某一种（比如 curl）当成模板套到所有 ticket。
前三类来自 agent-chat 切片（已发到 Gitee），后三类基于精算 / 大模型 / 工具 issue 的 body 推断（示范形态，标注「推断」）。
参考它们的写法（做什么 + 命令/操作 + expectation），vehicle 按你的 ticket 重选。

---

## vehicle: HTTP 契约（IK3MES，已发）

前提：本地 agent server 已在 http://127.0.0.1:8825 运行（`agent-chat --server`）。

**1) 列出可用模型**

```bash
curl -s http://127.0.0.1:8825/agent/models
```

expectation：200，JSON 数组；每项有 id / display_name / context_window；只含 enabled；恰好一个 default；不含 api_key / base_url

**2) 用默认模型发一个问题**

```bash
curl -sN -X POST http://127.0.0.1:8825/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"user_id":"alice","question":"你好"}'
```

expectation：SSE 流，event: thinking 然后 event: token…；流结束拿到 message_id 和 conversation_id

**3) 用不存在的 model 发问**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8825/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"user_id":"alice","question":"x","model":"no-such-model"}'
```

expectation：输出 400（被拒，不会静默回退默认模型）

**4) 打开刚才的会话**（用第 2 步的 conversation_id）

```bash
curl -s http://127.0.0.1:8825/agent/conversations/<conversation_id>
```

expectation：200；字段叫 conversation_id 不是 id；messages 每条有 message_id；assistant 消息上有 thinking；context 有 used / limit（limit 等于 catalog 里该模型的 context_window）；会话上有 model 字段

---

## vehicle: UI 操作 checklist（IK3MEX，已发）

用 `agent-chat --tui` 启动（自动起或 attach server）。逐项操作确认：

1. 登录：输入 username 进入主界面
2. 新建会话提问，看到答案流式输出；生成中看到 thinking（折叠成 `Thinking…` 带动画点，或展开的灰色斜体滚动窗口）
3. model picker 切一个模型，再问一次，确认用的是选的模型
4. 编辑某条历史问题：旧答案保留为版本，新答案生成
5. regenerate 某条 assistant 回答
6. 激活一个旧版本，继续问，确认从旧路径走
7. 删除一条消息（纯回退）、删除整个会话
8. 复制一条回复，粘贴出来是可读的文本
9. debug share 切 chat / +thinking / +tools 三档，复制内容不同
10. 输入 `/report`、`/usage`、`/tools`、`/multi` 应无效（已砍掉）

---

## vehicle: 构建 + 文档（IK3MEZ，已发）

**1) 默认构建不含 UI 依赖**

```bash
# 仓库的默认 build 命令（不带 --all）
```

expectation：产物里不含 streamlit / textual

**2) 全量构建含 agent-ui**

```bash
build --all
```

expectation：产物（py_total）里含 agent-ui 相关，体积比默认大

**3) 用打包产物起 thin UI**（在服务器上）

expectation：跑打包出来的 py_total 启动 `agent-chat --web`，能起来、连上本地 agent、能提问

**4) 读 ADR / install 文档**

expectation：明确写 thin UI 要 `uv sync --extra agent-ui`；不再保留“plain uv sync 就能用 web/TUI”的旧说法

---

## vehicle: 精算 / 数值计算（IK3GRM，推断）

前提：能跑 solvency 合成净资产计算，有任务 13332（基础情景）和 13435（利率下降）的数据。

**1) 跑口径对比**（IFRS17 负债应取 amt，不是 adj_amt）

```
<仓库的合成净资产计算命令，对比 13332 / 13435 两个任务>
```

expectation：负债替换用 amt 后，合成净资产残差量级与「资产 Δ + 投资账面调整 Δ」一致（同对比约 -0.075 亿级），不再出现约 0.46 亿的 amt/adj_amt 增量差（golden）

**2) 跑 self-check**（构造口径差异情形）

```
<仓库的 self-check / 回归命令>
```

expectation：构造「权益随负债 amt 变动、amt 与 adj_amt 增量不同」的情形，断言残差不含口径差（golden）

---

## vehicle: 大模型工程 / 流程（IK2AR6，推断）

前提：reconcile 的注册模块体系就位。

**1) reconcile 只走注册模块**

```
<触发 reconcile 的命令或调用>
```

expectation：只暴露已注册模块；从模块 inputs 重算，不是查 result 对比；不支持的 goal 在模块覆盖边界停下，不再调别的 family

**2) 边界输入**

- 省略 acc_period：保留全期行为
- 空串 acc_period：invalid
- 模块不适用：与「执行成功但无 evidence」可区分，且两者都不可 retry

**3) deterministic pass-through**

expectation：deterministic reconciliation 契约走 `Agent.ask_stream()`，注册、legacy verify 移除、prompt、产物、测试、gate 作为单一 rollback unit 一起落地

---

## vehicle: 工具 / CLI（IK3BL6，推断）

**1) 跑 whatif 估算**

```bash
uv run python -m solvency.tools.cq whatif ratio --task <task_id> [knobs...]
```

expectation：打印 per-period comprehensive / core ratio + AC/MC headline；输出明确标注 estimate（非落库真值）

**2) 副作用边界**

expectation：不写数据库，不触发 run_forecast（只读）

**3) skill 路由**

expectation：agent skill 把 what-if 问题路由到这个命令，且禁止把 estimate 当 decision-grade（需 re-run）
