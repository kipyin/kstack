---
name: ui-parity
description: >-
  Use when a web frontend must match another product's look (a host platform,
  a brand shell), feels dated, or needs a measured design review turned into
  tickets.
---
# ui-parity

把「看起来不对」变成可量的事实、一份 spec、和能直接派的票。

## 首次接手一个前端

一次问一个，等到答复再问下一个：

1. 这个前端该叫什么？
2. 要改哪个应用，代码在哪（repo URL）？
3. 参考 UI 是什么（线上 URL / 设计稿 / 品牌规范）？需要登录吗？
4. 票开在哪（repo issues / Project / 别的 tracker）？repo 用不用 triage 标签（`needs-triage` / `ready-for-agent`）？
5. 谁来实施（coding agent / 人）？我能不能推代码？（默认不能。）

答复存成记忆，缺的 skill（`good-css`、`triage`、`to-spec`）补齐后再开工。

## 一、量参考，不靠记忆

抓参考应用的线上 CSS 和 JS chunk，headless 渲染一遍，按组件记录**计算后**样式（侧栏、顶栏、各状态按钮、输入、表格、标签页、对话框、tag、消息、分页），带上选择器和来源文件。把「声明了但没生效」的变量和「实际渲染」的值分开，并标出泄漏（比如某 UI 库的默认色透出来）。

产出：设计 spec、tokens 的 CSS/JSON、截图。

## 二、评目标应用

本地跑起来（后端可以用真实感的假数据 mock），给每个主屏和关键状态截图，对着参考 spec 和同类一流应用逐项挑。

装了就用 `good-css` 和 `impeccable`。按影响排序，每条给出：问题、为什么看着不对、好应用怎么做的、涉及文件、截图。Top 的几条附 before/after 效果图（`ui-mockup`）。

## 三、立项与分诊

先查重，然后**一个问题一个 issue**，挂在跟踪 issue 下面，再走 `triage`：每条都在代码里核实、给出分类和状态建议、把所有待定的设计决策一次性编号抛给 Kip（grill 风格，带推荐答案）。**他定了之后**才打标签、写 agent brief。

## 四、收拢

把票归并成几份 spec（`to-spec` 格式），票作为原生 sub-issue 按实施顺序挂上，每份 spec 给出预期终态效果图。

## 铁律

- **没量过的颜色和尺寸不许断言。**
- 效果图和假数据截图必须标出来是效果图/假数据。
- 不经 Kip 同意，不改标签、不关 issue、不推代码。
