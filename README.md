# TK Content Workbench

这是一个可直接交付给客户的静态网页工具。

当前版本已支持：

- 文案脚本生成
- 变体扩展 / 本土化 / 剪辑 SOP
- 扩展产品录入与图片绑定
- GitHub 数据同步
- 基于产品卖点与参考图的 AI 生图

## 当前目录包含什么

- `index.html`
  GitHub Pages / 静态托管推荐入口文件
- `tk_content_workbench_v5.html`
  本地开发主文件
- `assets/reference-images/`
  内置产品参考图，已经改为项目相对路径

## 仓库现在在哪里

- 本地项目目录：`C:\Users\Administrator\Desktop\x9产品\2026_4_18`
- 如果你要把它变成 GitHub 仓库，需要先在 GitHub 新建一个空仓库，再把这个目录 push 上去
- 我已经把它整理成适合直接初始化为 git 项目的结构

## 怎么分享给别人

### 方式 1：直接打包发客户

把下面这些一起打包成 zip 发给对方：

- `index.html`
- `assets/`
- 你从页面里导出的工具数据 json（如果需要带上扩展产品和生成历史）

对方使用方式：

1. 解压
2. 双击打开 `index.html`
3. 填自己的 OpenAI API Key
4. 如果你额外给了工具数据 json，就在“扩展产品”页里导入

### 方式 2：发布到 GitHub Pages

1. 在 GitHub 新建一个空仓库
2. 上传以下内容到仓库根目录：
   - `index.html`
   - `assets/`
   - 可选：导出的工具数据 json
3. 在 GitHub 仓库设置里开启 Pages
4. Source 选择 `Deploy from a branch`
5. Branch 选择 `main`，目录选择 `/root`
6. 保存后，GitHub 会生成一个公开网址

## 工具里的数据保存在哪里

- 扩展产品库：浏览器 `localStorage`
- 生成历史：浏览器 `localStorage`
- GitHub 配置：浏览器 `localStorage`

如果要迁移到别人电脑，建议使用页面里的：

- `导出工具数据`
- `导入工具数据`

## GitHub 同步说明

页面内置了 GitHub 同步能力，会把以下内容推到仓库：

- `custom-products.json`
- `generation-history.json`
- `manifest.json`
- `images/...`

注意：

- 需要用户自己填写 GitHub Token
- Token 需要仓库 `contents` 写权限
- 这是纯前端工具，建议让最终使用者填写自己的 Token 和 API Key

## 建议的交付方式

如果这是给客户长期使用，推荐：

1. 先把工具发布成 GitHub Pages 链接
2. 再把一份导出的工具数据 json 一起交付

这样客户既能直接访问网址，也能保留你帮他整理好的扩展产品库。

## 建仓后常用命令

```bash
git init
git branch -m main
git add .
git commit -m "Initial shareable release"
git remote add origin https://github.com/<your-account>/<your-repo>.git
git push -u origin main
```
