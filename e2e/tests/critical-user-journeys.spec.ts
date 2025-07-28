import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';

/**
 * Critical User Journeys - P0 Priority
 * 빅테크급 UX 시나리오 기반 핵심 사용자 여정 테스트
 */

test.describe('🔥 Critical User Journeys (P0)', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('👤 신규 사용자 온보딩 플로우', () => {
    test('신규 사용자가 온보딩을 완료하고 첫 일정을 추가할 수 있어야 함', async ({ page }) => {
      // Given: 신규 사용자가 서비스에 처음 접근
      await page.goto('/');
      
      // When: Google OAuth 로그인 진행
      await test.step('Google OAuth 로그인', async () => {
        await page.click('[data-testid="google-login-button"]');
        
        // Google OAuth 플로우 시뮬레이션
        await page.waitForURL('/auth/callback*');
        await expect(page.locator('[data-testid="login-success"]')).toBeVisible();
      });

      // Then: 온보딩 페이지로 리다이렉트
      await test.step('온보딩 시작', async () => {
        await page.waitForURL('/onboarding');
        await expect(page.locator('h1')).toContainText('개인화 설정');
      });

      // When: 라이프 철학 설정
      await test.step('라이프 철학 정의', async () => {
        // 업무:가족:성장:여가 = 60:25:10:5 비율 설정
        await page.fill('[data-testid="work-percentage"]', '60');
        await page.fill('[data-testid="family-percentage"]', '25');
        await page.fill('[data-testid="growth-percentage"]', '10');
        await page.fill('[data-testid="leisure-percentage"]', '5');
        
        await page.click('[data-testid="next-step"]');
      });

      // When: 업무 시간 설정
      await test.step('업무 시간 설정', async () => {
        await page.selectOption('[data-testid="work-start-time"]', '09:00');
        await page.selectOption('[data-testid="work-end-time"]', '18:00');
        await page.check('[data-testid="work-day-monday"]');
        await page.check('[data-testid="work-day-friday"]');
        
        await page.click('[data-testid="next-step"]');
      });

      // When: AI 개입 수준 선택
      await test.step('AI 설정', async () => {
        await page.click('[data-testid="ai-level-balanced"]');
        await page.check('[data-testid="auto-scheduling"]');
        
        await page.click('[data-testid="complete-onboarding"]');
      });

      // Then: 대시보드로 이동하고 Quick Win 제공
      await test.step('첫 번째 성공 경험', async () => {
        await page.waitForURL('/dashboard');
        
        // Google Calendar 동기화 성공 메시지
        await expect(page.locator('[data-testid="sync-success-message"]')).toBeVisible();
        
        // 오늘의 밸런스 점수 표시
        await expect(page.locator('[data-testid="balance-score"]')).toBeVisible();
        
        // AI 추천사항 표시
        await expect(page.locator('[data-testid="ai-recommendations"]')).toBeVisible();
      });

      // When: 첫 번째 일정 추가
      await test.step('첫 일정 추가', async () => {
        await page.click('[data-testid="add-event-button"]');
        
        await page.fill('[data-testid="event-title"]', '팀 스탠드업 미팅');
        await page.fill('[data-testid="event-start-time"]', '2024-12-01T09:00');
        await page.fill('[data-testid="event-end-time"]', '2024-12-01T09:30');
        await page.selectOption('[data-testid="event-area"]', 'work');
        
        await page.click('[data-testid="save-event"]');
      });

      // Then: 일정이 캘린더에 표시되고 AI 분석 시작
      await test.step('일정 저장 및 AI 분석', async () => {
        await expect(page.locator('[data-testid="calendar-event"]')).toContainText('팀 스탠드업 미팅');
        
        // AI가 일정을 분석하고 인사이트 제공
        await expect(page.locator('[data-testid="ai-insight"]')).toContainText('업무 시간 비율');
      });
    });

    test('온보딩 중 중단해도 이어서 진행할 수 있어야 함', async ({ page }) => {
      // Given: 온보딩 도중 브라우저 종료
      await page.goto('/onboarding');
      await page.fill('[data-testid="work-percentage"]', '60');
      
      // When: 새로고침 또는 재접속
      await page.reload();
      
      // Then: 진행 상황이 보존되어야 함
      await expect(page.locator('[data-testid="work-percentage"]')).toHaveValue('60');
      await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('1/3');
    });
  });

  test.describe('📅 일상 사용 플로우', () => {
    test.beforeEach(async ({ page }) => {
      // 온보딩이 완료된 사용자로 로그인
      await authHelper.loginAsExistingUser();
      await page.goto('/dashboard');
    });

    test('사용자가 아침 루틴을 통해 하루를 시작할 수 있어야 함', async ({ page }) => {
      // Given: 아침 시간대(7-9시) 접속 시뮬레이션
      await test.step('아침 대시보드 확인', async () => {
        // 오늘의 스케줄 한눈에 표시
        await expect(page.locator('[data-testid="today-schedule"]')).toBeVisible();
        await expect(page.locator('[data-testid="schedule-item"]')).toHaveCount(3); // 예시: 3개 일정
        
        // 하루 목표 설정 위젯
        await expect(page.locator('[data-testid="daily-goal"]')).toBeVisible();
      });

      // When: AI 최적화 제안 검토
      await test.step('AI 최적화 제안 확인', async () => {
        const optimizationCard = page.locator('[data-testid="optimization-suggestion"]');
        await expect(optimizationCard).toBeVisible();
        
        // 제안 내용: "오후 미팅 2개를 블록화하면 집중 시간 1시간 확보 가능"
        await expect(optimizationCard).toContainText('집중 시간');
        await expect(optimizationCard).toContainText('1시간 확보');
      });

      // When: 긴급 일정 변경 대응
      await test.step('긴급 일정 추가', async () => {
        // 갑작스러운 CEO 미팅 요청 시뮬레이션
        await page.click('[data-testid="add-urgent-event"]');
        
        await page.fill('[data-testid="event-title"]', 'CEO 긴급 미팅');
        await page.fill('[data-testid="event-start-time"]', '오늘 15:00');
        await page.selectOption('[data-testid="event-priority"]', 'critical');
        
        await page.click('[data-testid="save-urgent-event"]');
      });

      // Then: AI가 자동으로 스케줄 조정 제안
      await test.step('자동 스케줄 조정', async () => {
        const conflictModal = page.locator('[data-testid="schedule-conflict-modal"]');
        await expect(conflictModal).toBeVisible();
        
        // "오후 3시 개발 시간과 충돌합니다. 6-8시로 이동하시겠어요?"
        await expect(conflictModal).toContainText('개발 시간과 충돌');
        await expect(conflictModal).toContainText('6-8시로 이동');
        
        await page.click('[data-testid="accept-schedule-change"]');
        
        // 스케줄 자동 업데이트 확인
        await expect(page.locator('[data-testid="schedule-updated-toast"]')).toBeVisible();
      });
    });

    test('업무 중 실시간 상호작용이 원활해야 함', async ({ page }) => {
      // Given: 업무 시간대(9-18시) 활동 시뮬레이션
      
      // When: 빠른 일정 추가 (다양한 입력 방식)
      await test.step('다양한 입력 방식 테스트', async () => {
        // 1. 텍스트 입력
        await page.click('[data-testid="quick-add-button"]');
        await page.fill('[data-testid="quick-add-input"]', '점심 미팅 12:00-13:00');
        await page.press('[data-testid="quick-add-input"]', 'Enter');
        
        // AI 파싱 결과 확인
        await expect(page.locator('[data-testid="parsed-event"]')).toContainText('점심 미팅');
        await expect(page.locator('[data-testid="parsed-time"]')).toContainText('12:00-13:00');
      });

      // When: 집중 시간 보호 기능
      await test.step('집중 시간 보호', async () => {
        // 집중 시간 블록 중 새 일정 추가 시도
        await page.click('[data-testid="add-event-in-focus-time"]');
        
        // 보호 알림 표시
        const protectionAlert = page.locator('[data-testid="focus-time-protection"]');
        await expect(protectionAlert).toBeVisible();
        await expect(protectionAlert).toContainText('집중 시간입니다');
        
        // 대안 시간 제안
        await expect(page.locator('[data-testid="alternative-times"]')).toBeVisible();
      });
    });

    test('저녁 루틴으로 하루를 마무리할 수 있어야 함', async ({ page }) => {
      // Given: 저녁 시간대(18-22시) 접속 시뮬레이션
      
      // When: 하루 밸런스 리뷰
      await test.step('일일 밸런스 리뷰', async () => {
        await page.click('[data-testid="daily-review-tab"]');
        
        // 오늘의 밸런스 점수 표시
        await expect(page.locator('[data-testid="daily-balance-score"]')).toBeVisible();
        
        // 각 영역별 시간 분석
        const balanceChart = page.locator('[data-testid="balance-chart"]');
        await expect(balanceChart).toBeVisible();
        
        // 목표 대비 실제 달성률
        await expect(page.locator('[data-testid="achievement-rate"]')).toContainText('%');
      });

      // When: 내일 추천 스케줄 확인
      await test.step('내일 스케줄 미리보기', async () => {
        await page.click('[data-testid="tomorrow-preview"]');
        
        // AI가 추천하는 내일 스케줄
        const tomorrowSchedule = page.locator('[data-testid="tomorrow-schedule"]');
        await expect(tomorrowSchedule).toBeVisible();
        
        // 최적화 제안
        const optimization = page.locator('[data-testid="tomorrow-optimization"]');
        await expect(optimization).toContainText('추천');
      });

      // When: 주간/월간 인사이트 확인
      await test.step('장기 인사이트 확인', async () => {
        await page.click('[data-testid="insights-tab"]');
        
        // 주간 트렌드
        await expect(page.locator('[data-testid="weekly-trend"]')).toBeVisible();
        
        // 개선사항 제안
        const improvements = page.locator('[data-testid="improvement-suggestions"]');
        await expect(improvements).toBeVisible();
        await expect(improvements.locator('.suggestion-item')).toHaveCount(3); // 3개 제안
      });
    });
  });

  test.describe('🎤 음성 일정 추가 플로우', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsExistingUser();
      await page.goto('/dashboard');
      
      // 마이크 권한 모킹
      await page.context().grantPermissions(['microphone']);
    });

    test('음성으로 복잡한 일정을 추가할 수 있어야 함', async ({ page }) => {
      // Given: 마이크 권한이 허용된 상태
      
      // When: 음성 입력 버튼 클릭
      await test.step('음성 입력 시작', async () => {
        await page.click('[data-testid="voice-input-button"]');
        
        // 음성 입력 UI 활성화 확인
        await expect(page.locator('[data-testid="voice-recording"]')).toBeVisible();
        await expect(page.locator('[data-testid="voice-animation"]')).toBeVisible();
      });

      // When: 복잡한 음성 명령 시뮬레이션
      await test.step('복잡한 음성 명령 처리', async () => {
        // 음성 입력 시뮬레이션: "내일 오후 2시부터 4시까지 박대리, 김팀장과 함께 프로젝트 A 진행상황 리뷰 미팅을 회의실 B에서 진행해줘"
        await page.evaluate(() => {
          // 음성 인식 결과 시뮬레이션
          const event = new CustomEvent('voiceResult', {
            detail: {
              transcript: '내일 오후 2시부터 4시까지 박대리, 김팀장과 함께 프로젝트 A 진행상황 리뷰 미팅을 회의실 B에서 진행해줘',
              confidence: 0.95
            }
          });
          window.dispatchEvent(event);
        });

        // AI 파싱 결과 확인
        const parseResult = page.locator('[data-testid="voice-parse-result"]');
        await expect(parseResult).toBeVisible();
        
        // 파싱된 정보 확인
        await expect(page.locator('[data-testid="parsed-title"]')).toContainText('프로젝트 A 진행상황 리뷰 미팅');
        await expect(page.locator('[data-testid="parsed-time"]')).toContainText('내일 14:00-16:00');
        await expect(page.locator('[data-testid="parsed-attendees"]')).toContainText('박대리, 김팀장');
        await expect(page.locator('[data-testid="parsed-location"]')).toContainText('회의실 B');
      });

      // Then: 사용자 확인 후 일정 생성
      await test.step('일정 생성 확인', async () => {
        // 파싱 결과 확인 및 수정 기회 제공
        await expect(page.locator('[data-testid="confirm-voice-event"]')).toBeVisible();
        await expect(page.locator('[data-testid="edit-voice-event"]')).toBeVisible();
        
        await page.click('[data-testid="confirm-voice-event"]');
        
        // 일정 생성 완료
        await expect(page.locator('[data-testid="event-created-toast"]')).toBeVisible();
        
        // 캘린더에 일정 표시 확인
        const createdEvent = page.locator('[data-testid="calendar-event"]:has-text("프로젝트 A")');
        await expect(createdEvent).toBeVisible();
      });
    });

    test('음성 인식 실패 시 적절한 대응을 해야 함', async ({ page }) => {
      // Given: 불명확한 음성 입력 상황
      
      // When: 음성 인식률이 낮은 경우
      await test.step('낮은 인식률 처리', async () => {
        await page.click('[data-testid="voice-input-button"]');
        
        // 낮은 confidence 시뮬레이션
        await page.evaluate(() => {
          const event = new CustomEvent('voiceResult', {
            detail: {
              transcript: '음... 내일... 뭔가... 미팅...',
              confidence: 0.3 // 낮은 신뢰도
            }
          });
          window.dispatchEvent(event);
        });

        // 재시도 요청 메시지
        const retryMessage = page.locator('[data-testid="voice-retry-message"]');
        await expect(retryMessage).toBeVisible();
        await expect(retryMessage).toContainText('다시 말씀해 주세요');
        
        // 재시도 버튼 제공
        await expect(page.locator('[data-testid="voice-retry-button"]')).toBeVisible();
      });

      // When: 완전히 인식 실패한 경우
      await test.step('완전 실패 시 대안 제공', async () => {
        // 3번 연속 실패 시뮬레이션
        for (let i = 0; i < 3; i++) {
          await page.click('[data-testid="voice-retry-button"]');
          await page.evaluate(() => {
            const event = new CustomEvent('voiceResult', {
              detail: { transcript: '', confidence: 0.1 }
            });
            window.dispatchEvent(event);
          });
        }

        // 수동 입력 옵션 제공
        const fallbackOption = page.locator('[data-testid="fallback-to-manual"]');
        await expect(fallbackOption).toBeVisible();
        await expect(fallbackOption).toContainText('직접 입력하시겠어요?');
      });
    });
  });

  test.describe('📱 모바일 반응형 테스트', () => {
    test.beforeEach(async ({ page }) => {
      // 모바일 뷰포트 설정
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await authHelper.loginAsExistingUser();
    });

    test('모바일에서 핵심 기능이 원활하게 동작해야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // 모바일 네비게이션 확인
      await test.step('모바일 UI 적응', async () => {
        // 햄버거 메뉴 버튼 표시
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
        
        // 스와이프 제스처 지원 확인
        const calendarView = page.locator('[data-testid="calendar-view"]');
        await expect(calendarView).toBeVisible();
        
        // 터치 친화적인 버튼 크기 확인
        const addButton = page.locator('[data-testid="mobile-add-button"]');
        await expect(addButton).toBeVisible();
        
        const buttonBox = await addButton.boundingBox();
        expect(buttonBox?.width).toBeGreaterThan(44); // 최소 터치 타겟 크기
        expect(buttonBox?.height).toBeGreaterThan(44);
      });

      // 모바일 일정 추가 플로우
      await test.step('모바일 일정 추가', async () => {
        await page.click('[data-testid="mobile-add-button"]');
        
        // 모바일 최적화된 입력 폼
        const mobileForm = page.locator('[data-testid="mobile-event-form"]');
        await expect(mobileForm).toBeVisible();
        
        // 터치 키보드 친화적인 입력 필드
        await page.fill('[data-testid="mobile-event-title"]', '모바일 테스트 이벤트');
        
        // 모바일 시간 선택기
        await page.click('[data-testid="mobile-time-picker"]');
        await expect(page.locator('[data-testid="time-picker-wheel"]')).toBeVisible();
      });
    });

    test('모바일에서 스와이프 제스처가 동작해야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // 캘린더 스와이프 네비게이션
      await test.step('캘린더 스와이프', async () => {
        const calendar = page.locator('[data-testid="calendar-view"]');
        
        // 오른쪽 스와이프 (이전 주)
        await calendar.hover();
        await page.mouse.down();
        await page.mouse.move(300, 0);
        await page.mouse.up();
        
        // 주간 이동 확인
        await page.waitForTimeout(500); // 애니메이션 대기
        const weekIndicator = page.locator('[data-testid="current-week"]');
        await expect(weekIndicator).not.toContainText('이번 주');
      });
    });
  });
});