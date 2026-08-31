// 语音/文字一句话 → MealDraft[]（CLAUDE.md §10）
// OPENAI_API_KEY 只存在于 Supabase Edge Function secret，前端/仓库/CI 永不接触。
// 平台默认开启 JWT 校验：仅登录用户可调用。
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['drafts'],
  properties: {
    drafts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'slot', 'person', 'place', 'note'],
        properties: {
          date: { type: 'string', description: '具体日期，格式 YYYY-MM-DD' },
          slot: { type: 'string', enum: ['lunch', 'dinner'] },
          person: { type: 'string', description: '跟谁吃，可多人原样保留' },
          place: { type: ['string', 'null'], description: '地点，没有为 null' },
          note: { type: ['string', 'null'], description: '其余细节，没有为 null' },
        },
      },
    },
  },
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// LLM 的日历心算不可靠（实测 gpt-4o-mini 会把「周三」「大后天」算错）——
// 用代码把 refDate 起到下周日的每一天算成对照表让模型查表，而不是让它推算。
const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function buildDateTable(refDate: string): string {
  const [y, m, d] = refDate.split('-').map(Number)
  const base = Date.UTC(y, m - 1, d)
  const refDow = new Date(base).getUTCDay()
  const daysToThisSunday = refDow === 0 ? 0 : 7 - refDow
  const relative = ['今天', '明天', '后天', '大后天']
  const lines: string[] = []
  for (let i = 0; i <= daysToThisSunday + 7; i += 1) {
    const dt = new Date(base + i * 86400000)
    const iso = dt.toISOString().slice(0, 10)
    const dow = dt.getUTCDay()
    const weekTag = `${i <= daysToThisSunday ? '本周' : '下周'}${WEEKDAYS_ZH[dow].slice(1)}`
    const labels = [weekTag, `${WEEKDAYS_ZH[dow]} ${WEEKDAYS_EN[dow]}`]
    if (i < relative.length) labels.unshift(relative[i])
    lines.push(`${iso} = ${labels.join('，')}`)
  }
  return lines.join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { text, refDate } = await req.json()
    if (
      typeof text !== 'string' ||
      text.trim() === '' ||
      typeof refDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(refDate)
    ) {
      return json({ error: 'bad request: need { text, refDate }' }, 400)
    }
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return json({ error: 'OPENAI_API_KEY secret not configured' }, 500)
    // 4o-mini 对「下周X」严格语义等日历边角不稳（实测 11/13），4.1-mini 13/13
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini'

    const system = `你把一句关于饭局安排的自然语言（中文或英文）解析成结构化草稿。
今天是 ${refDate}。下面是日期对照表，日期一律【查表】确定，禁止自行心算：
${buildDateTable(refDate)}
规则：
- 「今天/明天/后天/大后天/tomorrow」等直接查表。单说「周X / Friday」：本周该天还没过去（含今天）就用「本周X」那行；已过去才用「下周X」那行。
- 明说「下周X / next X」的必须严格取「下周X」那行。例：今天是周一时「下周日」= 表中下周日（不是最近的这个周日）。
- 具体日期（如 9月3日）按今年就近换算，仍须与表核对星期不冲突。
- 时段：提到中午/午饭/午餐/lunch/noon → lunch；提到晚上/晚饭/晚餐/dinner/tonight → dinner；未提及默认 dinner。
- person 必须是有意义的非空文字：有人名用人名（多人原样保留，如「李姐、王强」），没有人名就用对象或活动主体（如「同学」「家人」「供应商」），严禁输出 "null"、"无" 之类的占位。place 填地点、note 填其余细节，没有才用 null——null 只允许出现在 place 和 note。
- 一句话可能包含多个安排，逐条输出；与吃饭安排无关的输入输出空数组。`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'meal_drafts', strict: true, schema: DRAFT_SCHEMA },
        },
      }),
    })
    if (!resp.ok) {
      const detail = await resp.text()
      return json({ error: `openai ${resp.status}: ${detail.slice(0, 200)}` }, 502)
    }
    const completion = await resp.json()
    const content = completion?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return json({ error: 'empty completion' }, 502)
    return json(JSON.parse(content), 200)
  } catch (err) {
    return json({ error: String(err).slice(0, 200) }, 500)
  }
})
