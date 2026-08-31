# DEPLOY.md — P1 部署与迁移手册（Supabase + Vercel）

> 面向零经验操作者的逐步指南。全程只需要一个邮箱，两个免费账号，约 15 分钟。

## 一、创建 Supabase 项目（云端数据库 + 登录）

1. 打开 <https://supabase.com>，点右上角 **Start your project**，用 GitHub 或邮箱注册并登录。
2. 进入控制台后点 **New project**：
   - **Name**：随意，例如 `dual-track-memo`
   - **Database Password**：设一个强密码并**自己记好**（这是数据库管理密码，App 用不到它，但找回麻烦）
   - **Region**：选离你近的（如 `Southeast Asia (Singapore)`）
   - 点 **Create new project**，等 1–2 分钟初始化完成。
3. **建表**：左侧栏点 **SQL Editor** → **New query**，把仓库里
   `supabase/migrations/0001_init.sql` 的**整个文件内容**复制进去，点右下角 **Run**。
   看到 `Success. No rows returned` 即成功（两张表 + 行级安全 + 导入函数都建好了）。
4. **关闭公开注册**（保证只有你能用）：左侧栏 **Authentication** → **Sign In / Providers**
   （旧版叫 Settings）→ 找到 **Allow new users to sign up** → 关掉 → Save。
5. **创建你的唯一账号**：**Authentication** → **Users** → **Add user** → **Create new user**：
   - 填你的邮箱 + 设一个登录密码（这是你以后登录 App 用的，跟第 2 步的数据库密码无关）
   - 勾选 **Auto Confirm User**（否则要走邮箱验证）→ 创建。
6. **拿两个配置值**（2025 年后的新版控制台）：
   - **Project URL**：左侧栏 **Project Settings**（齿轮）→ INTEGRATIONS 下的 **Data API**
     页面，第一项就是 Project URL（形如 `https://<项目ref>.supabase.co`，
     `<项目ref>` 与浏览器地址栏 `/project/` 后面那串一致）。
   - **Key**：**Project Settings** → **API Keys** → **Publishable key**（`sb_publishable_` 开头，
     点旁边复制按钮拿完整值）。它是旧版 "anon public" key 的新名字，官方标注
     "can be safely shared publicly"——配了 RLS 就安全。旧项目也可在
     "Legacy anon, service_role API keys" 标签页拿 anon key，二者等效。
   - **绝对不要**使用/外传下方 **Secret keys**（旧称 service_role）——那是能绕过 RLS 的服务端密钥。

## 二、部署到 Vercel

1. 打开 <https://vercel.com>，用 **GitHub 账号**注册登录（这样它能看到你的仓库）。
2. 点 **Add New…** → **Project** → 在列表里找到本仓库 → **Import**。
   - 若列表为空，点 **Adjust GitHub App Permissions** 授权 Vercel 访问该仓库。
3. 配置页：
   - **Framework Preset**：自动识别为 **Vite**，不用改。
   - **Root Directory / Build Command / Output Directory**：都保持默认。
   - 展开 **Environment Variables**，添加两条（值来自上面第一部分第 6 步）：
     | Name                     | Value                |
     | ------------------------ | -------------------- |
     | `VITE_SUPABASE_URL`      | 你的 Project URL     |
     | `VITE_SUPABASE_ANON_KEY` | 你的 anon public key |
4. 点 **Deploy**，等 1 分钟。完成后 Vercel 给你一个 `https://xxx.vercel.app` 域名——
   打开它应该看到**登录页**，用第一部分第 5 步创建的邮箱+密码登录。
5. 以后每次 push 到 main，Vercel 自动重新部署。

## 三、迁移旧数据（本地 → 云端）

1. 在**原来使用的浏览器**里打开本地版 App → **设置** → **导出 JSON**，得到 `dtm-export.json`。
2. 打开 Vercel 域名 → 登录 → **设置** → **导入 JSON** → 选刚才的文件 → 预览条数无误 → 确认。
3. 刷新页面、换一台设备登录，数据都应还在（此后数据只存云端，与浏览器无关）。

## 四、本地开发的两种模式

- **默认（零配置）**：`pnpm i && pnpm dev` —— localStorage 模式，与 P0 完全一致，CI 亦然。
- **连云端调试**：复制 `.env.example` 为 `.env.local`，填入两个值，重启 `pnpm dev`
  —— 出现登录页，登录后读写的就是云端数据。`.env.local` 已被 gitignore，不会提交。

## 五、常见问题

- **登录报「邮箱或密码不正确」**：确认用的是 Authentication → Users 里创建的那个账号，
  且创建时勾了 Auto Confirm；没勾的话在 Users 列表里把该用户 Confirm 掉。
- **打开 Vercel 域名直接进了 App 而不是登录页**：说明 env 没配上——检查两个变量名拼写
  （必须以 `VITE_` 开头），改完需要在 Vercel 里 **Redeploy** 才生效。
- **导入报「文件格式不正确」**：只认本 App 导出的 JSON（会做元素级校验，坏文件整体拒绝）。
- **换 Supabase 项目 / 重建表**：重跑 `0001_init.sql` 前先在 SQL Editor 执行
  `drop function if exists public.replace_all(jsonb, jsonb); drop table if exists public.meals, public.tasks;`
