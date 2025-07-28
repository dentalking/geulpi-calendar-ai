import { Page } from '@playwright/test';

/**
 * 🔐 인증 헬퍼
 * Google OAuth 및 기타 인증 플로우 처리
 */

export async function loginWithGoogle(page: Page, email: string = 'test@example.com'): Promise<void> {
  // 개발 환경에서는 모의 로그인 사용
  if (process.env.NODE_ENV === 'test' || process.env.E2E_MOCK_AUTH === 'true') {
    await mockGoogleLogin(page, email);
    return;
  }
  
  // 실제 Google OAuth 플로우
  await page.goto('/auth/login');
  await page.click('[data-testid="google-login-button"]');
  
  // Google 로그인 페이지로 리다이렉트
  await page.waitForURL(/accounts\.google\.com/);
  
  // 이메일 입력
  await page.fill('input[type="email"]', email);
  await page.click('#identifierNext');
  
  // 패스워드 입력 (테스트 계정)
  await page.fill('input[type="password"]', process.env.TEST_GOOGLE_PASSWORD || 'test-password');
  await page.click('#passwordNext');
  
  // 권한 승인
  await page.waitForURL(/consent/);
  await page.click('button[type="submit"]');
  
  // 앱으로 리다이렉트
  await page.waitForURL(/\/calendar/);
}

/**
 * 개발/테스트용 모의 Google 로그인
 */
async function mockGoogleLogin(page: Page, email: string): Promise<void> {
  // 로컬 스토리지에 모의 토큰 설정
  await page.goto('/');
  
  await page.evaluate((mockEmail) => {
    // 모의 사용자 정보
    const mockUser = {
      id: 'test-user-123',
      email: mockEmail,
      name: mockEmail.split('@')[0],
      picture: `https://ui-avatars.com/api/?name=${mockEmail}`,
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresAt: Date.now() + 3600 * 1000 // 1시간 후 만료
    };
    
    // 세션 스토리지에 저장
    localStorage.setItem('auth-token', mockUser.accessToken);
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    // 쿠키 설정
    document.cookie = `auth-token=${mockUser.accessToken}; path=/; max-age=3600`;
  }, email);
  
  // 캘린더 페이지로 이동
  await page.goto('/calendar');
  await page.waitForSelector('[data-testid="user-avatar"]');
}

/**
 * 로그아웃
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/auth/login');
}

/**
 * 현재 로그인 상태 확인
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('auth-token'));
  return !!token;
}

/**
 * 권한 확인
 */
export async function hasPermission(page: Page, permission: string): Promise<boolean> {
  return await page.evaluate((perm) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.permissions?.includes(perm) || false;
  }, permission);
}

/**
 * 다중 사용자 시뮬레이션
 */
export async function setupMultipleUsers(page: Page, count: number = 3): Promise<{
  email: string;
  token: string;
}[]> {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const email = `user${i + 1}@example.com`;
    const token = `mock-token-user-${i + 1}`;
    
    users.push({ email, token });
  }
  
  // 첫 번째 사용자로 로그인
  await loginWithGoogle(page, users[0].email);
  
  return users;
}

/**
 * API 토큰 설정 (백엔드 직접 호출용)
 */
export async function setupAPIToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    return localStorage.getItem('auth-token') || '';
  });
  
  // 모든 API 요청에 토큰 자동 첨부
  await page.setExtraHTTPHeaders({
    'Authorization': `Bearer ${token}`
  });
  
  return token;
}

/**
 * 온보딩 상태 설정
 */
export async function setOnboardingComplete(page: Page, complete: boolean = true): Promise<void> {
  await page.evaluate((isComplete) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.onboardingComplete = isComplete;
    localStorage.setItem('user', JSON.stringify(user));
  }, complete);
}

/**
 * 테스트용 라이프 영역 설정
 */
export async function setupLifeAreas(page: Page): Promise<void> {
  await page.evaluate(() => {
    const lifeAreas = [
      { id: 'work', name: '일', color: '#4285f4', targetHours: 40 },
      { id: 'personal', name: '개인', color: '#34a853', targetHours: 30 },
      { id: 'health', name: '건강', color: '#fbbc04', targetHours: 10 },
      { id: 'relationships', name: '관계', color: '#ea4335', targetHours: 15 },
      { id: 'growth', name: '성장', color: '#673ab7', targetHours: 5 }
    ];
    
    localStorage.setItem('life-areas', JSON.stringify(lifeAreas));
    
    // 사용자 설정 업데이트
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.settings = {
      ...user.settings,
      lifeAreas,
      workLifeBalance: true,
      smartNotifications: true
    };
    localStorage.setItem('user', JSON.stringify(user));
  });
}