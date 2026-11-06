---
name: gh-image
description: >-
  Use when preparing or putting screenshots or animated GIFs on GitHub: a PR,
  issue, comment, discussion, or README.
---
# gh-image

凡是放到 GitHub 上的图片（PR、issue、评论、discussion、README），一律走这条路。

GitHub 的 user-attachments 只能在登录后的网页界面里创建，`gh` 和 API 都做不到。所以图片走 Cloudflare R2（bucket `lightxlab-img`），再嵌入公开 URL。细则以 chronicles 仓库 `docs/infra/cloudflare-r2-pr-images.md` 为准。

不要用阿里云 OSS（`lightxlab.oss-cn-hangzhou.aliyuncs.com`）：默认域名会强制下载，GitHub camo 会返回 404。

## 选路线

- **公开路线（默认）**：图片可以公开时，用 R2。
- **私有路线**：截图敏感且 repo 是私有的，就提交到该 repo 的 `pr-assets` 分支，链接 raw URL。不要放进 `main`，也不要放进 PR 分支。

R2 链接任何人都能看。含机密、客户数据或生产凭据的图，要么走私有路线，要么先打码。

## 录制动图

界面交互或动效需要展示过程时，录制实际操作；优先用项目现有的浏览器测试和 fixture 数据。选取能看清触发、变化和结果的短片段，按实际速度播放；保留足够的前后状态，不把静态截图或模拟帧说成真实动效。

将录屏转为 GIF；按需裁掉无关区域，保留可识别的操作上下文。下面的例子使用 `ffmpeg`，`INPUT` 和 `OUTPUT` 是本地文件路径：

```bash
ffmpeg -i "$INPUT" -filter_complex \
  '[0:v]fps=15,scale=900:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle' \
  -loop 0 "$OUTPUT"
```

检查动图实际播放、内容可读且文件大小适合 PR；按需调整帧率、尺寸或片段长度。上传和嵌入沿用下面的图片流程，标明演示的交互及是否使用测试数据。在 GitHub 页面确认动图加载并播放。

## 步骤（公开路线）

1. **准备**。压缩到适合页面加载的大小。key 用 `pr-images/<repo>/<pr-or-issue>/<short-name>.<ext>`，扩展名与图片格式一致。
2. **上传**。凭据在 `~/.secrets/cloudflare-r2-lightxlab.env`（Bitwarden 条目 `cloudflare-r2 — lightxlab-img`，见 `secrets` skill）。不要出现在聊天、PR 或日志里。

   ```bash
   [ -x ~/.venvs/r2/bin/python ] || { python3 -m venv ~/.venvs/r2 && ~/.venvs/r2/bin/pip install -q boto3; }
   set -a; . ~/.secrets/cloudflare-r2-lightxlab.env; set +a
   ~/.venvs/r2/bin/python - "$FILE" "pr-images/<repo>/<pr>/<name>.png" <<'PY'
   import boto3, os, sys, mimetypes
   s3 = boto3.client('s3', endpoint_url=os.environ['R2_ENDPOINT'], region_name='auto',
                     aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
                     aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'])
   ct = mimetypes.guess_type(sys.argv[1])[0] or 'application/octet-stream'
   s3.upload_file(sys.argv[1], os.environ['R2_BUCKET'], sys.argv[2], ExtraArgs={'ContentType': ct})
   print(os.environ['R2_PUBLIC_BASE'] + '/' + sys.argv[2])
   PY
   ```

   打印出 `$R2_PUBLIC_BASE` 下的 URL（`https://pub-….r2.dev/pr-images/...`）就算完成。
3. **嵌入**。在 GitHub 上需要的位置写 `![描述](URL)`。图片在 GitHub 页面上真的显示出来才算完成。

## 两条捷径

- **有 issue/PR 时**：`gh issue comment <N> -R <repo> --attach <file>` 直接拿到 user-attachments URL，不用 R2。
- **验证渲染**：先 `gh api markdown -f text='![x](URL)' -f mode=gfm`，再对 camo URL 做 `curl -I`（应返回 200 和对应的图片 Content-Type）。

一定要设置 ContentType，不设的话 camo 可能拒绝这张图。
