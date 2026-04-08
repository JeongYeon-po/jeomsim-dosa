
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '허용되지 않는 메서드' });

  try {
    const { name, mbti, oheng, gender, year } = req.body;

    const today = new Date().toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'long'
    });

    const prompt = `너는 사주 오행과 MBTI를 기반으로 오늘 점심 메뉴를 추천하는 AI 도사야.

[ 추천 대상 ]
- 이름: ${name}
- 성별: ${gender}
- 출생년도: ${year}년
- MBTI: ${mbti}
- 오행 분포: ${oheng}
- 오늘 날짜: ${today}

[ 추천 규칙 ]
- 부족한 오행을 보충하는 음식 위주로 추천
- MBTI 성향도 반영 (E는 분위기 좋은 곳, I는 혼밥 가능한 곳 등)
- 오늘 날짜와 요일 분위기도 살짝 반영
- 한국 음식 위주, 가끔 이색 메뉴도 OK
- 마크다운 기호 사용 금지
- 반드시 아래 JSON 형식으로만 응답. 다른 말 일절 금지.

{
  "menus": [
    { "name": "메뉴명", "reason": "추천 이유 한 문장" },
    { "name": "메뉴명", "reason": "추천 이유 한 문장" },
    { "name": "메뉴명", "reason": "추천 이유 한 문장" }
  ]
}`;

    const apiKey = process.env.JSDS_CLAUDE;
    if (!apiKey) return res.status(500).json({ error: 'API 키 없음' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (!text) throw new Error('응답 없음');

    // JSON 파싱
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('메뉴 API 오류:', err);
    return res.status(500).json({ error: '메뉴 추천 중 오류 발생' });
  }
}
