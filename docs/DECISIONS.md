# DECISIONS.md — 追加式决策日志

> 格式：日期 · 决定 · 理由。只追加，不修改历史条目。

- 2026-08-30 · Tailwind 采用 v4（`@tailwindcss/vite` 插件，CSS 里 `@import 'tailwindcss'`） · 规格只锁定"Tailwind CSS"未锁版本；v4 免去 postcss/autoprefixer 两个额外配置与依赖，依赖面更小。
- 2026-08-30 · 工具链附属 devDependencies（@eslint/js、globals、eslint-plugin-react-hooks、eslint-plugin-react-refresh、eslint-config-prettier、@types/react、@types/react-dom、@types/node、@testing-library/dom） · 均为 §3 已列质量工具（eslint/prettier/vitest/RTL）的官方组成或 peer 依赖，非运行时新库。
- 2026-08-30 · 显式声明 `@dnd-kit/utilities` · @dnd-kit/sortable 官方文档要求配套使用（CSS transform 工具），属 dnd-kit 家族而非新增第三方。
- 2026-08-30 · react-router-dom 用 v7（按 v6 兼容 API 使用） · 规格未锁版本，v7 为当前稳定版。
- 2026-08-30 · vitest 开启 `globals: true` · 减少每个测试文件的样板 import，`tsconfig types` 已配 `vitest/globals`。
- 2026-08-30 · 新增 `src/hooks/useAppData.ts` 承担跨 store 操作（导出/导入/清空/载入示例数据） · §4 目录未覆盖此类操作归属；放 hooks 层符合"UI 只认 hooks"铁律，最小惊讶。
- 2026-08-30 · `latestStartDate` 对 estimateDays=0/负值不做钳制，公式照抄 `deadline − ceil(est) + 1` · 规格仅定义 undefined→null；表单层负责禁止非正 estimate。
- 2026-08-30 · storage 边界深拷贝（load/replaceAll 走 structuredClone）+ `pagehide` 时 flush 防抖窗口 · 防调用方与 adapter 缓存互相别名、防关页丢 300ms 内写入；adapter 职责仍是纯持久化。
- 2026-08-30 · `useMeals.upsert` 带 id 更新若撞上另一条同 (date,slot) 记录，删除被挤占的记录 · 维持 §5「一槽一条」不变量，规格未覆盖此冲突。
- 2026-08-30 · `useTasks.update` 补 doneAt 簿记（与 setStatus 同规则） · types.ts 注明 status='done' 时写入 doneAt，不变量须在所有改 status 的路径上成立。
