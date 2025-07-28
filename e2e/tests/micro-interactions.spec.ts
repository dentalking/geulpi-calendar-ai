import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * ✨ 마이크로 인터랙션 시나리오
 * 빅테크 수준의 세밀한 사용자 경험과 즉각적인 피드백 테스트
 */

test.describe('🎯 마이크로 인터랙션', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('스마트 입력 피드백', () => {
    test('실시간 입력 검증 및 도움말', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-testid="add-event-button"]').click();
      
      // 제목 입력 시 실시간 피드백
      const titleInput = page.locator('[data-testid="event-title-input"]');
      await titleInput.fill('팀');
      
      // 자동완성 제안
      await expect(page.locator('[data-testid="autocomplete-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="suggestion-1"]')).toContainText('팀 미팅');
      await expect(page.locator('[data-testid="suggestion-2"]')).toContainText('팀 빌딩');
      await expect(page.locator('[data-testid="suggestion-3"]')).toContainText('팀 회식');
      
      // 이모지 자동 제안
      await titleInput.fill('생일');
      await expect(page.locator('[data-testid="emoji-suggestion"]')).toContainText('🎂');
      
      // 시간 입력 시 충돌 실시간 감지
      await page.fill('[data-testid="event-time"]', '14:00');
      await expect(page.locator('[data-testid="time-conflict-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-pulse"]')).toHaveClass(/pulse-animation/);
    });

    test('스마트 날짜/시간 파싱', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-testid="quick-add-button"]').click();
      
      // 자연어 시간 입력
      const quickInput = page.locator('[data-testid="quick-add-input"]');
      
      // "내일" 파싱
      await quickInput.fill('내일 점심');
      await expect(page.locator('[data-testid="parsed-preview"]')).toContainText('내일 12:00');
      
      // "다음주 월요일" 파싱
      await quickInput.clear();
      await quickInput.fill('다음주 월요일 회의');
      const nextMonday = new Date();
      nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
      await expect(page.locator('[data-testid="parsed-date"]')).toContainText(nextMonday.toLocaleDateString());
      
      // "30분 후" 파싱
      await quickInput.clear();
      await quickInput.fill('30분 후 전화');
      await expect(page.locator('[data-testid="parsed-relative-time"]')).toBeVisible();
    });

    test('타이핑 중 실시간 협업자 상태', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-testid="event-1"]').click();
      
      // 댓글 입력 시작
      await page.locator('[data-testid="comment-input"]').click();
      await page.keyboard.type('회의록');
      
      // 다른 사용자 타이핑 표시
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('collaborator-typing', {
          detail: { user: '김팀장', eventId: '1' }
        }));
      });
      
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="typing-user"]')).toContainText('김팀장님이 입력 중...');
      
      // 타이핑 애니메이션
      await expect(page.locator('[data-testid="typing-dots"]')).toHaveClass(/typing-animation/);
    });
  });

  test.describe('제스처 기반 인터랙션', () => {
    test('스와이프로 일정 관리', async ({ page }) => {
      await page.goto('/dashboard');
      
      const eventCard = page.locator('[data-testid="event-card-1"]');
      
      // 왼쪽 스와이프 - 빠른 작업
      await eventCard.hover();
      await page.mouse.down();
      await page.mouse.move(-100, 0);
      
      // 스와이프 중 시각적 피드백
      await expect(eventCard).toHaveClass(/swiping-left/);
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
      
      await page.mouse.up();
      
      // 빠른 작업 버튼
      await expect(page.locator('[data-testid="reschedule-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-button"]')).toBeVisible();
      
      // 오른쪽 스와이프 - 완료 표시
      await page.mouse.move(100, 0);
      await page.mouse.down();
      await page.mouse.move(200, 0);
      await expect(eventCard).toHaveClass(/swiping-right/);
      await page.mouse.up();
      
      await expect(page.locator('[data-testid="complete-animation"]')).toBeVisible();
      await expect(eventCard).toHaveClass(/completed/);
    });

    test('드래그로 일정 재배치', async ({ page }) => {
      await page.goto('/dashboard');
      
      const event = page.locator('[data-testid="draggable-event-1"]');
      const targetSlot = page.locator('[data-testid="time-slot-14:00"]');
      
      // 드래그 시작
      await event.hover();
      await page.mouse.down();
      
      // 드래그 중 시각적 피드백
      await expect(event).toHaveClass(/dragging/);
      await expect(page.locator('[data-testid="ghost-preview"]')).toBeVisible();
      
      // 유효한 드롭 영역 하이라이트
      await targetSlot.hover();
      await expect(targetSlot).toHaveClass(/drop-target-valid/);
      
      // 드롭
      await page.mouse.up();
      
      // 부드러운 이동 애니메이션
      await expect(event).toHaveClass(/transitioning/);
      await page.waitForTimeout(300); // 애니메이션 대기
      
      await expect(event).toHaveAttribute('data-time', '14:00');
    });

    test('핀치 줌 캘린더 뷰', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 터치 지원 디바이스 시뮬레이션
      await context.addInitScript(() => {
        window.ontouchstart = () => {};
      });
      
      // 핀치 아웃 - 확대
      await page.evaluate(() => {
        const event = new TouchEvent('touchstart', {
          touches: [
            new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 100 }),
            new Touch({ identifier: 2, target: document.body, clientX: 200, clientY: 200 })
          ]
        });
        document.dispatchEvent(event);
      });
      
      await page.evaluate(() => {
        const event = new TouchEvent('touchmove', {
          touches: [
            new Touch({ identifier: 1, target: document.body, clientX: 50, clientY: 50 }),
            new Touch({ identifier: 2, target: document.body, clientX: 250, clientY: 250 })
          ]
        });
        document.dispatchEvent(event);
      });
      
      // 줌 레벨 변경 확인
      await expect(page.locator('[data-testid="calendar-view"]')).toHaveAttribute('data-zoom', 'day');
      await expect(page.locator('[data-testid="zoom-indicator"]')).toContainText('일간 보기');
    });
  });

  test.describe('시각적 피드백과 애니메이션', () => {
    test('작업 완료 시 만족감 주는 애니메이션', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 체크박스 클릭
      await page.locator('[data-testid="task-checkbox-1"]').click();
      
      // 체크 애니메이션
      await expect(page.locator('[data-testid="check-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="check-animation"]')).toHaveClass(/bounce-in/);
      
      // 진행률 업데이트 애니메이션
      const progressBar = page.locator('[data-testid="daily-progress"]');
      await expect(progressBar).toHaveAttribute('data-animated', 'true');
      await expect(progressBar).toContainText('25% → 30%');
      
      // 축하 파티클 효과
      await expect(page.locator('[data-testid="celebration-particles"]')).toBeVisible();
    });

    test('호버 시 깊이감 있는 그림자 효과', async ({ page }) => {
      await page.goto('/dashboard');
      
      const card = page.locator('[data-testid="event-card-1"]');
      
      // 호버 전 상태 저장
      const initialShadow = await card.evaluate(el => 
        window.getComputedStyle(el).boxShadow
      );
      
      // 호버
      await card.hover();
      
      // 그림자 변화 확인
      const hoverShadow = await card.evaluate(el => 
        window.getComputedStyle(el).boxShadow
      );
      
      expect(initialShadow).not.toBe(hoverShadow);
      await expect(card).toHaveClass(/elevated/);
      
      // 호버 시 추가 정보 페이드인
      await expect(page.locator('[data-testid="hover-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="hover-details"]')).toHaveClass(/fade-in/);
    });

    test('스켈레톤 로딩 및 점진적 렌더링', async ({ page }) => {
      // 느린 네트워크 시뮬레이션
      await page.route('**/graphql', async route => {
        await page.waitForTimeout(1000); // 1초 지연
        await route.continue();
      });
      
      await page.goto('/dashboard');
      
      // 스켈레톤 UI 표시
      await expect(page.locator('[data-testid="skeleton-calendar"]')).toBeVisible();
      await expect(page.locator('[data-testid="skeleton-event"]')).toHaveCount(3);
      
      // 펄스 애니메이션
      await expect(page.locator('[data-testid="skeleton-pulse"]')).toHaveClass(/pulse/);
      
      // 점진적 콘텐츠 로드
      await expect(page.locator('[data-testid="calendar-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
      
      // 스켈레톤 페이드아웃
      await expect(page.locator('[data-testid="skeleton-calendar"]')).not.toBeVisible();
    });
  });

  test.describe('스마트 알림과 토스트', () => {
    test('컨텍스트별 토스트 메시지', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 일정 생성 성공
      await page.locator('[data-testid="quick-add-input"]').fill('회의');
      await page.keyboard.press('Enter');
      
      const successToast = page.locator('[data-testid="toast-success"]');
      await expect(successToast).toBeVisible();
      await expect(successToast).toHaveClass(/slide-in-bottom/);
      
      // 실행 취소 옵션
      await expect(successToast.locator('[data-testid="undo-action"]')).toBeVisible();
      
      // 자동 사라짐 타이머
      await expect(successToast.locator('[data-testid="timer-bar"]')).toBeVisible();
      await expect(successToast.locator('[data-testid="timer-bar"]')).toHaveClass(/shrinking/);
      
      // 충돌 경고 토스트
      await page.locator('[data-testid="create-conflict-event"]').click();
      const warningToast = page.locator('[data-testid="toast-warning"]');
      await expect(warningToast).toBeVisible();
      await expect(warningToast).toHaveClass(/shake/); // 주의를 끄는 애니메이션
    });

    test('인라인 검증 메시지', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-testid="add-event-button"]').click();
      
      // 잘못된 시간 입력
      const timeInput = page.locator('[data-testid="event-time-input"]');
      await timeInput.fill('25:00');
      await timeInput.blur();
      
      // 에러 메시지 부드럽게 나타남
      const errorMessage = page.locator('[data-testid="time-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveClass(/fade-in/);
      await expect(errorMessage).toContainText('올바른 시간 형식이 아닙니다');
      
      // 입력 필드 시각적 피드백
      await expect(timeInput).toHaveClass(/error/);
      await expect(timeInput).toHaveCSS('border-color', 'rgb(239, 68, 68)'); // red-500
      
      // 올바른 입력 시 성공 피드백
      await timeInput.fill('14:00');
      await expect(timeInput).toHaveClass(/success/);
      await expect(page.locator('[data-testid="time-check-icon"]')).toBeVisible();
    });
  });

  test.describe('키보드 단축키와 접근성', () => {
    test('전역 키보드 단축키', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Cmd/Ctrl + K - 빠른 검색
      await page.keyboard.press('Meta+K');
      await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
      
      // 검색 중 실시간 결과
      await page.keyboard.type('팀 미팅');
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="result-highlight"]')).toHaveClass(/highlighted/);
      
      // 화살표 키로 네비게이션
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-testid="result-2"]')).toHaveClass(/selected/);
      
      // Enter로 선택
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
      
      // ESC로 닫기
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="event-detail-modal"]')).not.toBeVisible();
    });

    test('포커스 관리와 탭 네비게이션', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Tab 키로 순차 이동
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="nav-home"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="nav-calendar"]')).toBeFocused();
      
      // 포커스 링 표시
      await expect(page.locator(':focus')).toHaveCSS('outline-style', 'solid');
      await expect(page.locator(':focus')).toHaveCSS('outline-color', 'rgb(59, 130, 246)'); // blue-500
      
      // 모달 내 포커스 트랩
      await page.locator('[data-testid="add-event-button"]').click();
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="modal-close-button"]')).toBeFocused();
      
      // 모달 끝에서 다시 처음으로
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }
      await expect(page.locator('[data-testid="modal-close-button"]')).toBeFocused();
    });
  });

  test.describe('상태 전환과 로딩 상태', () => {
    test('낙관적 UI 업데이트', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 네트워크 지연 시뮬레이션
      await context.route('**/graphql', async route => {
        if (route.request().postDataJSON()?.operationName === 'UpdateEvent') {
          await page.waitForTimeout(2000); // 2초 지연
          await route.fulfill({ status: 200, body: '{"data":{"updateEvent":true}}' });
        } else {
          await route.continue();
        }
      });
      
      // 이벤트 수정
      const eventCard = page.locator('[data-testid="event-card-1"]');
      await eventCard.click();
      await page.fill('[data-testid="event-title-input"]', '수정된 제목');
      await page.locator('[data-testid="save-button"]').click();
      
      // 즉시 UI 업데이트 (낙관적)
      await expect(eventCard).toContainText('수정된 제목');
      await expect(eventCard).toHaveClass(/updating/);
      
      // 저장 중 표시
      await expect(page.locator('[data-testid="saving-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="saving-spinner"]')).toHaveClass(/spin/);
      
      // 저장 완료
      await expect(page.locator('[data-testid="saved-checkmark"]')).toBeVisible({ timeout: 3000 });
      await expect(eventCard).not.toHaveClass(/updating/);
    });

    test('무한 스크롤과 가상화', async ({ page }) => {
      await page.goto('/dashboard/events');
      
      // 초기 아이템 로드
      await expect(page.locator('[data-testid="event-list-item"]')).toHaveCount(20);
      
      // 스크롤 다운
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // 로딩 스피너
      await expect(page.locator('[data-testid="loading-more"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toHaveClass(/rotate/);
      
      // 추가 아이템 로드
      await expect(page.locator('[data-testid="event-list-item"]')).toHaveCount(40, { timeout: 2000 });
      
      // 스크롤 위치 복원
      const scrollPosition = await page.evaluate(() => window.scrollY);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const restoredPosition = await page.evaluate(() => window.scrollY);
      expect(Math.abs(restoredPosition - scrollPosition)).toBeLessThan(50);
    });
  });

  test.describe('음향 피드백', () => {
    test('작업별 사운드 효과', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 사운드 설정 활성화
      await page.goto('/settings/sound');
      await page.locator('[data-testid="enable-sounds"]').check();
      
      await page.goto('/dashboard');
      
      // 오디오 재생 감지 설정
      let audioPlayed = false;
      await page.exposeFunction('onAudioPlay', () => {
        audioPlayed = true;
      });
      
      await page.evaluate(() => {
        const originalPlay = HTMLAudioElement.prototype.play;
        HTMLAudioElement.prototype.play = function() {
          window.onAudioPlay();
          return originalPlay.call(this);
        };
      });
      
      // 작업 완료 사운드
      await page.locator('[data-testid="complete-task-1"]').click();
      await page.waitForTimeout(100);
      expect(audioPlayed).toBeTruthy();
      
      // 알림 사운드
      audioPlayed = false;
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('notification', {
          detail: { type: 'reminder' }
        }));
      });
      await page.waitForTimeout(100);
      expect(audioPlayed).toBeTruthy();
    });
  });
});