# CLAUDE.md — 双轨备忘录（Dual-Track Memo）

> 本文件放在仓库根目录，是项目的唯一开发指引，每次会话自动加载。
> 所有实现必须服从本文件；想法与本文件冲突时，先改本文件、再动代码。

## 0. Claude Code 工作守则（最高优先级）

1. **完成的唯一定义**：`pnpm check` 全绿（typecheck + lint + i18n:check + test + build）。不绿不提交、不汇报完成。
2. **数据契约**：`src/types.ts` 是全项目唯一真相。修改它必须在同一次提交内同步 storage、hooks、相关组件与测试，commit message 加 `contract:` 前缀。
3. **分层隔离**：UI 组件禁止 import `src/storage/*`，只能经 `src/hooks/*` 取数与写入。
4. **文案**：所有用户可见文字必须走 `t('key')`，组件内禁止硬编码中英文。
5. **派生值**（倒计时、最晚开始日、四象限归属）永远实时计算，禁止写入存储。
6. **依赖**：只允许 §3 列出的库。确需新增，先在 `docs/DECISIONS.md` 写明理由。
7. **自主推进**：遇到规格未覆盖的细节，按"最小惊讶"自行决定并继续，同时在 `docs/DECISIONS.md` 追加一行（日期 · 决定 · 理由）。不要停下来等确认。
8. **提交**：conventional commits（feat / fix / refactor / test / chore / docs / contract），小步提交。
9. 每个阶段结束，对照 §12 验收清单逐项自查并打勾。

## 1. 项目定位

单人使用的「双轨备忘录」Web App：

- **轨道一（轻）**：饭局/见人周历——每天中午、晚上跟谁吃饭。
- **轨道二（重）**：开发与创业事务——任务分「模糊 / 明确」两档。

中文默认界面，可切英文。移动端与桌面端同等打磨（375px 与 1280px 都是一等公民）。

**MVP 非目标（禁止实现）**：语音录入（P2）、提醒推送、多用户协作、Supabase 云端（P1）、甘特图、原生 App。

## 2. 架构铁律（来自需求方，不可违背）

原始要求：

1. 从第一版起倾向模块化与前后端独立。
2. 防止未来修改工程量大。
3. 改一点 UI、增删一两个字段，不得牵一发动全身。

落实手段（本项目的宪法）：

- 单一数据契约：`types.ts`，全项目 import 它。
- 存储走 Adapter 接口：MVP 用 localStorage 实现，P1 换 Supabase 实现，**hooks 及以上代码一行不改**。
- UI ↔ 数据隔离：组件只认 hooks。
- 文案走 i18n 字典。
- 派生值不落库。

## 3. 技术栈（锁定）

- Node ≥ 20，包管理 pnpm
- Vite + React 18 + TypeScript（`strict: true`，eslint 禁 `any`），路径别名 `@/` → `src/`
- Tailwind CSS
- 状态：zustand（meals 与 tasks 各一个 store）
- 拖拽：@dnd-kit/core + @dnd-kit/sortable
- 路由：react-router-dom
- 日期：date-fns（仅做周计算与差值；存储一律 `'YYYY-MM-DD'` 字符串）
- 测试：vitest + @testing-library/react + jsdom
- 质量：eslint + @typescript-eslint + prettier；husky + lint-staged
- i18n 自实现（§9），不引 i18n 框架。除上述外不加任何库。

## 4. 目录结构

```
src/
  types.ts             # ★ 数据契约唯一真相
  lib/
    dates.ts           # 周计算 / 倒计时 / 最晚开始日（纯函数，必须有单测）
    quadrant.ts        # 四象限分组与排序（纯函数，必须有单测）
    seed.ts            # 示例数据 buildSeed(today)
    id.ts  csv.ts
  i18n/
    index.ts           # t(key) + useLocale()
    zh.ts  en.ts
  storage/
    adapter.ts         # StorageAdapter 接口
    local.ts           # localStorage 实现（MVP 默认）
    supabase.ts        # P1；现在只留同接口空实现 + TODO
    index.ts           # 选择并导出当前 adapter 实例
  hooks/
    useMeals.ts  useTasks.ts
  components/
    common/  today/  meals/  tasks/
  pages/
    Today.tsx  Meals.tsx  Tasks.tsx  Archive.tsx  Settings.tsx
  App.tsx  main.tsx
docs/
  DECISIONS.md         # 追加式决策日志
scripts/
  i18n-check.mjs
.github/workflows/ci.yml
```

## 5. 数据契约（`src/types.ts` 初版全文）

```ts
export const SCHEMA_VERSION = 1

export type ISODate = string // 'YYYY-MM-DD'

// 轨道一：饭局。(date, slot) 唯一，一槽一条；多人写进 person，细节写 note。
export interface MealSlot {
  id: string
  date: ISODate
  slot: 'lunch' | 'dinner'
  person: string
  place?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export type TaskMode = 'fuzzy' | 'firm'
export type TaskStatus = 'todo' | 'doing' | 'done' | 'shelved'
export type TaskSize = 'S' | 'M' | 'L' | 'XL'

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Task {
  id: string
  title: string
  mode: TaskMode
  status: TaskStatus
  important: boolean      // 四象限 = important × urgent
  urgent: boolean
  size?: TaskSize         // 模糊档的规模感
  deadline?: ISODate      // firm 档必填（由表单与 hooks 校验）
  estimateDays?: number   // 预计耗时（天，支持 0.5），firm 档使用
  tags: string[]
  checklist: ChecklistItem[]
  sortOrder: number       // 同象限内手动顺序
  note?: string
  doneAt?: string         // ISO datetime；status='done' 时写入
  createdAt: string
  updatedAt: string
}

export interface AppData {
  schemaVersion: number
  meals: MealSlot[]
  tasks: Task[]
}
```

档位转换：升档（fuzzy→firm）要求 deadline 已填；降档只翻 `mode`，**保留** deadline / estimateDays 的值。

## 6. 存储层

```ts
export interface StorageAdapter {
  load(): Promise<AppData>
  saveMeal(meal: MealSlot): Promise<void>   // upsert
  deleteMeal(id: string): Promise<void>
  saveTask(task: Task): Promise<void>       // upsert
  deleteTask(id: string): Promise<void>
  replaceAll(data: AppData): Promise<void>  // 导入用
}
```

- `local.ts`：单 key `dtm.data.v1` 整包 JSON，写入 300ms 防抖；load 校验 schemaVersion。
- `supabase.ts`：P1 实现；现在所有方法 `throw new Error('P1')` 并留 TODO。
- adapter 内不做任何业务逻辑、校验、排序——只做持久化。

## 7. 领域规则（`lib/` 纯函数，必须有单测）

`dates.ts`

- `weekOf(date)`：返回以周一起始的 7 个 ISODate。
- `daysUntil(deadline, today)`：整数天差；0 = 今天到期，负 = 逾期。
- `latestStartDate(deadline, estimateDays)`：`deadline − ceil(estimateDays) + 1`（当天开工算一整天）。estimateDays 缺省 → 返回 null。
  例：deadline = 今天+5、estimate = 2 → 最晚开始 = 今天+4；estimate = 0.5 → 最晚开始 = deadline 当天。

`quadrant.ts`

- `quadrantOf(task)`：Q1 重要且紧急 / Q2 重要不紧急 / Q3 紧急不重要 / Q4 都不。
- `groupFuzzy(tasks)`：按 Q1→Q4 分组，组内按 sortOrder 升序。
- 拖拽落点重算 sortOrder：用间隔 1000 的整数，必要时批量归一化。

展示规则：

- firm 列表按 deadline 升序。倒计时徽章：>3 天灰、1–3 天橙、今天/逾期红，逾期显示「逾期 n 天」。
- 最晚开始日显示「最晚 M/D 开始」；已过且 status='todo' 时加红色提示「该开始了」。
- `done`：doneAt 为今天 → 原列表划线置底；跨天只出现在归档页。
- `shelved`：默认折叠在列表底部「搁置（n）」，展开可恢复为待办。

## 8. 页面规格

路由：`/` 今日 · `/meals` 饭局 · `/tasks` 任务 · `/archive` 归档 · `/settings` 设置。
布局：顶部三个主 Tab（今日 | 饭局 | 任务）+ 右侧「⋯」菜单（归档、设置）。内容区 `max-w-3xl` 居中，`md:` 以上做桌面增强。

### 8.1 今日 `/`

- 日期 + 星期（随语言格式化）。
- 午 / 晚两张卡片：有安排显示 person（+ place）；空槽整卡留白仅淡「＋」，点击直达当日该槽编辑。
- 「最近 deadline」：firm 且未完成，按 deadline 取 3 条，带倒计时，点击跳 `/tasks`。
- 全站无数据时显示空状态：按钮「载入示例数据」「直接开始」。

### 8.2 饭局 `/meals`

- 周视图：移动端竖排 7 行（周一→周日）、每行两格 午|晚；`md:` 以上 7 列 × 2 行网格。同一组件响应式切换。
- 今天高亮；空槽纯留白，点击即建。
- 头部：‹ 上周 · 本周（起止日）· 下周 ›，可无限回翻历史；非本周时出现「回今天」。
- 槽位弹层：person 必填，place / note 选填；已有槽点开可改可删。

### 8.3 任务 `/tasks`

- 「模糊 | 明确」子视图切换；`md:` 以上双栏并排。
- 模糊列：Q1–Q4 分组（Q1 红 / Q2 蓝 / Q3 琥珀 / Q4 灰），组内 dnd-kit 拖拽，顺序持久化。
- 任务卡：title、size 徽章、tags、checklist 进度（如 2/5）、状态点；点开抽屉编辑。
- 明确列：deadline 升序；卡片加倒计时徽章、最晚开始日、estimate。
- 新建：右下悬浮「＋」；表单随 mode 动态显隐字段，firm 必填 deadline。
- 卡片操作：状态流转（待办 ↔ 进行中 → 完成；任意 → 搁置 → 恢复）、升/降档、编辑、删除（需确认）。
- 标签：输入 `#xx ` 生成 chip；列表头部标签筛选（多选，OR 逻辑）。
- checklist 仅一层，可增删勾选，禁止嵌套。

### 8.4 归档 `/archive`

- done 且 doneAt 非今天的任务，按月分组倒序；条目可「恢复为待办」。

### 8.5 设置 `/settings`

- 语言切换（中 / EN），即时生效并持久化（key `dtm.locale`）。
- 导出：JSON（完整 AppData）；CSV（meals.csv、tasks.csv，UTF-8 带 BOM；checklist/tags 序列化为 JSON 字符串列）。
- 导入 JSON：先预览条数，确认后 `replaceAll`。
- 「载入示例数据」（仅当前为空时可用）。
- 危险区：清空全部数据（两步确认）。

## 9. i18n（自实现）

- `zh.ts` 为全量字典；`en.ts` 必须与 zh 完全同 key（用 `satisfies` 约束）。默认中文。
- `t(key)` + `useLocale()`。
- `pnpm i18n:check`：脚本扫描 `src/components` 与 `src/pages` 中的 CJK 字符（豁免 `i18n/` 与 `*.test.*`），发现即退出码 1。纳入 `pnpm check`。
- 日期本地化：中文「8月30日 周六」，英文「Sat, Aug 30」。

## 10. 语音录入（P2——现在只留接口，禁止实现）

```ts
// src/voice/parseMeal.ts（P2 实现）
export type MealDraft =
  Pick<MealSlot, 'date' | 'slot' | 'person'> &
  Partial<Pick<MealSlot, 'place' | 'note'>>
export async function parseMealUtterance(text: string, refDate: ISODate): Promise<MealDraft[]>
```

语音产出的草稿必须走与手动录入**完全相同**的 `useMeals().upsert()` 路径。现在仅创建带 TODO 的文件与类型。

## 11. 自动化

**package.json scripts**：`dev` / `build` / `preview` / `typecheck`（tsc --noEmit）/ `lint` / `lint:fix` / `format` / `test` / `test:watch` / `i18n:check` /
**`check` = typecheck && lint && i18n:check && test && build** ← 完成的唯一标准。

**Git hooks**：husky pre-commit → lint-staged（暂存文件 prettier + eslint --fix）。

**CI**（`.github/workflows/ci.yml`）：push / PR 到 main → pnpm 缓存 → `pnpm i --frozen-lockfile` → `pnpm check`。

**示例数据**：`lib/seed.ts` 的 `buildSeed(today)` 生成——本周 4 条饭局（含今天午餐）；8 条任务覆盖四象限、两档、各状态，其中 1 条逾期、1 条含 checklist 与多标签。只经空状态/设置页按钮注入，绝不自动写入。

## 12. MVP 验收清单（全过 = MVP 完成）

- [ ] 全新 clone 后 `pnpm i && pnpm dev` 直接可用：零环境变量、零外部账号
- [ ] `pnpm check` 全绿；GitHub CI 绿
- [ ] 空状态 → 载入示例数据 → 三个主页面立即有内容
- [ ] 饭局：新建 / 编辑 / 删除；翻到上周与下下周再回今天；刷新数据仍在
- [ ] 模糊任务：四象限归组正确；组内拖拽后刷新顺序保持
- [ ] 明确任务：排序、倒计时（含「逾期 n 天」）、最晚开始日正确（用例：deadline=今天+5、estimate=2 → 最晚开始=今天+4）
- [ ] 升档补 deadline 生效；降档回来 deadline / estimate 值不丢
- [ ] 完成任务当天划线置底；把 doneAt 改为昨天后出现在归档并可恢复
- [ ] 搁置折叠区、标签筛选、checklist 勾选均可用
- [ ] 导出 JSON + 两份 CSV 可下载；导入 JSON 完整还原
- [ ] 中英切换全站生效，`i18n:check` 通过
- [ ] 375px 与 1280px 手动走查无破版
- [ ] `dates.ts` / `quadrant.ts` / `storage/local.ts` 单测覆盖边界（逾期、0.5 天、跨年的周）

## 13. 路线图

- **P0（本 MVP）**：上述全部。
- **P1**：Supabase adapter（meals / tasks 两表；checklist 用 JSONB、tags 用 text[]）+ 单账号邮箱登录 + Vercel 部署。迁移 = 本地导出 JSON → 登录后导入。**验收：hooks 及以上 UI 代码零改动**——这是 §2 铁律的试金石。
- **P2**：语音 + LLM 解析落槽；PWA（可安装、离线可读）。
- 每个阶段收尾 `pnpm check` 必须绿。

## 14. 起手式（首次会话按序执行）

1. 初始化 Vite React-TS + 全部工具链，业务代码为零时先跑通 `pnpm check` → commit `chore: scaffold`
2. `types.ts` + `lib/` 纯函数 + 单测 → commit `contract: v1 + domain rules`
3. `storage/local` + hooks + seed → commit
4. 页面按 §8 顺序：今日 → 饭局 → 任务 → 归档 / 设置，每页一至数个 commit
5. 对照 §12 逐项自查，修到全过，在本文件勾选后提交
