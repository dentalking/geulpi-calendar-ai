import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🛠️ 실패/복구 시나리오
 * 시스템 장애, 네트워크 오류, 데이터 손실 등 예외 상황 처리 테스트
 */

test.describe('💥 실패/복구 시나리오', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('네트워크 장애 대응', () => {
    test('오프라인 모드 자동 전환 및 복구', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 정상 상태 확인
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-status"]')).toContainText('동기화됨');
      
      // 네트워크 연결 끊기
      await context.setOffline(true);
      
      // 오프라인 감지 및 UI 변경
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-banner"]')).toContainText('오프라인 모드');
      await expect(page.locator('[data-testid="offline-icon"]')).toHaveClass(/pulsing/);
      
      // 오프라인에서 일정 생성 시도
      await page.locator('[data-testid="add-event-button"]').click();
      await page.fill('[data-testid="event-title"]', '오프라인 일정');
      await page.fill('[data-testid="event-date"]', '2024-02-15');
      await page.locator('[data-testid="save-event"]').click();
      
      // 로컬 저장 확인
      await expect(page.locator('[data-testid="offline-saved"]')).toContainText('로컬에 저장됨');
      await expect(page.locator('[data-testid="pending-sync-indicator"]')).toBeVisible();
      
      // 오프라인 큐 확인
      await page.locator('[data-testid="offline-queue"]').click();
      const offlineQueue = page.locator('[data-testid="sync-queue"]');
      await expect(offlineQueue).toBeVisible();
      await expect(offlineQueue.locator('.pending-item')).toHaveCount(1);
      await expect(offlineQueue).toContainText('오프라인 일정');
      
      // 읽기 전용 데이터 확인
      await expect(page.locator('[data-testid="cached-events"]')).toBeVisible();
      await expect(page.locator('[data-testid="cache-indicator"]')).toContainText('캐시된 데이터');
      
      // 네트워크 복구
      await context.setOffline(false);
      
      // 자동 재연결 감지
      await expect(page.locator('[data-testid="reconnecting"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-in-progress"]')).toBeVisible();
      
      // 동기화 완료
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
      
      // 충돌 해결 확인
      await expect(page.locator('[data-testid="conflict-resolved"]')).toContainText('충돌 없이 동기화 완료');
    });

    test('부분적 연결 실패 처리', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 특정 API만 실패하도록 설정
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        // 이벤트 생성은 실패, 조회는 성공
        if (postData?.operationName === 'CreateEvent') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });
      
      // 일정 생성 시도
      await page.locator('[data-testid="add-event-button"]').click();
      await page.fill('[data-testid="event-title"]', '네트워크 실패 테스트');
      await page.locator('[data-testid="save-event"]').click();
      
      // 부분 실패 알림
      const partialFailure = page.locator('[data-testid="partial-failure"]');
      await expect(partialFailure).toBeVisible();
      await expect(partialFailure).toContainText('일시적 오류가 발생했습니다');
      
      // 재시도 옵션
      await expect(partialFailure.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(partialFailure.locator('[data-testid="save-offline"]')).toBeVisible();
      
      // 자동 재시도 카운터
      await expect(page.locator('[data-testid="retry-count"]')).toContainText('재시도 1/3');
      
      // 오프라인 저장 선택
      await partialFailure.locator('[data-testid="save-offline"]').click();
      await expect(page.locator('[data-testid="offline-saved"]')).toContainText('오프라인에 저장되었습니다');
      
      // 백그라운드 재시도 표시
      await expect(page.locator('[data-testid="background-retry"]')).toBeVisible();
    });

    test('API 응답 시간 초과 처리', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 느린 응답 시뮬레이션
      await context.route('**/graphql', async route => {
        // 30초 대기 후 응답 (타임아웃 테스트)
        await new Promise(resolve => setTimeout(resolve, 31000));
        await route.continue();
      });
      
      // 일정 로드 시도
      await page.locator('[data-testid="refresh-events"]').click();
      
      // 로딩 상태 표시
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // 타임아웃 경고
      await expect(page.locator('[data-testid="timeout-warning"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="timeout-warning"]')).toContainText('응답 시간이 지연되고 있습니다');
      
      // 사용자 선택 옵션
      const timeoutOptions = page.locator('[data-testid="timeout-options"]');
      await expect(timeoutOptions).toBeVisible();
      await expect(timeoutOptions.locator('[data-testid="continue-waiting"]')).toBeVisible();
      await expect(timeoutOptions.locator('[data-testid="cancel-request"]')).toBeVisible();
      await expect(timeoutOptions.locator('[data-testid="use-cached"]')).toBeVisible();
      
      // 캐시된 데이터 사용
      await timeoutOptions.locator('[data-testid="use-cached"]').click();
      
      // 캐시 데이터 로드
      await expect(page.locator('[data-testid="cached-data-loaded"]')).toBeVisible();
      await expect(page.locator('[data-testid="cache-timestamp"]')).toContainText('마지막 업데이트:');
    });
  });

  test.describe('데이터 무결성 보호', () => {
    test('동시 편집 충돌 해결', async ({ page, context, browser }) => {
      await page.goto('/calendar/event/1');
      
      // 두 번째 사용자 세션
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await setupAuthenticatedState(page2, context2);
      await page2.goto('/calendar/event/1');
      
      // 첫 번째 사용자가 제목 수정
      await page.locator('[data-testid="edit-title"]').click();
      await page.fill('[data-testid="title-input"]', '수정된 제목 v1');
      
      // 두 번째 사용자가 동시에 제목 수정
      await page2.locator('[data-testid="edit-title"]').click();
      await page2.fill('[data-testid="title-input"]', '수정된 제목 v2');
      
      // 첫 번째 사용자 저장
      await page.locator('[data-testid="save-changes"]').click();
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
      
      // 두 번째 사용자 저장 시도 (충돌 발생)
      await page2.locator('[data-testid="save-changes"]').click();
      
      // 충돌 감지 모달
      const conflictModal = page2.locator('[data-testid="conflict-modal"]');
      await expect(conflictModal).toBeVisible();
      await expect(conflictModal).toContainText('다른 사용자가 이미 수정했습니다');
      
      // 충돌 해결 옵션
      await expect(conflictModal.locator('[data-testid="keep-mine"]')).toContainText('내 변경사항 유지');
      await expect(conflictModal.locator('[data-testid="keep-theirs"]')).toContainText('다른 사용자 변경사항 수용');
      await expect(conflictModal.locator('[data-testid="merge-changes"]')).toContainText('변경사항 병합');
      
      // 변경사항 비교 표시
      const comparison = conflictModal.locator('[data-testid="conflict-comparison"]');
      await expect(comparison.locator('[data-testid="original"]')).toContainText('원본');
      await expect(comparison.locator('[data-testid="version-1"]')).toContainText('수정된 제목 v1');
      await expect(comparison.locator('[data-testid="version-2"]')).toContainText('수정된 제목 v2');
      
      // 병합 선택
      await conflictModal.locator('[data-testid="merge-changes"]').click();
      
      // 병합 에디터
      const mergeEditor = page2.locator('[data-testid="merge-editor"]');
      await expect(mergeEditor).toBeVisible();
      await mergeEditor.locator('[data-testid="merged-title"]').fill('수정된 제목 v1 + v2 병합');
      
      await mergeEditor.locator('[data-testid="confirm-merge"]').click();
      await expect(page2.locator('[data-testid="merge-success"]')).toContainText('변경사항이 병합되었습니다');
      
      await context2.close();
    });

    test('데이터 손실 방지 및 자동 복구', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 중요한 일정 편집 시작
      await page.locator('[data-testid="important-event"]').click();
      await page.locator('[data-testid="edit-event"]').click();
      
      // 복잡한 변경사항 입력
      await page.fill('[data-testid="event-title"]', '매우 중요한 프로젝트 마감일 미팅');
      await page.fill('[data-testid="event-description"]', '이 미팅에서는 프로젝트의 최종 마감일을 결정하고...');
      
      // 자동 저장 기능 확인
      await page.waitForTimeout(3000); // 자동 저장 주기
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toContainText('자동 저장됨');
      
      // 브라우저 크래시 시뮬레이션 (페이지 새로고침)
      await page.reload();
      
      // 복구 알림
      const recoveryNotice = page.locator('[data-testid="recovery-notice"]');
      await expect(recoveryNotice).toBeVisible();
      await expect(recoveryNotice).toContainText('이전 세션에서 저장되지 않은 변경사항이 있습니다');
      
      // 복구 옵션
      await expect(recoveryNotice.locator('[data-testid="restore-data"]')).toBeVisible();
      await expect(recoveryNotice.locator('[data-testid="discard-data"]')).toBeVisible();
      
      // 데이터 복구
      await recoveryNotice.locator('[data-testid="restore-data"]').click();
      
      // 복구된 데이터 확인
      await expect(page.locator('[data-testid="event-title-input"]')).toHaveValue('매우 중요한 프로젝트 마감일 미팅');
      await expect(page.locator('[data-testid="data-restored"]')).toContainText('데이터가 복구되었습니다');
    });

    test('버전 관리 및 롤백 기능', async ({ page, context }) => {
      await page.goto('/calendar/event/1');
      
      // Mock 버전 히스토리
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetEventHistory') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                eventHistory: [
                  {
                    version: 3,
                    timestamp: '2024-02-01T14:30:00Z',
                    author: '나',
                    changes: ['제목 변경', '시간 수정'],
                    title: '팀 회의 (최종)',
                    time: '15:00-16:00'
                  },
                  {
                    version: 2,
                    timestamp: '2024-02-01T14:00:00Z',
                    author: '김팀장',
                    changes: ['참석자 추가'],
                    title: '팀 회의',
                    time: '14:00-15:00'
                  },
                  {
                    version: 1,
                    timestamp: '2024-02-01T13:00:00Z',
                    author: '나',
                    changes: ['일정 생성'],
                    title: '팀 회의',
                    time: '14:00-15:00'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 버전 히스토리 열기
      await page.locator('[data-testid="version-history"]').click();
      
      const historyPanel = page.locator('[data-testid="history-panel"]');
      await expect(historyPanel).toBeVisible();
      
      // 버전 목록 확인
      const versions = historyPanel.locator('[data-testid="version-item"]');
      await expect(versions).toHaveCount(3);
      
      // 각 버전 정보
      await expect(versions.nth(0)).toContainText('v3 - 나 (방금 전)');
      await expect(versions.nth(1)).toContainText('v2 - 김팀장 (30분 전)');
      await expect(versions.nth(2)).toContainText('v1 - 나 (1시간 전)');
      
      // 이전 버전 미리보기
      await versions.nth(1).locator('[data-testid="preview-version"]').click();
      
      const versionPreview = page.locator('[data-testid="version-preview"]');
      await expect(versionPreview).toBeVisible();
      await expect(versionPreview).toContainText('시간: 14:00-15:00');
      
      // 롤백 확인
      await versionPreview.locator('[data-testid="rollback-to-version"]').click();
      
      const rollbackConfirm = page.locator('[data-testid="rollback-confirm"]');
      await expect(rollbackConfirm).toBeVisible();
      await expect(rollbackConfirm).toContainText('v2로 되돌리시겠습니까?');
      
      await rollbackConfirm.locator('[data-testid="confirm-rollback"]').click();
      await expect(page.locator('[data-testid="rollback-success"]')).toContainText('v2로 롤백되었습니다');
    });
  });

  test.describe('시스템 오류 처리', () => {
    test('서버 오류 및 graceful degradation', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 서버 500 오류 시뮬레이션
      await context.route('**/graphql', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Internal Server Error' }]
          })
        });
      });
      
      // 데이터 로드 시도
      await page.locator('[data-testid="refresh-dashboard"]').click();
      
      // 오류 감지 및 대체 UI
      const errorFallback = page.locator('[data-testid="error-fallback"]');
      await expect(errorFallback).toBeVisible();
      await expect(errorFallback).toContainText('일시적으로 서비스에 접근할 수 없습니다');
      
      // 기능 제한 모드
      await expect(page.locator('[data-testid="limited-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="cached-data-notice"]')).toContainText('캐시된 데이터를 표시합니다');
      
      // 사용 가능한 기능 표시
      const availableFeatures = page.locator('[data-testid="available-features"]');
      await expect(availableFeatures).toBeVisible();
      await expect(availableFeatures).toContainText('읽기 전용 모드');
      await expect(availableFeatures).toContainText('오프라인 편집 가능');
      
      // 제한된 기능 표시
      const limitedFeatures = page.locator('[data-testid="limited-features"]');
      await expect(limitedFeatures).toContainText('실시간 동기화 불가');
      await expect(limitedFeatures).toContainText('공유 기능 제한');
      
      // 재시도 버튼
      await expect(errorFallback.locator('[data-testid="retry-connection"]')).toBeVisible();
      
      // 오류 보고 옵션
      await expect(errorFallback.locator('[data-testid="report-issue"]')).toBeVisible();
    });

    test('메모리 부족 및 성능 저하 대응', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 메모리 사용량 모니터링 시뮬레이션
      await page.evaluate(() => {
        // 메모리 부족 상황 시뮬레이션
        window.performance.memory = {
          usedJSHeapSize: 90 * 1024 * 1024, // 90MB
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB
          jsHeapSizeLimit: 100 * 1024 * 1024
        };
        
        window.dispatchEvent(new CustomEvent('memoryPressure', {
          detail: { level: 'high', usage: 0.9 }
        }));
      });
      
      // 메모리 경고 표시
      const memoryWarning = page.locator('[data-testid="memory-warning"]');
      await expect(memoryWarning).toBeVisible();
      await expect(memoryWarning).toContainText('메모리 사용량이 높습니다');
      
      // 자동 최적화 시작
      await expect(page.locator('[data-testid="auto-optimization"]')).toContainText('성능 최적화 중...');
      
      // 최적화 액션들
      const optimizations = page.locator('[data-testid="optimization-actions"]');
      await expect(optimizations).toBeVisible();
      await expect(optimizations).toContainText('캐시 정리');
      await expect(optimizations).toContainText('이미지 압축');
      await expect(optimizations).toContainText('백그라운드 프로세스 일시 중단');
      
      // 성능 모드 전환
      await expect(page.locator('[data-testid="performance-mode"]')).toContainText('경량 모드로 전환됨');
      
      // UI 단순화 확인
      await expect(page.locator('[data-testid="simplified-ui"]')).toBeVisible();
      await expect(page.locator('[data-testid="animations-disabled"]')).toHaveAttribute('data-animations', 'false');
      
      // 수동 최적화 옵션
      const manualOptimizations = page.locator('[data-testid="manual-optimizations"]');
      await expect(manualOptimizations).toBeVisible();
      await expect(manualOptimizations.locator('[data-testid="clear-cache"]')).toBeVisible();
      await expect(manualOptimizations.locator('[data-testid="reduce-quality"]')).toBeVisible();
    });

    test('외부 서비스 장애 대응', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Google Calendar 연동 실패 시뮬레이션
      await context.route('**/api/google-calendar/**', async route => {
        await route.fulfill({
          status: 503,
          body: 'Service Unavailable'
        });
      });
      
      // 동기화 시도
      await page.locator('[data-testid="sync-google-calendar"]').click();
      
      // 외부 서비스 오류 알림
      const externalServiceError = page.locator('[data-testid="external-service-error"]');
      await expect(externalServiceError).toBeVisible();
      await expect(externalServiceError).toContainText('Google Calendar 연결에 실패했습니다');
      
      // 대체 기능 제안
      const fallbackOptions = page.locator('[data-testid="fallback-options"]');
      await expect(fallbackOptions).toBeVisible();
      await expect(fallbackOptions).toContainText('수동 동기화');
      await expect(fallbackOptions).toContainText('독립 모드로 계속');
      
      // 서비스 상태 페이지 링크
      await expect(externalServiceError.locator('[data-testid="service-status"]')).toBeVisible();
      
      // 자동 재시도 설정
      const retrySettings = page.locator('[data-testid="retry-settings"]');
      await expect(retrySettings).toBeVisible();
      await expect(retrySettings.locator('[data-testid="auto-retry-toggle"]')).toBeChecked();
      
      // 백그라운드 재시도 표시
      await expect(page.locator('[data-testid="background-retry-indicator"]')).toContainText('5분 후 재시도');
    });
  });

  test.describe('사용자 오류 방지', () => {
    test('실수 방지 및 되돌리기 기능', async ({ page }) => {
      await page.goto('/dashboard');
      
      // 중요한 일정 삭제 시도
      await page.locator('[data-testid="important-event"]').hover();
      await page.locator('[data-testid="delete-event"]').click();
      
      // 삭제 확인 모달
      const deleteConfirm = page.locator('[data-testid="delete-confirm"]');
      await expect(deleteConfirm).toBeVisible();
      await expect(deleteConfirm).toContainText('정말 삭제하시겠습니까?');
      
      // 위험성 경고
      await expect(deleteConfirm.locator('[data-testid="warning-message"]')).toContainText('이 작업은 되돌릴 수 없습니다');
      await expect(deleteConfirm.locator('[data-testid="attendee-warning"]')).toContainText('5명의 참석자에게 영향');
      
      // 안전장치 (타이핑 확인)
      await expect(deleteConfirm.locator('[data-testid="type-to-confirm"]')).toBeVisible();
      await page.fill('[data-testid="confirm-input"]', '삭제');
      
      // 삭제 실행
      await deleteConfirm.locator('[data-testid="confirm-delete"]').click();
      
      // 즉시 되돌리기 토스트
      const undoToast = page.locator('[data-testid="undo-toast"]');
      await expect(undoToast).toBeVisible();
      await expect(undoToast).toContainText('일정이 삭제되었습니다');
      await expect(undoToast.locator('[data-testid="undo-button"]')).toBeVisible();
      
      // 타이머 표시
      await expect(undoToast.locator('[data-testid="undo-timer"]')).toBeVisible();
      
      // 되돌리기 실행
      await undoToast.locator('[data-testid="undo-button"]').click();
      
      // 복구 확인
      await expect(page.locator('[data-testid="restore-success"]')).toContainText('일정이 복구되었습니다');
      await expect(page.locator('[data-testid="important-event"]')).toBeVisible();
    });

    test('입력 유효성 검사 및 오류 가이드', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-testid="add-event-button"]').click();
      
      // 잘못된 날짜 입력
      await page.fill('[data-testid="event-date"]', '2023-13-45'); // 잘못된 날짜
      await page.locator('[data-testid="event-title"]').click(); // 포커스 이동으로 유효성 검사 트리거
      
      // 실시간 유효성 검사
      const dateError = page.locator('[data-testid="date-error"]');
      await expect(dateError).toBeVisible();
      await expect(dateError).toContainText('유효하지 않은 날짜입니다');
      await expect(dateError).toHaveClass(/error-shake/);
      
      // 수정 제안
      await expect(dateError.locator('[data-testid="suggested-fix"]')).toContainText('올바른 형식: YYYY-MM-DD');
      
      // 자동 수정 옵션
      await dateError.locator('[data-testid="auto-fix"]').click();
      await expect(page.locator('[data-testid="event-date"]')).toHaveValue('2024-01-01'); // 자동 수정됨
      
      // 시간 충돌 검사
      await page.fill('[data-testid="event-time"]', '14:00-15:00');
      
      // 충돌 경고
      const conflictWarning = page.locator('[data-testid="time-conflict"]');
      await expect(conflictWarning).toBeVisible();
      await expect(conflictWarning).toContainText('다른 일정과 시간이 겹칩니다');
      
      // 충돌 상세 정보
      await conflictWarning.locator('[data-testid="show-conflicts"]').click();
      const conflictDetails = page.locator('[data-testid="conflict-details"]');
      await expect(conflictDetails).toContainText('기존 일정: 팀 회의 (14:30-15:30)');
      
      // 대안 시간 제안
      await expect(conflictDetails.locator('[data-testid="alternative-times"]')).toBeVisible();
      await conflictDetails.locator('[data-testid="suggested-time-1"]').click();
      
      // 제목 길이 제한
      const longTitle = 'a'.repeat(101); // 100자 초과
      await page.fill('[data-testid="event-title"]', longTitle);
      
      const lengthWarning = page.locator('[data-testid="title-length-warning"]');
      await expect(lengthWarning).toBeVisible();
      await expect(lengthWarning).toContainText('100자를 초과했습니다');
      
      // 실시간 글자 수 표시
      await expect(page.locator('[data-testid="character-count"]')).toContainText('101/100');
    });

    test('권한 오류 및 접근 제한 처리', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 권한 없는 일정 접근 시뮬레이션
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetPrivateEvent') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              errors: [{ message: 'Access denied' }]
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 비공개 일정 클릭
      await page.locator('[data-testid="private-event"]').click();
      
      // 권한 오류 모달
      const permissionError = page.locator('[data-testid="permission-error"]');
      await expect(permissionError).toBeVisible();
      await expect(permissionError).toContainText('이 일정에 접근할 권한이 없습니다');
      
      // 도움말 정보
      const helpInfo = permissionError.locator('[data-testid="help-info"]');
      await expect(helpInfo).toBeVisible();
      await expect(helpInfo).toContainText('일정 소유자에게 접근 권한을 요청하세요');
      
      // 권한 요청 버튼
      await expect(permissionError.locator('[data-testid="request-access"]')).toBeVisible();
      
      // 관리자 연락처
      await expect(permissionError.locator('[data-testid="admin-contact"]')).toContainText('관리자: admin@company.com');
      
      // 권한 요청 실행
      await permissionError.locator('[data-testid="request-access"]').click();
      
      // 요청 메시지 작성
      const requestModal = page.locator('[data-testid="access-request-modal"]');
      await expect(requestModal).toBeVisible();
      await page.fill('[data-testid="request-message"]', '프로젝트 관련 정보 확인이 필요합니다.');
      
      await requestModal.locator('[data-testid="send-request"]').click();
      await expect(page.locator('[data-testid="request-sent"]')).toContainText('접근 권한 요청이 전송되었습니다');
    });
  });

  test.describe('비즈니스 연속성', () => {
    test('중요 데이터 백업 및 복구', async ({ page, context }) => {
      await page.goto('/settings/backup');
      
      // Mock 백업 설정
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetBackupInfo') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                backupInfo: {
                  lastBackup: '2024-02-01T10:00:00Z',
                  backupSize: '45.2 MB',
                  frequency: 'daily',
                  retention: '30 days',
                  status: 'healthy'
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 백업 현황
      const backupStatus = page.locator('[data-testid="backup-status"]');
      await expect(backupStatus).toBeVisible();
      await expect(backupStatus).toContainText('마지막 백업: 2시간 전');
      await expect(backupStatus).toContainText('상태: 정상');
      
      // 수동 백업 실행
      await page.locator('[data-testid="manual-backup"]').click();
      
      // 백업 진행 상황
      const backupProgress = page.locator('[data-testid="backup-progress"]');
      await expect(backupProgress).toBeVisible();
      await expect(backupProgress.locator('[data-testid="progress-bar"]')).toBeVisible();
      
      // 백업 완료
      await expect(page.locator('[data-testid="backup-complete"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="backup-complete"]')).toContainText('백업이 완료되었습니다');
      
      // 복구 시뮬레이션
      await page.locator('[data-testid="restore-data"]').click();
      
      const restoreModal = page.locator('[data-testid="restore-modal"]');
      await expect(restoreModal).toBeVisible();
      
      // 복구 지점 선택
      const restorePoints = restoreModal.locator('[data-testid="restore-points"]');
      await expect(restorePoints.locator('.restore-point')).toHaveCount(7); // 일주일치
      
      // 특정 시점 선택
      await restorePoints.locator('[data-testid="point-yesterday"]').click();
      
      // 복구 범위 선택
      await expect(restoreModal.locator('[data-testid="restore-scope"]')).toBeVisible();
      await restoreModal.locator('[data-testid="scope-events"]').check();
      await restoreModal.locator('[data-testid="scope-settings"]').check();
      
      // 복구 실행
      await restoreModal.locator('[data-testid="confirm-restore"]').click();
      
      const restoreProgress = page.locator('[data-testid="restore-progress"]');
      await expect(restoreProgress).toBeVisible();
      await expect(restoreProgress).toContainText('데이터 복구 중...');
    });

    test('장애 시 대체 워크플로우', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 시스템 장애 시뮬레이션
      await context.route('**/api/**', async route => {
        await route.abort('failed');
      });
      
      // 장애 감지
      await page.locator('[data-testid="refresh-dashboard"]').click();
      
      // 장애 모드 활성화
      const emergencyMode = page.locator('[data-testid="emergency-mode"]');
      await expect(emergencyMode).toBeVisible();
      await expect(emergencyMode).toContainText('비상 모드가 활성화되었습니다');
      
      // 필수 기능만 제공
      const essentialFeatures = page.locator('[data-testid="essential-features"]');
      await expect(essentialFeatures).toBeVisible();
      
      // 읽기 전용 캘린더
      await expect(essentialFeatures.locator('[data-testid="readonly-calendar"]')).toBeVisible();
      
      // 오프라인 노트 작성
      await expect(essentialFeatures.locator('[data-testid="offline-notes"]')).toBeVisible();
      
      // 인쇄 가능한 일정표
      await expect(essentialFeatures.locator('[data-testid="printable-schedule"]')).toBeVisible();
      
      // 대체 연락 방법
      const alternativeContact = page.locator('[data-testid="alternative-contact"]');
      await expect(alternativeContact).toBeVisible();
      await expect(alternativeContact).toContainText('긴급 연락처: +82-2-1234-5678');
      await expect(alternativeContact).toContainText('이메일: emergency@company.com');
      
      // 상황 보고
      await page.locator('[data-testid="report-outage"]').click();
      
      const outageReport = page.locator('[data-testid="outage-report"]');
      await expect(outageReport).toBeVisible();
      await page.fill('[data-testid="impact-description"]', '중요한 미팅이 1시간 후에 있어서 일정 확인이 필요합니다.');
      
      await outageReport.locator('[data-testid="submit-report"]').click();
      await expect(page.locator('[data-testid="report-submitted"]')).toContainText('상황이 보고되었습니다');
    });
  });
});