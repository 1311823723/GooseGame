# Development Log

## 2026-05-12 保守瘦身与维护性优化

- 修改目标：在不改变功能、UI、接口和数据结构的前提下，清理明显残留变量并合并重复样式。
- 修改文件：`app/home-client.tsx`、`app/globals.css`、`DEVELOPMENT_LOG.md`。
- 修改原因：`Dashboard` 和 `MatchesPanel` 存在历史筛选残留别名，数据库管理复位状态重复，按钮基础样式重复。
- 验证命令：`npm run lint`、`npm run build`。
- 验证结果：通过。首次 `npm run lint` 因 `.next/types` 尚未生成失败；运行 `npm run build` 后重跑 `npm run lint` 通过。
- 后续风险：`web/` 子项目和 Python Streamlit 文件存在功能重叠，但用途不确定，本次未删除。
