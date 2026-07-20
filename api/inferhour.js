export const config = { maxDuration: 30 };

const 시진목록 = ['자시','축시','인시','묘시','진시','사시','오시','미시','신시','유시','술시','해시'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '허용되지 않는 메서드' });

  try {
    const { name, mbti, year, month, day, gender, answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: '답변 데이터 없음' });
    }

    const answersText = answers
      .map((a, i) => `${i + 1}. ${a.q}\n   답변: ${a.a}`)
      .join('\n');

    const prompt = `너는 사주명리학에 정통한 AI 도사야. 태어난 시(시주)를 모르는 사람이 몇 가지 질문에 답했어.
이 사람의 성향과 생활 패턴을 근거로, 사주명리학의 12시진(자시~해시) 중 가장 가능성 높은 시진 하나를 추론해줘.

[ 기본 정보 ]
- 이름: ${name}
- MBTI: ${mbti}
- 생년월일: ${year}년 ${month}월 ${day}일
- 성별: ${gender}

[ 질문과 답변 ]
${answersText}

[ 12시진 참고 (시간대 · 대표 기운) ]
자시(23~01시,밤·응축) 축시(01~03시,새벽·인내) 인시(03~05시,여명·시작) 묘시(05~07시,아침·성장)
진시(07~09시,오전·추진) 사시(09~11시,오전·지혜) 오시(11~13시,정오·활력) 미시(13~15시,오후·조화)
신시(15~17시,오후·결단) 유시(17~19시,저녁·수확) 술시(19~21시,밤·안정) 해시(21~23시,밤·포용)

[ 출력 규칙 ]
- 반드시 아래 JSON 형식으로만 답해. 다른 텍스트, 설명, 마크다운 코드블록 절대 넣지 마.
- hour 값은 반드시 "${시진목록.join('", "')}" 중 정확히 하나여야 해.
- reason은 도사 말투로 2~3문장, 왜 이 시진으로 추론했는지 답변 내용을 근거로 설명.
- 한자 표기 없이 한글로만.

{"hour": "시진이름", "reason": "추론 근거 설명"}`;

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    // content[0]이 항상 텍스트 블록이라는 보장이 없어 type이 'text'인 블록을 찾음
    const text = Array.isArray(data?.content) ? data.content.find(b => b?.type === 'text')?.text : undefined;

    if (!text) throw new Error('응답 없음');

    // 코드블록/잡텍스트가 섞여 와도 JSON 부분만 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.hour || !시진목록.includes(parsed.hour)) {
      throw new Error('유효하지 않은 시진 값: ' + parsed.hour);
    }

    return res.status(200).json({ hour: parsed.hour, reason: parsed.reason || '' });

  } catch (err) {
    console.error('시주 추론 API 오류:', err);
    return res.status(500).json({ error: '오류 발생' });
  }
}
