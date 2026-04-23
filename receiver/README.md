# GitHub Data Receiver

这是给当前前端工具配套的低成本接收器模板。

## 适用场景

如果你希望：

- 用户打开公开网页后继续正常使用
- 用户生成的扩展产品、文案历史、AI 图片不要只留在用户本地
- 这些数据最终自动沉淀到你自己的 GitHub 数据仓库

那就不要把 GitHub Token 直接写到前端，而是用一个极轻量的接收器中转。

当前仓库已内置前端入口：

- 页面里的 `你的 GitHub 数据仓库接收`

这里建议填写一个 Cloudflare Worker 地址，再由 Worker 把数据写进你的 GitHub 数据仓库。

## 为什么需要接收器

因为纯前端静态网页如果直接调用 GitHub 写接口，就必须把你的写权限 Token 暴露给所有用户，这是不安全的。

## 推荐最低成本方案

1. 新建一个 GitHub 数据仓库
   例：`quentin1413/tk_content_workbench_data`

2. 创建一个 Fine-grained PAT
   只给这个数据仓库 `Contents: Read and write`

3. 部署 `github-data-receiver-worker.js` 到 Cloudflare Worker

4. 在 Worker 环境变量里配置：

- `GITHUB_TOKEN`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_BASE_PATH`
- `SYNC_SECRET`
- `ALLOWED_ORIGIN`

## 最短部署步骤

1. 在本地新建一个目录，把下面三个文件放进去：
   - `github-data-receiver-worker.js`
   - `wrangler.toml.example`
   - `.dev.vars.example`

2. 把 `wrangler.toml.example` 改名为 `wrangler.toml`

3. 把 `.dev.vars.example` 改名为 `.dev.vars`

4. 安装并登录 Wrangler 后执行：

```bash
wrangler login
wrangler secret put GITHUB_TOKEN
wrangler secret put SYNC_SECRET
wrangler deploy
```

5. 部署成功后，把返回的 Worker URL 填回前端页面的：
   - `接收地址（Webhook）`
   - `接收密钥`

## 推荐环境变量

- `GITHUB_TOKEN`: 你的 Fine-grained PAT
- `GITHUB_REPO`: 例如 `quentin1413/tk_content_workbench_data`
- `GITHUB_BRANCH`: `main`
- `GITHUB_BASE_PATH`: `submissions`
- `SYNC_SECRET`: 自定义一串随机密钥
- `ALLOWED_ORIGIN`: 你的 Pages 地址，例如 `https://quentin1413.github.io`

## 前端如何填写

在工具页面里：

- `接收地址（Webhook）`
  填 Worker 地址，例如 `https://tk-sync.your-subdomain.workers.dev`
- `接收密钥`
  填 `SYNC_SECRET`
- `提交人 / 设备标识`
  可让用户填客户名、门店名、设备名
- `同步说明`
  可写轮次或备注

## 当前接收内容

Worker 会把以下数据写进你的 GitHub 数据仓库：

- `submission.json`
- `custom-products.json`
- `generation-history.json`
- `saved-image-library.json`
- `manifest.json`
- 扩展产品参考图文件
- AI 图片库中的生成图文件

## 仓库落盘结构

默认会按日期和提交批次写入：

```text
submissions/
  2026-04-23/
    2026-04-23T12-00-00-000Z-client-a-1a2b3c4d/
      manifest.json
      submission.json
      custom-products.json
      generation-history.json
      saved-image-library.json
      custom-product-images/
      saved-images/
```

## 说明

这个模板还没有替你完成 Cloudflare 真部署，因为那需要你自己的账号和环境变量。
但前端和接收脚手架已经对齐，你只需要把 Worker 部署起来，然后把地址填回工具页面即可。
