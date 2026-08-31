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
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

    const system = `你把一句关于饭局安排的自然语言（中文或英文）解析成结构化草稿。
今天是 ${refDate}。规则：
- 相对日期（今天/明天/后天/大后天/周X/下周X/tomorrow/next Tuesday 等）一律换算成具体 YYYY-MM-DD；「周X」指本周该天，若该天已过则指下周该天。
- 时段：提到中午/午饭/午餐/lunch/noon → lunch；提到晚上/晚饭/晚餐/dinner/tonight → dinner；未提及默认 dinner。
- person 填跟谁吃（多人原样保留，如「李姐、王强」）；place 填地点；其余细节放 note；没有就用 null。
- 一句话可能包含多个安排，逐条输出；与吃饭安排无关的输入输出空数组。`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
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
