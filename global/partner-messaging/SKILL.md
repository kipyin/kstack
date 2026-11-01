---
name: partner-messaging
description: >-
  Use before messaging another teammate: sending a direct message, a session
  handoff, notifying about a change, or asking a partner to do something.
  Covers when a message is the right channel, the message shape, delivery
  limits, and what to do when delivery fails.
---
# partner-messaging

消息是**请人做一件事**或**要人回一句**的通道，不是广播事实的地方。

## 铁律

1. **事实写进 skill / GitHub，不靠消息广播。** 状态、规则、代码位置这类东西放进 `kstack/global/` 的 skill 或 issue/PR；对方下一轮自然会读到。用消息转达事实 = 迟早漂移。
2. **一条消息只请求一件事。** 要两件事就发两条，或者合成一条但只要求一个回复。
3. **必须写清「回什么」。** 没有明确回执要求的消息，对方会干完活不回你，然后你就被节流锁住。
4. **不要在对方忙的时候追。** 看到"能力正在刷新"就等，不要重试。

## 三个渠道

| 渠道 | 用途 | 限制 |
|---|---|---|
| `send_to_agent(target_id, message)` | 给某个伙伴发 DM | **同一伙伴连发两条未获回复 → `WAIT_FOR_PEER` 阻断** |
| `send_to_session(target_session_id, message)` | 把消息投进某个既有会话 | 不受 DM 节流；适合长内容、被阻断时兜底 |
| 群聊 | 多方同时在场的事 | 成员 ≤6，不适合一对一指令 |

`send_to_session` 需要 session id：`list_sessions(teammate_id=..., time_field="activity", limit=5)` 取最新那个。

## 一条消息的形状

```
[来源] 我是谁、这条代表谁（主人原话 / 我自己的判断）
要你做什么 —— 一句祈使句
回什么 —— 明确要求回复的内容（数量 / 结论 / 缺什么）
（可选）时限或优先级
```

好的回执要求：`绑完回一句「已绑定 N 个，缺哪几个」`、`确认后回我 PR 号`、`拿不准就把清单发我`。

坏的回执要求：（没有）、`收到请回复`、`你看一下`。

## 回复的形状

**一句结论 + 数量 + 缺什么**。不要长篇报告、不要复述我说过的话。需要细节就附链接或路径，不粘贴。

## 失败码与处置

| 返回 | 含义 | 怎么办 |
|---|---|---|
| `WAIT_FOR_PEER` | 连发两条未获回复 | **不要重试**。改 `send_to_session` 投递，或等对方回 |
| `PRECONDITION_FAILED` | 对方能力/配置正在刷新 | 等几分钟再发；不要连续试探 |
| `DELIVERY_NOT_ACCEPTED` | 目标不在名册 | 用返回的 `available_agents` 核对 id，不要按名字猜 |
| 已 accepted 但对方没回 | 消息可能到了但被忽略 | **先读对方会话历史**（`get_chat_history`）确认他做了什么，再决定要不要再发 |

## 发之前自检四问

1. 这条是**请求**还是**广播事实**？是事实 → 改写进 skill / GitHub，别发。
2. 对方**回什么**我已经写清了吗？
3. 我是不是**刚给他发过还没回**？是 → 改渠道或等。
4. 这条内容**能不能一次说全**？批量配置类（白名单、清单）一次给完整，给错一次要多耗一个来回。

## 反面例子（都真实发生过）

- 把「标签只剩三个了」这种规则变更用消息逐个通知 → 应该改 skill，因为规则本来就该在 skill 里。
- 同一伙伴连发三条催绑定 → 第三条永远发不出去，还浪费两个来回。
- 消息里只写「你的清单最终版」而漏掉某个 id 的正确拼写 → 对方绑错，再来一轮。
- 对方其实已经回复且干完了，我还在试第三次 → 应该先读会话历史。
