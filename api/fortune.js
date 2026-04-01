export default async function handler(req, res) {
  // CORS 설정 — 우리 사이트에서만 호출 가능
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (브라우저 사전 요청)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드' });
  }

  try {
    // result.html에서 넘어온 사주 데이터 받기
    const { name, mbti, bazi, oheng, trust, gender, year } = req.body;

    // 신뢰도에 따라 프롬프트 톤 변경
    const toneMap = {
      0: '심리학과 통계 데이터 기반으로 냉철하고 과학적으로',
      1: '데이터를 중심으로 하되 사주 패턴도 살짝 참고해서',
      2: '사주와 데이터를 균형있게 섞어서',
      3: '사주와 MBTI를 중심으로 운세적 언어로',
      4: '사주와 오행의 언어로 신비롭게',
      5: '천간지지와 기운의 흐름으로 완전히 신비로운 무당 톤으로',
    };
    const tone = toneMap[trust] || toneMap[2];

    // Claude/Gemini에 보낼 프롬프트
    const prompt = `
너는 사주팔자와 MBTI를 종합 분석하는 AI 도사야.
아래 정보를 바탕으로 ${tone} 분석해줘.

[ 분석 대상 ]
- 이름: ${name}
- 성별: ${gender}
- 출생년도: ${year}년
- MBTI: ${mbti}
- 사주팔자: ${bazi}
- 오행 분포: ${oheng}

[ 분석 항목 — 각각 2~3문장으로 ]
1. 이 사람의 타고난 기질과 성격
2. 오행 분포로 본 강점과 약점
3. MBTI와 사주가 만나는 지점 (공통점 or 충돌점)
4. 오늘 하루 주의할 점 한마디

말투는 ${tone} 스타일로.
친근하고 직접적으로, 빈말 하지 말고 팩폭 위주로.
전체 300자 이내로 간결하게.
`;

    // Gemini API 호출
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const data = await response.json();

    // Gemini 응답에서 텍스트 추출
   console.log('Gemini 응답 전체:', JSON.stringify(data).slice(0, 500));

const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

if (!text) {
  console.log('응답 구조 문제. 전체 응답:', JSON.stringify(data));
  throw new Error('Gemini 응답 없음');
}

    return res.status(200).json({ result: text });

  } catch (err) {
    console.error('API 오류:', err);
    return res.status(500).json({ error: '분석 중 오류가 발생했습니다.' });
  }
}