# Development Log

## 2026-05-12 保守瘦身与维护性优化

- 修改目标：在不改变功能、UI、接口和数据结构的前提下，清理明显残留变量并合并重复样式。
- 修改文件：`app/home-client.tsx`、`app/globals.css`、`DEVELOPMENT_LOG.md`。
- 修改原因：`Dashboard` 和 `MatchesPanel` 存在历史筛选残留别名，数据库管理复位状态重复，按钮基础样式重复。
- 验证命令：`npm run lint`、`npm run build`。
- 验证结果：通过。首次 `npm run lint` 因 `.next/types` 尚未生成失败；运行 `npm run build` 后重跑 `npm run lint` 通过。
- 后续风险：`web/` 子项目和 Python Streamlit 文件存在功能重叠，但用途不确定，本次未删除。

## 2026-05-16 Next 与 Streamlit UI 重构

- 修改目标：在不改变业务逻辑、API、数据库结构和路由的前提下，统一 Next 与 Streamlit 的正式展示风格。
- 修改文件：`.gitignore`、`app/home-client.tsx`、`app/ui-primitives.tsx`、`app/globals.css`、`app.py`、`ui_utils.py`、`pages/1_数据大厅.py`、`pages/2_战绩管理.py`、`pages/3_对局明细.py`、`DEVELOPMENT_LOG.md`。
- 修改原因：当前 Next 与 Streamlit 页面视觉体系不完全统一，部分按钮、空状态、状态提示和排行条仍是页面内临时写法；移动端与微信内置浏览器需要更稳的轻量样式兜底。
- 验证命令：`python3 -m compileall app.py pages ui_utils.py attendance_utils.py db_utils.py`、`npm run lint`、`npm run build`、`npm run dev`、`.venv/bin/streamlit run app.py --server.headless true --server.port 8501`。
- 验证结果：Python 编译、TypeScript lint、Next production build 通过；Next dev server 与 Streamlit dev server 均启动成功。浏览器截图验证和外部 curl 可达性检查因当前本地权限额度限制未完成。
- 后续风险：Next 侧采用轻量 shadcn 风格 primitives，未引入 Tailwind/Radix 依赖；如后续需要完整 shadcn CLI，需要单独评估依赖和样式迁移成本。
