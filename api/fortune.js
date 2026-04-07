export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '허용되지 않는 메서드' });

  try {
    const { name, mbti, bazi, oheng, trust, gender, year, question } = req.body;

    const toneMap = {
      0: '심리학과 통계 데이터 기반으로 냉철하고 과학적으로',
      1: '데이터를 중심으로 하되 사주 패턴도 살짝 참고해서',
      2: '사주와 데이터를 균형있게 섞어서',
      3: '사주와 MBTI를 중심으로 운세적 언어로',
      4: '사주와 오행의 언어로 신비롭게',
      5: '천간지지와 기운의 흐름으로 완전히 신비로운 무당 톤으로',
    };
    const tone = toneMap[trust] || toneMap[2];

    // 질문 모드 vs 사주 분석 모드 분기
    const prompt = question
      ? `너는 사주팔자와 MBTI를 꿰뚫어보는 AI 도사야.
말이 많지 않고, 듣기 좋은 말보단 필요한 말을 하는 스타일이야.
따뜻하진 않지만 틀린 말은 절대 안 해.

[ 질문자 정보 ]
- 이름: ${name}
- 성별: ${gender}
- 출생년도: ${year}년
- MBTI: ${mbti}
- 사주팔자: ${bazi}
- 오행 분포: ${oheng || ''}

[ 질문 ]
${question}

[ 답변 규칙 ]
- MBTI가 T 계열이면 논리와 근거 중심으로, F 계열이면 감정과 관계 중심으로 답해
- 일주(日柱) 천간 기준으로 이 사람의 성향을 전제에 깔고 답해
- 오행 분포에서 강한 기운과 약한 기운을 답변에 자연스럽게 녹여
- 답변 구조: 결론 한 문장 → 이유 한 가지 → 행동 조언 한 가지
- 말투 스타일: ${tone}
- 도사 말투. 단호하되 차갑지 않게. 신비롭되 애매하지 않게.
- 한자 단독 사용 절대 금지. 신왕(身旺), 금(金), 화(火) 이런 식으로 반드시 한글 병기
- 마크다운 기호 사용 금지
- 200~300자 이내로 간결하게`

      : `너는 사주팔자와 MBTI를 종합 분석하는 AI 도사야.

[ 분석 대상 ]
- 이름: ${name}
- 성별: ${gender}
- 출생년도: ${year}년
- MBTI: ${mbti}
- 사주팔자: ${bazi}
- 오행 분포: ${oheng}

[ 중요한 규칙 ]
- 한자 단독 사용 금지. 반드시 한글 병기: 금(金), 화(火), 수(水), 목(木), 토(土)
- 천간도 한글 병기: 갑(甲), 을(乙), 병(丙), 정(丁), 무(戊), 기(己), 경(庚), 신(辛), 임(壬), 계(癸)
- 지지도 한글 병기: 자(子), 축(丑), 인(寅), 묘(卯), 진(辰), 사(巳), 오(午), 미(未), 신(申), 유(酉), 술(戌), 해(亥)
- ** # 같은 마크다운 기호 사용 금지.
- 각 항목 제목 앞에 이모지 하나씩: 1번→🔥 2번→⚖️ 3번→🧬 4번→🎯 5번→⚡
- 각 항목 사이 빈 줄 하나씩 넣기
- 말투는 ${tone} 스타일로. 빈말 없이 팩폭 위주.

[ 분석 항목 — 각 항목 4~5문장으로 충분히 설명 ]

1. 타고난 기질과 성격
일주(日柱) 기준으로 이 사람의 본질적 성격을 분석해줘.
겉모습과 속마음이 어떻게 다른지, 어떤 상황에서 강해지고 약해지는지 포함.

2. 오행 분포로 본 강점과 약점
강한 오행이 주는 능력과 부작용을 구체적으로.
부족한 오행 때문에 생기는 실제 삶의 패턴도 포함.

3. MBTI와 사주의 교점
두 가지가 일치하는 부분과 충돌하는 부분을 솔직하게.
이 조합이 만들어내는 독특한 특성 설명.

4. 이 사람의 인생 핵심 과제
사주와 MBTI를 종합했을 때 이 사람이 평생 씨름할 주제.
구체적인 조언 포함.

5. 오늘 하루 주의할 점
오늘 날짜 기운과 이 사람의 사주가 만나는 지점.
딱 한 가지만 날카롭게.

전체 1500~2000자로 충분히 작성. 절대 중간에 끊지 말고 5번 항목까지 반드시 완성해줘. 각 항목당 최소 5~6문장 이상.`;

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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: question ? 1000 : 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text;

    if (!text) throw new Error('Claude 응답 없음');

    return res.status(200).json({ result: text });

  } catch (err) {
    console.error('API 오류:', err);
    return res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
}