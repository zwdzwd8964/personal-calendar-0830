// i18n:check — 扫描 src/components 与 src/pages 中的硬编码 CJK 字符（CLAUDE.md §9）。
// 豁免：i18n/ 目录与 *.test.* 文件。发现即退出码 1。
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src/components', 'src/pages']
const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'i18n') continue
      walk(full, files)
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !/\.test\./.test(entry)) {
      files.push(full)
    }
  }
  return files
}

const violations = []
for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) continue
  for (const file of walk(abs)) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (CJK_RE.test(line)) {
        violations.push(`${relative(ROOT, file)}:${i + 1}  ${line.trim()}`)
      }
    })
  }
}

if (violations.length > 0) {
  console.error(`i18n:check FAILED — hardcoded CJK found (use t('key') instead):\n`)
  for (const v of violations) console.error('  ' + v)
  process.exit(1)
} else {
  console.log('i18n:check OK — no hardcoded CJK in src/components or src/pages')
}
