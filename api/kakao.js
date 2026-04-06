export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '허용되지 않는 메서드' });

  
  try {
    console.log('키 확인:', process.env.KAKAO_REST_API_KEY?.slice(0, 6));
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: '인가 코드 없음' });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    const REDIRECT_URI = 'https://jeomsim-dosa.vercel.app/kakao-callback.html';

    // 1. 카카오에서 액세스 토큰 받기
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        client_id:    KAKAO_REST_API_KEY,
        redirect_uri: REDIRECT_URI,
        code:         code,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('카카오 토큰:', JSON.stringify(tokenData).slice(0, 200));

    if (!tokenData.access_token) {
      throw new Error('카카오 토큰 발급 실패');
    }

    // 2. 카카오 유저 정보 가져오기
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    const kakaoId  = userData.id;
    const nickname = userData.kakao_account?.profile?.nickname || '도사';

    console.log('카카오 유저:', kakaoId, nickname);

    // 3. Firebase Admin으로 커스텀 토큰 생성
    // (Firebase Admin SDK 설정 필요 — 다음 단계)
    return res.status(200).json({
      kakaoId,
      nickname,
      accessToken: tokenData.access_token,
    });

  } catch (err) {
    console.error('카카오 API 오류:', err);
    return res.status(500).json({ error: '카카오 로그인 처리 중 오류' });
  }
}