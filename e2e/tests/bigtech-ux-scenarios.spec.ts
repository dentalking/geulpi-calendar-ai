import { test, expect } from '@playwright/test';
import { loginWithGoogle } from '../helpers/auth-helper';
import { generateTestImage, downloadSampleSchedule } from '../helpers/multimodal-helper';
import { trackAPIUsage } from '../helpers/api-usage-tracker';

/**
 * 🚀 Geulpi 빅테크급 UX E2E 테스트 시나리오
 * 
 * 이 테스트들이 통과하면 자동으로 빅테크급 UX가 구현됩니다!
 * Google Calendar + Notion AI + ChatGPT를 능가하는 차세대 캘린더
 */

test.describe('🎯 빅테크급 AI 캘린더 UX', () => {
  test.beforeEach(async ({ page }) => {
    await trackAPIUsage.startSession();
    await loginWithGoogle(page);
  });

  test.afterEach(async () => {
    const usage = await trackAPIUsage.endSession();
    expect(usage.totalCost).toBeLessThan(1000); // 일일 1000원 제한
  });

  test('1️⃣ 자연어 일정 생성 - 구글 어시스턴트 수준', async ({ page }) => {
    await page.goto('/calendar');
    
    // AI 채팅 인터페이스 활성화
    await page.click('[data-testid="ai-chat-button"]');
    
    // 복잡한 자연어 입력
    await page.fill('[data-testid="chat-input"]', 
      '내일 오후 2시에 강남역에서 팀 미팅 있어. 1시간 30분 정도 걸릴 것 같고, ' +
      '미팅 전에 30분 정도 준비 시간 필요해. 그리고 미팅 후에는 회의록 정리 시간도 30분 잡아줘.'
    );
    await page.keyboard.press('Enter');
    
    // AI 응답 대기 (스트리밍)
    await expect(page.locator('[data-testid="ai-typing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('일정을 생성했습니다');
    
    // 생성된 일정 확인 (3개 일정이 자동 생성되어야 함)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await expect(page.locator('[data-testid="event-prep-time"]')).toContainText('미팅 준비');
    await expect(page.locator('[data-testid="event-main"]')).toContainText('팀 미팅 @강남역');
    await expect(page.locator('[data-testid="event-followup"]')).toContainText('회의록 정리');
    
    // 시간 자동 계산 검증
    await expect(page.locator('[data-testid="event-prep-time"]')).toContainText('13:30 - 14:00');
    await expect(page.locator('[data-testid="event-main"]')).toContainText('14:00 - 15:30');
    await expect(page.locator('[data-testid="event-followup"]')).toContainText('15:30 - 16:00');
  });

  test('2️⃣ 이미지 기반 일정 생성 - iOS 수준 OCR', async ({ page }) => {
    await page.goto('/calendar');
    
    // 테스트용 일정 이미지 생성 (회의 초대장, 행사 포스터 등)
    const scheduleImage = await generateTestImage({
      type: 'conference-invitation',
      text: 'AI Conference 2024\nDate: Dec 15, 2024\nTime: 9:00 AM - 6:00 PM\nVenue: COEX, Seoul'
    });
    
    // 드래그 앤 드롭 또는 업로드
    await page.click('[data-testid="ai-chat-button"]');
    await page.setInputFiles('[data-testid="image-upload"]', scheduleImage);
    
    // OCR 처리 대기
    await expect(page.locator('[data-testid="ocr-processing"]')).toBeVisible();
    await expect(page.locator('[data-testid="ocr-result"]')).toContainText('일정을 인식했습니다');
    
    // 자동 생성된 일정 확인
    await expect(page.locator('[data-testid="event-ai-conference"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-ai-conference"]')).toContainText('AI Conference 2024');
    await expect(page.locator('[data-testid="event-location"]')).toContainText('COEX, Seoul');
  });

  test('3️⃣ 스마트 일정 추천 - Notion AI 수준', async ({ page }) => {
    await page.goto('/calendar');
    
    // 컨텍스트 기반 추천
    await page.click('[data-testid="ai-suggestions-button"]');
    
    // 사용자의 캘린더 패턴 분석 후 추천
    await expect(page.locator('[data-testid="suggestion-workout"]'))
      .toContainText('운동 시간을 추가하시겠어요? 최근 2주간 운동을 못하셨네요.');
    
    await expect(page.locator('[data-testid="suggestion-lunch"]'))
      .toContainText('점심 시간이 비어있어요. 12시에 1시간 식사 시간을 추가할까요?');
    
    await expect(page.locator('[data-testid="suggestion-focus"]'))
      .toContainText('오전 9-11시가 가장 생산적인 시간대예요. 중요한 작업을 배치해보세요.');
    
    // 원클릭 수락
    await page.click('[data-testid="accept-all-suggestions"]');
    await expect(page.locator('[data-testid="calendar-updated"]')).toBeVisible();
  });

  test('4️⃣ 실시간 협업 - Google Calendar 수준', async ({ page, context }) => {
    await page.goto('/calendar');
    
    // 두 번째 브라우저 컨텍스트 (다른 사용자)
    const page2 = await context.newPage();
    await loginWithGoogle(page2, 'user2@example.com');
    await page2.goto('/calendar');
    
    // 사용자1이 일정 생성
    await page.fill('[data-testid="quick-add"]', '팀 스탠드업 매일 오전 10시');
    await page.keyboard.press('Enter');
    
    // 사용자2에게 실시간 반영 (1초 이내)
    await expect(page2.locator('[data-testid="event-standup"]')).toBeVisible({ timeout: 1000 });
    
    // 충돌 감지 및 자동 해결
    await page2.fill('[data-testid="quick-add"]', '일일 회의 오전 10시');
    await page2.keyboard.press('Enter');
    
    await expect(page2.locator('[data-testid="conflict-detected"]'))
      .toContainText('시간이 겹칩니다. 10:30으로 조정할까요?');
  });

  test('5️⃣ AI 인사이트 대시보드 - 애플 스크린타임 수준', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 시간 분석 차트
    await expect(page.locator('[data-testid="time-balance-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-life-score"]')).toContainText(/\d+%/);
    
    // AI 인사이트
    await expect(page.locator('[data-testid="ai-insight-1"]'))
      .toContainText('회의가 전체 시간의 40%를 차지해요. 줄여보는 건 어떨까요?');
    
    await expect(page.locator('[data-testid="ai-insight-2"]'))
      .toContainText('목요일 오후가 가장 바쁜 시간대예요. 분산을 고려해보세요.');
    
    // 주간 리포트
    await page.click('[data-testid="generate-weekly-report"]');
    await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
  });

  test('6️⃣ 음성 인터페이스 - Siri 수준', async ({ page }) => {
    await page.goto('/calendar');
    
    // 음성 입력 권한 요청
    await page.click('[data-testid="voice-input-button"]');
    await page.click('[data-testid="allow-microphone"]');
    
    // 음성 명령 시뮬레이션
    await page.evaluate(() => {
      window.simulateVoiceInput('내일 오후 3시에 치과 예약 추가해줘');
    });
    
    // 음성 인식 결과
    await expect(page.locator('[data-testid="voice-transcript"]'))
      .toContainText('내일 오후 3시에 치과 예약');
    
    // 확인 요청
    await expect(page.locator('[data-testid="voice-confirmation"]'))
      .toContainText('치과 예약을 내일 15:00에 추가할까요?');
    
    // 음성으로 확인
    await page.evaluate(() => {
      window.simulateVoiceInput('응, 맞아');
    });
    
    await expect(page.locator('[data-testid="event-dentist"]')).toBeVisible();
  });

  test('7️⃣ 스마트 알림 - iOS Focus 모드 수준', async ({ page }) => {
    await page.goto('/settings/notifications');
    
    // AI 기반 알림 최적화
    await page.click('[data-testid="smart-notifications-toggle"]');
    
    // 컨텍스트 인식 알림
    await expect(page.locator('[data-testid="notification-rule-1"]'))
      .toContainText('중요 회의는 15분 전 알림');
    
    await expect(page.locator('[data-testid="notification-rule-2"]'))
      .toContainText('운동 시간은 1시간 전 알림 (준비 시간 고려)');
    
    await expect(page.locator('[data-testid="notification-rule-3"]'))
      .toContainText('저녁 시간대에는 업무 알림 음소거');
    
    // 방해금지 모드 자동 설정
    await expect(page.locator('[data-testid="auto-focus-mode"]'))
      .toContainText('회의 중 자동으로 방해금지 모드 활성화');
  });

  test('8️⃣ 멀티모달 채팅 - ChatGPT Plus 수준', async ({ page }) => {
    await page.goto('/calendar');
    await page.click('[data-testid="ai-chat-button"]');
    
    // 이미지 + 텍스트 복합 입력
    const meetingPhoto = await downloadSampleSchedule('whiteboard-meeting-notes.jpg');
    await page.setInputFiles('[data-testid="chat-file-input"]', meetingPhoto);
    await page.fill('[data-testid="chat-input"]', 
      '이 화이트보드 사진에서 액션 아이템들을 추출해서 일정으로 만들어줘'
    );
    await page.keyboard.press('Enter');
    
    // AI 분석 및 일정 생성
    await expect(page.locator('[data-testid="ai-analyzing-image"]')).toBeVisible();
    await expect(page.locator('[data-testid="extracted-tasks"]')).toContainText('3개의 작업을 찾았습니다');
    
    // 자동 생성된 일정들
    await expect(page.locator('[data-testid="task-1"]')).toContainText('프로토타입 검토');
    await expect(page.locator('[data-testid="task-2"]')).toContainText('사용자 피드백 수집');
    await expect(page.locator('[data-testid="task-3"]')).toContainText('다음 스프린트 계획');
  });

  test('9️⃣ 일정 자동 정리 - Superhuman 수준', async ({ page }) => {
    await page.goto('/calendar');
    
    // 지능형 일정 정리
    await page.click('[data-testid="smart-organize-button"]');
    
    // 중복 일정 감지
    await expect(page.locator('[data-testid="duplicate-found"]'))
      .toContainText('2개의 중복된 일정을 발견했습니다');
    
    // 비효율적 일정 패턴 감지
    await expect(page.locator('[data-testid="inefficient-pattern"]'))
      .toContainText('연속된 회의 사이에 이동 시간이 없습니다');
    
    // 자동 최적화 제안
    await page.click('[data-testid="auto-optimize"]');
    await expect(page.locator('[data-testid="optimization-preview"]')).toBeVisible();
    
    // 원클릭 적용
    await page.click('[data-testid="apply-optimization"]');
    await expect(page.locator('[data-testid="calendar-optimized"]'))
      .toContainText('캘린더가 최적화되었습니다. 주당 2시간을 절약했어요!');
  });

  test('🔟 오프라인 동기화 - 노션 수준', async ({ page, context }) => {
    await page.goto('/calendar');
    
    // 오프라인 모드 시뮬레이션
    await context.setOffline(true);
    
    // 오프라인에서도 일정 생성 가능
    await page.fill('[data-testid="quick-add"]', '오프라인 테스트 일정');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-offline-test"]')).toBeVisible();
    
    // 온라인 복귀
    await context.setOffline(false);
    
    // 자동 동기화
    await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-complete"]'))
      .toBeVisible({ timeout: 3000 });
    
    // 충돌 해결
    await expect(page.locator('[data-testid="conflict-resolution"]'))
      .not.toBeVisible(); // 자동으로 해결되어야 함
  });
});

test.describe('🎨 빅테크급 UI/UX 디테일', () => {
  test('마이크로 인터랙션 - 애플 수준', async ({ page }) => {
    await page.goto('/calendar');
    
    // 햅틱 피드백 시뮬레이션
    await page.hover('[data-testid="event-card"]');
    await expect(page.locator('[data-testid="hover-preview"]')).toBeVisible();
    
    // 스와이프 제스처
    await page.locator('[data-testid="event-card"]').swipe({ direction: 'left' });
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    
    // 실행 취소 스낵바
    await page.click('[data-testid="delete-event"]');
    await expect(page.locator('[data-testid="undo-snackbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="undo-snackbar"]')).toContainText('실행 취소');
  });

  test('다크모드 - 시스템 연동', async ({ page }) => {
    // 시스템 다크모드 감지
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/calendar');
    
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    await expect(page.locator('[data-testid="theme-indicator"]')).toContainText('다크 모드');
  });

  test('반응형 디자인 - 모든 디바이스', async ({ page }) => {
    // 데스크톱
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/calendar');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // 태블릿
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="sidebar"]')).toBeHidden();
    await expect(page.locator('[data-testid="hamburger-menu"]')).toBeVisible();
    
    // 모바일
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible();
  });
});

test.describe('💰 API 사용량 모니터링', () => {
  test('일일 한도 관리', async ({ page }) => {
    await page.goto('/settings/api-usage');
    
    // 실시간 사용량 대시보드
    await expect(page.locator('[data-testid="daily-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
    
    // 비용 분석
    await expect(page.locator('[data-testid="openai-cost"]')).toContainText(/₩\d+/);
    await expect(page.locator('[data-testid="google-cost"]')).toContainText(/₩\d+/);
    await expect(page.locator('[data-testid="total-cost"]')).toContainText(/₩\d+/);
    
    // 한도 경고
    const totalCost = await page.locator('[data-testid="total-cost"]').textContent();
    const cost = parseInt(totalCost?.replace(/[^0-9]/g, '') || '0');
    expect(cost).toBeLessThan(1000);
    
    if (cost > 800) {
      await expect(page.locator('[data-testid="usage-warning"]'))
        .toContainText('일일 한도의 80%를 사용했습니다');
    }
  });
});