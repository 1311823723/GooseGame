# GooseGame Web

Next.js 版本的鹅鸭杀发车助手，目标是走 Vercel Hobby 免费部署。

## 本地运行

```bash
npm install
npm run dev
```

## Vercel 免费部署

1. 在 Vercel 导入这个 GitHub 仓库。
2. Root Directory 选择 `web`。
3. Framework Preset 选择 Next.js。
4. 环境变量后续使用：
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `DASHSCOPE_API_KEY`

## 免费边界

- Vercel 负责页面和轻量 API。
- 持久化数据不写本地文件，继续放 Turso 或其他免费数据库。
- DashScope 识别会消耗你自己的 API Key 额度，不属于 Vercel 免费资源。
- 旧 Streamlit 应用仍保留在仓库根目录，不受 `web` 目录影响。
