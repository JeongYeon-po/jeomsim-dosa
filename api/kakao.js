import admin from 'firebase-admin';

export const config = { maxDuration: 20 };

// Firestore 보안 규칙은 실제 Firebase 인증(request.auth)을 요구하는데,
// 카카오 로그인은 Firebase Auth를 거치지 않고 uid 문자열만 흉내내던 상태라
// Firestore 쓰기/읽기가 'Missing or insufficient permissions'로 막혔었음.
// Firebase Admin SDK로 커스텀 토큰을 발급해서 클라이언트가 진짜로 로그인하게 함.
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않음');
    const serviceAccount = JSON.parse(Buffer.from(key, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '허용되지 않는 메서드' });

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: '인가 코드 없음' });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
    const REDIRECT_URI = 'https://jeomsim-dosa.vercel.app/kakao-callback.html';

    // 1. 카카오에서 액세스 토큰 받기
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     KAKAO_REST_API_KEY,
        redirect_uri:  REDIRECT_URI,
        code:          code,
        client_secret: KAKAO_CLIENT_SECRET,
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

    // Firebase 커스텀 토큰 발급 (실패해도 카카오 로그인 자체는 막지 않고, 클라이언트가
    // 기존 방식(세션스토리지)으로 폴백하도록 customToken을 null로 반환)
    let customToken = null;
    try {
      const fbAdmin = getFirebaseAdmin();
      customToken = await fbAdmin.auth().createCustomToken(`kakao_${kakaoId}`, {
        provider: 'kakao',
        nickname,
      });
    } catch (adminErr) {
      console.error('Firebase 커스텀 토큰 발급 실패:', adminErr);
    }

    return res.status(200).json({
      kakaoId,
      nickname,
      accessToken: tokenData.access_token,
      customToken,
    });

  } catch (err) {
    console.error('카카오 API 오류:', err);
    return res.status(500).json({ error: '카카오 로그인 처리 중 오류' });
  }
}