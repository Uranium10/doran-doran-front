import { supabase } from '@/lib/supabaseClient'; // 아까 만든 슈파베이스 클라이언트 경로

// 기본 fetch를 감싸서 업그레이드한 우리만의 커스텀 fetch
export async function apiFetch(endpoint, options = {}) {
  // 1. 현재 로그인된 유저의 세션(토큰)을 가져옵니다.
  const { data: { session } } = await supabase.auth.getSession();

  // 2. 기본 헤더 세팅
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 3. 세션 토큰이 존재하면 Authorization 헤더에 쏙 추가!
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // 4. 진짜 백엔드 서버(FastAPI) 주소로 요청을 날립니다.
  const baseUrl = 'http://localhost:8000'; // FastAPI 서버 주소
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  return response.json();
}