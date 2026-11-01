---
name: ui-mockup
description: >-
  Use when Kip asks for a 效果图 or UI mockup, or a UI change needs a mockup
  before anyone builds it.
---
# ui-mockup

效果图是「动手之前先说定的样子」。Kip 认可效果图之后，实现才从它出发。**效果图不是 PR**：永远不要开一个 PR 只为了展示效果图。

## 谁画

派一个 **Cindy subagent**（worker 角色），把下面 §Brief 的内容作为它的任务，让它产出图片文件并写在本地目录里。不要用主对话的画图能力硬凑，也不要开 Lody session。

一次性、用完即弃；同一次改动要出多张时，可以一次派多个 subagent 并行。

## Brief（每次都要写全）

- 用**真实的 lightmind 设计 token**（颜色、字体、间距），不要自造
- **嵌入态**平台页面，**1440×900** CSS px（在宿主壳里），不要独立 App 窗，不要 375 宽
- 设置类/配置类弹窗居中，不要右侧抽屉
- 弹窗圆角 12px；弹窗内的按钮、输入、卡片 6–8px
- **选中态**：选项选中用实心色块（品牌色实心方块/圆点），不要打钩，除非该 ticket 的 Kip 决定另有说明
- 保留宿主 chrome（顶栏/侧栏等真实平台边框），不要发明设计系统里没有的装饰
- 改动类：**前后对比**并排

## 检查（给 Kip 看之前自己过一遍）

逐条对照 Brief，不合格就重画：尺寸错、画成独立 App、375 宽、缺宿主壳、用打钩代替实心选中态。

## 交给 Kip

1. 图片以**文件附件**形式发在聊天里（`file://` 或直接附件），不要 base64 切片、不要 echo 片段
2. 需要留在 GitHub 上的，用 `gh-image`（有 issue 时 `gh issue comment <N> --attach <png>` 更快）
3. 等 Kip 说 ok。**认可之后**才把「实现」交出去，附带这张效果图
4. 效果图文件不进代码提交；交付后清掉临时目录

## Rules

- 效果图只在聊天和 GitHub 上出现，不进 commit、不进 PR 分支。
- 没有 Kip 的 ok 不进入实现。
- 截图尺寸与模式跟验收保持一致：**嵌入态、1440×900、不要 375、不要独立页**。
