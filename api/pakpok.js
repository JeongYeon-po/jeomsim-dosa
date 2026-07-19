export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '허용되지 않는 메서드' });

  try {
    const { name, mbti, bazi, oheng, trust, gua, tarot } = req.body;

    const toneMap = {
      0: '냉철한 데이터 분석가 톤으로. 감정 없이 팩트만.',
      1: '논리적이지만 살짝 인간적인 톤으로.',
      2: '균형잡힌 톤으로. 데이터와 운세 반반.',
      3: '운세사 톤으로. 사주와 점괘 언어 사용.',
      4: '신비로운 도사 톤으로.',
      5: '완전 무당 톤으로. 천기와 기운의 언어로.',
    };

    const prompt = `너는 사주팔자, MBTI, 주역 점괘, 타로를 종합하는 AI 도사야.
아래 데이터를 보고 오늘 이 사람에게 꼭 필요한 핵심 한마디를 해줘.

[ 데이터 ]
- 이름: ${name}
- MBTI: ${mbti}
- 사주: ${bazi}
- 오행: ${oheng}
- 오늘 점괘: ${gua}
- 오늘 타로: ${tarot}

[ 규칙 ]
- 딱 2~3문장. 절대 그 이상 쓰지 마.
- 한자는 반드시 한글 병기: 금(金), 화(火) 등
- 마크다운 기호 사용 금지
- ${toneMap[trust] || toneMap[2]}
- 빈말 없이 오늘 이 사람에게 꼭 필요한 말만.
- 날카롭고 기억에 남는 한마디로.`;

    const apiKey = process.env.JSDS_CLAUDE;

    if (!apiKey) {
      return res.status(500).json({ error: 'API 키 없음' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text;

    if (!text) throw new Error('응답 없음');

    return res.status(200).json({ result: text });

  } catch (err) {
    console.error('팩폭 API 오류:', err);
    return res.status(500).json({ error: '오류 발생' });
  }
}