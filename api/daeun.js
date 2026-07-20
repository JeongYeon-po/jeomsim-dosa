// Sonnet으로 긴 분량을 생성하면 기본 서버리스 함수 실행시간 제한을 넘길 수 있어 여유 있게 늘려둠
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '허용되지 않는 메서드' });

  try {
    const { name, mbti, bazi, oheng, trust, gender, year, ganZhi, periodLabel, forward } = req.body;

    if (!ganZhi || !periodLabel) {
      return res.status(400).json({ error: '대운 데이터 없음' });
    }

    const toneMap = {
      0: '심리학과 통계 데이터 기반으로 냉철하고 과학적으로',
      1: '데이터를 중심으로 하되 사주 패턴도 살짝 참고해서',
      2: '사주와 데이터를 균형있게 섞어서',
      3: '사주와 MBTI를 중심으로 운세적 언어로',
      4: '사주와 오행의 언어로 신비롭게',
      5: '천간지지와 기운의 흐름으로 완전히 신비로운 무당 톤으로',
    };
    const tone = toneMap[trust] || toneMap[2];

    const prompt = `너는 사주명리학에 정통한 AI 도사야. 이 사람의 현재 대운(10년 단위 인생 큰 흐름)을 풀이해줘.

[ 기본 정보 ]
- 이름: ${name}
- 성별: ${gender}
- 출생년도: ${year}년
- MBTI: ${mbti}
- 사주팔자: ${bazi}
- 오행 분포: ${oheng || ''}

[ 현재 대운 ]
- 대운 간지: ${ganZhi}
- 해당 기간: ${periodLabel}
- 대운 방향: ${forward ? '순행' : '역행'}

[ 중요한 규칙 ]
- 한자 단독 사용 금지. 반드시 한글 병기: 금(金), 화(火), 수(水), 목(木), 토(土)
- 천간·지지도 한글 병기
- 마크다운 기호(** # 등) 사용 금지
- 말투는 ${tone} 스타일로
- 불안이나 막막함보다 이 시기를 어떻게 살아야 할지 방향과 희망을 주는 톤으로. 다만 근거 없는 빈말은 하지 마.

[ 분석 항목 — 각 항목 3~4문장 ]

1. 이 대운의 전체 기운
대운 간지가 원국(사주팔자)과 어떻게 만나는지, 이 10년의 전체적인 색깔.

2. 이 시기에 열리는 기회
어떤 영역(일·재물·관계·건강 등)에서 특히 잘 풀릴 가능성이 높은지, 구체적으로.

3. 이 시기에 조심할 점
방심하면 놓치기 쉬운 부분, 미리 대비하면 좋은 것.

4. 지금 이 순간 해야 할 선택
이 대운을 잘 활용하기 위해 지금 당장 할 수 있는 구체적인 행동 하나.

전체 800~1100자로 작성. 4번 항목까지 반드시 완성해줘.`;

    const apiKey = process.env.JSDS_CLAUDE;
    if (!apiKey) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok || data?.type === 'error') {
      console.error('Claude API 에러 응답:', response.status, JSON.stringify(data));
      return res.status(502).json({ error: '도사가 응답하지 못했습니다. 잠시 후 다시 시도해주세요.' });
    }

    // claude-sonnet-5는 답변 앞에 빈 thinking(추론) 블록을 먼저 보낼 때가 있어
    // content[0]이 아니라 type이 'text'인 블록을 찾아서 사용해야 함
    const textBlock = Array.isArray(data?.content) ? data.content.find(b => b?.type === 'text') : null;
    const text = textBlock?.text;

    if (!text) {
      console.error('Claude 응답에 text 블록 없음:', JSON.stringify(data));
      throw new Error('Claude 응답 없음');
    }

    return res.status(200).json({ result: text });

  } catch (err) {
    console.error('대운 API 오류:', err);
    return res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
}
