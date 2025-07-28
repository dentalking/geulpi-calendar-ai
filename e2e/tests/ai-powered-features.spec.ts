import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';

/**
 * AI-Powered Features - P1 Priority
 * AI 기능 중심의 빅테크급 UX 시나리오 테스트
 */

test.describe('🤖 AI-Powered Features (P1)', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsExistingUser();
  });

  test.describe('📸 OCR 이미지 일정 추가', () => {
    test('화이트보드 회의 일정표로 일정을 추가할 수 있어야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // Given: 카메라 권한 허용
      await page.context().grantPermissions(['camera']);

      // When: OCR 기능 시작
      await test.step('OCR 입력 시작', async () => {
        await page.click('[data-testid="ocr-input-button"]');
        
        // 카메라 모드 활성화
        await expect(page.locator('[data-testid="camera-interface"]')).toBeVisible();
        await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible();
        
        // 또는 파일 업로드 옵션
        await expect(page.locator('[data-testid="upload-image-button"]')).toBeVisible();
      });

      // When: 회의 일정표 이미지 업로드/촬영
      await test.step('이미지 처리', async () => {
        // 테스트용 이미지 업로드 시뮬레이션
        const testImagePath = 'test-data/meeting-schedule.png';
        await page.setInputFiles('[data-testid="image-upload-input"]', testImagePath);
        
        // OCR 처리 중 로딩 표시
        await expect(page.locator('[data-testid="ocr-processing"]')).toBeVisible();
        await expect(page.locator('[data-testid="processing-animation"]')).toBeVisible();
        
        // AI 분석 중 메시지
        await expect(page.locator('[data-testid="ocr-status"]')).toContainText('이미지를 분석하고 있습니다');
      });

      // Then: OCR 분석 결과 표시 및 확인
      await test.step('OCR 결과 검증', async () => {
        // OCR 분석 완료 대기 (실제로는 ML 서버 응답 시뮬레이션)
        await page.waitForSelector('[data-testid="ocr-results"]', { timeout: 10000 });
        
        // 인식된 일정 정보 표시
        const extractedEvents = page.locator('[data-testid="extracted-event"]');
        await expect(extractedEvents).toHaveCount(3); // 예시: 3개 일정 인식
        
        // 첫 번째 인식된 일정 확인
        const firstEvent = extractedEvents.first();
        await expect(firstEvent.locator('[data-testid="event-title"]')).toContainText('스프린트 플래닝');
        await expect(firstEvent.locator('[data-testid="event-time"]')).toContainText('12월 1일 10:00-12:00');
        await expect(firstEvent.locator('[data-testid="event-attendees"]')).toContainText('개발팀 전체');
        
        // 신뢰도 점수 표시
        await expect(firstEvent.locator('[data-testid="confidence-score"]')).toContainText('95%');
      });

      // When: 인식 결과 수정 및 확인
      await test.step('인식 결과 검토 및 수정', async () => {
        // 두 번째 일정의 시간 수정
        const secondEvent = page.locator('[data-testid="extracted-event"]').nth(1);
        await secondEvent.locator('[data-testid="edit-event"]').click();
        
        // 인라인 편집 모드
        await expect(page.locator('[data-testid="inline-edit-modal"]')).toBeVisible();
        await page.fill('[data-testid="edit-event-title"]', '코드 리뷰 세션');
        await page.fill('[data-testid="edit-event-time"]', '12월 1일 14:00-15:30');
        
        await page.click('[data-testid="save-edit"]');
        
        // 수정 사항 반영 확인
        await expect(secondEvent.locator('[data-testid="event-title"]')).toContainText('코드 리뷰 세션');
      });

      // When: 일정 일괄 추가
      await test.step('일정 일괄 생성', async () => {
        // 모든 일정 선택
        await page.click('[data-testid="select-all-events"]');
        
        // 일괄 추가 버튼
        await page.click('[data-testid="add-all-events"]');
        
        // 충돌 검사 및 알림
        const conflictAlert = page.locator('[data-testid="schedule-conflict-alert"]');
        if (await conflictAlert.isVisible()) {
          await expect(conflictAlert).toContainText('일정 충돌이 감지되었습니다');
          await page.click('[data-testid="resolve-conflicts"]');
        }
        
        // 생성 완료 확인
        await expect(page.locator('[data-testid="bulk-creation-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="success-message"]')).toContainText('3개 일정이 추가되었습니다');
      });

      // Then: 캘린더에 일정 반영 확인
      await test.step('캘린더 반영 확인', async () => {
        await page.goto('/calendar?date=2024-12-01');
        
        // 추가된 일정들이 캘린더에 표시되는지 확인
        await expect(page.locator('[data-testid="calendar-event"]:has-text("스프린트 플래닝")')).toBeVisible();
        await expect(page.locator('[data-testid="calendar-event"]:has-text("코드 리뷰 세션")')).toBeVisible();
        
        // AI 분류된 카테고리 확인
        const workEvents = page.locator('[data-testid="calendar-event"][data-category="work"]');
        await expect(workEvents).toHaveCount(3);
      });
    });

    test('OCR 인식 실패 시 적절한 대응을 해야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // Given: 인식하기 어려운 이미지 (흐릿함, 손글씨 등)
      await test.step('낮은 품질 이미지 처리', async () => {
        await page.click('[data-testid="ocr-input-button"]');
        
        // 흐릿한 테스트 이미지 업로드
        const blurryImagePath = 'test-data/blurry-schedule.png';
        await page.setInputFiles('[data-testid="image-upload-input"]', blurryImagePath);
        
        // OCR 처리 후 낮은 신뢰도 결과
        await page.waitForSelector('[data-testid="ocr-results"]');
        
        // 낮은 신뢰도 경고 표시
        const lowConfidenceWarning = page.locator('[data-testid="low-confidence-warning"]');
        await expect(lowConfidenceWarning).toBeVisible();
        await expect(lowConfidenceWarning).toContainText('인식 정확도가 낮습니다');
      });

      // When: 재촬영 또는 수동 입력 옵션 제공
      await test.step('대안 옵션 제공', async () => {
        // 재촬영 버튼
        await expect(page.locator('[data-testid="retake-photo"]')).toBeVisible();
        
        // 수동 입력 버튼
        await expect(page.locator('[data-testid="manual-input-option"]')).toBeVisible();
        
        // 다른 이미지 업로드 버튼
        await expect(page.locator('[data-testid="upload-different-image"]')).toBeVisible();
        
        // 수동 입력 선택
        await page.click('[data-testid="manual-input-option"]');
        
        // 일반 일정 추가 폼으로 전환
        await expect(page.locator('[data-testid="manual-event-form"]')).toBeVisible();
        await expect(page.locator('[data-testid="form-title"]')).toContainText('직접 입력');
      });
    });
  });

  test.describe('🎯 AI 스케줄 최적화', () => {
    test('비효율적인 스케줄을 감지하고 최적화 제안을 해야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // Given: 비효율적인 스케줄 상황 설정
      await test.step('비효율적인 스케줄 생성', async () => {
        // 연속된 미팅 사이에 짧은 간격 생성
        const inefficientEvents = [
          { title: '클라이언트 미팅 A', time: '09:00-10:00' },
          { title: '10분 휴식', time: '10:00-10:10' },
          { title: '내부 회의', time: '10:10-11:10' },
          { title: '15분 이동', time: '11:10-11:25' },
          { title: '클라이언트 미팅 B', time: '11:25-12:25' }
        ];

        for (const event of inefficientEvents) {
          await page.click('[data-testid="quick-add-button"]');
          await page.fill('[data-testid="quick-add-input"]', `${event.title} ${event.time}`);
          await page.press('[data-testid="quick-add-input"]', 'Enter');
          await page.waitForTimeout(500);
        }
      });

      // When: AI 분석 실행
      await test.step('AI 스케줄 분석', async () => {
        // AI가 자동으로 비효율성 감지 (실시간 분석)
        await page.waitForSelector('[data-testid="ai-analysis-notification"]', { timeout: 15000 });
        
        const optimizationSuggestion = page.locator('[data-testid="optimization-suggestion-card"]');
        await expect(optimizationSuggestion).toBeVisible();
        
        // 분석 결과 표시
        await expect(optimizationSuggestion).toContainText('스케줄 최적화 기회 발견');
        await expect(optimizationSuggestion).toContainText('45분 절약 가능');
        
        // 구체적인 제안 내용
        await expect(page.locator('[data-testid="optimization-details"]')).toContainText('미팅 블록화');
        await expect(page.locator('[data-testid="efficiency-gain"]')).toContainText('효율성 35% 향상');
      });

      // When: 최적화 제안 상세 확인
      await test.step('최적화 제안 상세 보기', async () => {
        await page.click('[data-testid="view-optimization-details"]');
        
        const optimizationModal = page.locator('[data-testid="optimization-modal"]');
        await expect(optimizationModal).toBeVisible();
        
        // Before/After 비교 표시
        await expect(page.locator('[data-testid="schedule-before"]')).toBeVisible();
        await expect(page.locator('[data-testid="schedule-after"]')).toBeVisible();
        
        // 개선 사항 하이라이트
        const improvements = page.locator('[data-testid="improvement-item"]');
        await expect(improvements).toHaveCount(3);
        
        // 예상 효과 표시
        await expect(page.locator('[data-testid="expected-benefits"]')).toContainText('집중 시간 확보');
        await expect(page.locator('[data-testid="stress-reduction"]')).toContainText('스트레스 25% 감소');
      });

      // When: 자동 최적화 실행
      await test.step('자동 최적화 적용', async () => {
        await page.click('[data-testid="apply-optimization"]');
        
        // 확인 다이얼로그
        const confirmDialog = page.locator('[data-testid="optimization-confirm-dialog"]');
        await expect(confirmDialog).toBeVisible();
        await expect(confirmDialog).toContainText('관련자들에게 일정 변경을 알려드릴까요?');
        
        // 자동 알림 옵션 선택
        await page.check('[data-testid="auto-notify-attendees"]');
        await page.click('[data-testid="confirm-optimization"]');
        
        // 최적화 진행 상태 표시
        const progressIndicator = page.locator('[data-testid="optimization-progress"]');
        await expect(progressIndicator).toBeVisible();
        
        // 완료 알림
        await expect(page.locator('[data-testid="optimization-complete"]')).toBeVisible();
        await expect(page.locator('[data-testid="completion-message"]')).toContainText('스케줄이 최적화되었습니다');
      });

      // Then: 최적화 결과 확인
      await test.step('최적화 결과 검증', async () => {
        // 캘린더에서 변경된 스케줄 확인
        await page.reload();
        
        // 블록화된 미팅 확인
        const meetingBlock = page.locator('[data-testid="meeting-block"]');
        await expect(meetingBlock).toBeVisible();
        await expect(meetingBlock).toContainText('미팅 블록 (3개)');
        
        // 확보된 집중 시간 확인
        const focusTime = page.locator('[data-testid="focus-time-block"]');
        await expect(focusTime).toBeVisible();
        await expect(focusTime).toContainText('집중 시간 (45분)');
        
        // 효율성 점수 향상 확인
        const efficiencyScore = page.locator('[data-testid="efficiency-score"]');
        await expect(efficiencyScore).toContainText('85'); // 향상된 점수
      });
    });

    test('사용자 피드백을 통해 AI 추천을 개선해야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // Given: AI 최적화 제안이 표시된 상태
      await test.step('최적화 제안 표시', async () => {
        // 테스트용 최적화 제안 시뮬레이션
        await page.evaluate(() => {
          const mockSuggestion = {
            id: 'opt-001',
            type: 'SCHEDULE_OPTIMIZATION',
            title: '오후 미팅 블록화 제안',
            description: '3개 미팅을 연속으로 배치하여 2시간 집중 시간 확보',
            impact: { efficiency: 40, focusTime: 120 }
          };
          window.dispatchEvent(new CustomEvent('aiSuggestion', { detail: mockSuggestion }));
        });

        await expect(page.locator('[data-testid="optimization-suggestion-card"]')).toBeVisible();
      });

      // When: 사용자가 제안을 거절하고 이유 제공
      await test.step('제안 거절 및 피드백', async () => {
        await page.click('[data-testid="reject-suggestion"]');
        
        // 거절 이유 선택
        const rejectionModal = page.locator('[data-testid="rejection-feedback-modal"]');
        await expect(rejectionModal).toBeVisible();
        
        // 거절 이유 옵션들
        await expect(page.locator('[data-testid="reason-option"]')).toHaveCount(5);
        
        await page.click('[data-testid="reason-client-preference"]');
        await page.fill('[data-testid="additional-feedback"]', '클라이언트가 개별 미팅을 선호함');
        
        await page.click('[data-testid="submit-feedback"]');
        
        // 피드백 감사 메시지
        await expect(page.locator('[data-testid="feedback-thanks"]')).toBeVisible();
        await expect(page.locator('[data-testid="learning-message"]')).toContainText('향후 더 나은 제안을 위해 학습하겠습니다');
      });

      // Then: AI 학습 반영 확인
      await test.step('AI 학습 반영 검증', async () => {
        // 유사한 상황에서 개선된 제안 확인
        // (실제로는 ML 모델 재학습 프로세스)
        
        // 사용자 프로필에 선호도 반영 확인
        await page.goto('/settings/ai-preferences');
        
        const learningHistory = page.locator('[data-testid="ai-learning-history"]');
        await expect(learningHistory).toBeVisible();
        await expect(learningHistory).toContainText('클라이언트 미팅 블록화 선호도: 낮음');
        
        // 향후 제안에서 해당 패턴 제외 확인
        const exclusionRules = page.locator('[data-testid="exclusion-rules"]');
        await expect(exclusionRules).toContainText('클라이언트 미팅은 개별 스케줄링 선호');
      });
    });
  });

  test.describe('📊 라이프 밸런스 모니터링', () => {
    test('실시간 라이프 밸런스 분석 및 인사이트를 제공해야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // Given: 다양한 활동이 기록된 상태
      await test.step('활동 데이터 준비', async () => {
        // 테스트용 활동 데이터 생성
        const activities = [
          { title: '개발 작업', area: 'work', duration: 6 }, // 6시간
          { title: '팀 미팅', area: 'work', duration: 2 }, // 2시간  
          { title: '가족 저녁식사', area: 'family', duration: 1.5 }, // 1.5시간
          { title: '운동', area: 'health', duration: 1 }, // 1시간
          { title: '독서', area: 'growth', duration: 0.5 } // 30분
        ];

        for (const activity of activities) {
          await page.evaluate((activity) => {
            window.dispatchEvent(new CustomEvent('addTestActivity', { detail: activity }));
          }, activity);
        }
      });

      // When: 밸런스 분석 실행
      await test.step('실시간 밸런스 분석', async () => {
        await page.click('[data-testid="balance-tab"]');
        
        // 실시간 분석 로딩
        await expect(page.locator('[data-testid="balance-analysis-loading"]')).toBeVisible();
        
        // 분석 완료 후 결과 표시
        await page.waitForSelector('[data-testid="balance-dashboard"]');
        
        // 전체 밸런스 점수
        const balanceScore = page.locator('[data-testid="overall-balance-score"]');
        await expect(balanceScore).toBeVisible();
        await expect(balanceScore).toContainText('/100');
        
        // 영역별 상세 분석
        const workBalance = page.locator('[data-testid="work-balance"]');
        await expect(workBalance).toContainText('73%'); // 8시간/11시간
        
        const familyBalance = page.locator('[data-testid="family-balance"]');  
        await expect(familyBalance).toContainText('14%'); // 1.5시간/11시간
      });

      // When: 인사이트 및 권장사항 확인
      await test.step('AI 인사이트 제공', async () => {
        const insightsSection = page.locator('[data-testid="balance-insights"]');
        await expect(insightsSection).toBeVisible();
        
        // 주요 인사이트 표시
        const keyInsights = page.locator('[data-testid="key-insight"]');
        await expect(keyInsights).toHaveCount(3);
        
        // 구체적인 인사이트 내용 확인
        await expect(keyInsights.first()).toContainText('업무 시간이 목표보다 13% 초과');
        await expect(keyInsights.nth(1)).toContainText('가족 시간이 11% 부족');
        await expect(keyInsights.nth(2)).toContainText('건강 관리 시간 확보 필요');
        
        // 실행 가능한 권장사항
        const recommendations = page.locator('[data-testid="recommendation"]');
        await expect(recommendations).toHaveCount(3);
        
        await expect(recommendations.first()).toContainText('주 2회 가족 시간 블록 추가');
        await expect(recommendations.nth(1)).toContainText('점심시간 운동 루틴 추가');
      });

      // When: 목표 설정 및 추적
      await test.step('목표 설정 및 추적', async () => {
        await page.click('[data-testid="set-balance-goals"]');
        
        const goalModal = page.locator('[data-testid="balance-goal-modal"]');
        await expect(goalModal).toBeVisible();
        
        // 영역별 목표 비율 설정
        await page.fill('[data-testid="work-goal"]', '60');
        await page.fill('[data-testid="family-goal"]', '25');
        await page.fill('[data-testid="health-goal"]', '10');
        await page.fill('[data-testid="growth-goal"]', '5');
        
        await page.click('[data-testid="save-goals"]');
        
        // 목표 대비 현재 상태 시각화
        const progressChart = page.locator('[data-testid="goal-progress-chart"]');
        await expect(progressChart).toBeVisible();
        
        // 목표 달성률 표시
        await expect(page.locator('[data-testid="goal-achievement"]')).toContainText('67%');
      });

      // Then: 주간/월간 트렌드 분석
      await test.step('장기 트렌드 분석', async () => {
        await page.click('[data-testid="trend-analysis-tab"]');
        
        // 주간 트렌드 차트
        const weeklyTrend = page.locator('[data-testid="weekly-trend-chart"]');
        await expect(weeklyTrend).toBeVisible();
        
        // 월간 패턴 분석
        const monthlyPattern = page.locator('[data-testid="monthly-pattern"]');
        await expect(monthlyPattern).toBeVisible();
        
        // 개선 추세 확인
        const improvementTrend = page.locator('[data-testid="improvement-trend"]');
        await expect(improvementTrend).toContainText('지난 주 대비 5% 개선');
        
        // 예측 분석
        const prediction = page.locator('[data-testid="balance-prediction"]');
        await expect(prediction).toContainText('현재 추세로는 다음 주 목표 달성 가능');
      });
    });

    test('밸런스 불균형 감지 시 적극적인 개입을 해야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // Given: 심각한 불균형 상황 시뮬레이션
      await test.step('불균형 상황 생성', async () => {
        // 극단적인 업무 중심 스케줄 생성
        const extremeWorkload = [
          { title: '오버타임 작업', area: 'work', duration: 12 },
          { title: '긴급 회의', area: 'work', duration: 2 },
          { title: '야근', area: 'work', duration: 4 }
        ];

        for (const activity of extremeWorkload) {
          await page.evaluate((activity) => {
            window.dispatchEvent(new CustomEvent('addTestActivity', { detail: activity }));
          }, activity);
        }
      });

      // When: AI가 번아웃 위험 감지
      await test.step('번아웃 위험 감지', async () => {
        // AI 실시간 모니터링 결과
        await page.waitForSelector('[data-testid="burnout-alert"]', { timeout: 10000 });
        
        const burnoutAlert = page.locator('[data-testid="burnout-alert"]');
        await expect(burnoutAlert).toBeVisible();
        await expect(burnoutAlert).toContainText('번아웃 위험 감지');
        await expect(burnoutAlert).toContainText('업무 시간 90% 초과');
        
        // 심각도 레벨 표시
        await expect(page.locator('[data-testid="severity-level"]')).toContainText('HIGH');
        
        // 즉시 조치 권장
        const urgentActions = page.locator('[data-testid="urgent-action"]');
        await expect(urgentActions).toBeVisible();
        await expect(urgentActions).toContainText('즉시 휴식 시간 확보 필요');
      });

      // When: 긴급 개입 제안
      await test.step('긴급 개입 제안', async () => {
        await page.click('[data-testid="view-intervention-options"]');
        
        const interventionModal = page.locator('[data-testid="intervention-modal"]');
        await expect(interventionModal).toBeVisible();
        
        // 긴급 조치 옵션들
        const interventionOptions = page.locator('[data-testid="intervention-option"]');
        await expect(interventionOptions).toHaveCount(4);
        
        // 옵션 1: 자동 휴식 시간 블록
        await expect(interventionOptions.first()).toContainText('30분 휴식 시간 자동 추가');
        
        // 옵션 2: 미팅 재조정
        await expect(interventionOptions.nth(1)).toContainText('내일로 미팅 2개 이동');
        
        // 옵션 3: 팀 알림
        await expect(interventionOptions.nth(2)).toContainText('팀에 업무량 조정 요청');
        
        // 옵션 4: 관리자 알림
        await expect(interventionOptions.nth(3)).toContainText('관리자에게 상황 알림');
      });

      // When: 자동 개입 실행
      await test.step('자동 개입 실행', async () => {
        // 휴식 시간 자동 추가 선택
        await page.click('[data-testid="auto-break-intervention"]');
        
        // 개입 실행 확인
        const confirmIntervention = page.locator('[data-testid="confirm-intervention"]');
        await expect(confirmIntervention).toBeVisible();
        await page.click('[data-testid="execute-intervention"]');
        
        // 개입 완료 알림
        await expect(page.locator('[data-testid="intervention-complete"]')).toBeVisible();
        await expect(page.locator('[data-testid="intervention-message"]')).toContainText('30분 휴식 시간이 추가되었습니다');
        
        // 스케줄에 반영 확인
        await page.goto('/calendar');
        const breakBlock = page.locator('[data-testid="break-time-block"]');
        await expect(breakBlock).toBeVisible();
        await expect(breakBlock).toContainText('휴식 시간 (자동 추가)');
      });
    });
  });

  test.describe('💬 자연어 채팅 인터페이스', () => {
    test('복잡한 스케줄 조정 요청을 자연어로 처리할 수 있어야 함', async ({ page }) => {
      await page.goto('/dashboard');

      // Given: 채팅 인터페이스 활성화
      await test.step('채팅 인터페이스 시작', async () => {
        await page.click('[data-testid="ai-chat-button"]');
        
        const chatInterface = page.locator('[data-testid="chat-interface"]');
        await expect(chatInterface).toBeVisible();
        
        // 초기 AI 인사말
        const welcomeMessage = page.locator('[data-testid="ai-message"]').first();
        await expect(welcomeMessage).toContainText('안녕하세요! 일정 관리를 도와드리겠습니다');
        
        // 채팅 입력창 활성화
        await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="chat-input"]')).toBeFocused();
      });

      // When: 복잡한 자연어 요청
      await test.step('복잡한 스케줄 조정 요청', async () => {
        const complexRequest = '다음 주 화요일에 부모님 생신이라서 그 날 미팅들을 다른 날로 옮기고 싶어. 오전 회의는 월요일로, 오후 클라이언트 미팅은 수요일로 가능할까?';
        
        await page.fill('[data-testid="chat-input"]', complexRequest);
        await page.press('[data-testid="chat-input"]', 'Enter');
        
        // 사용자 메시지 표시 확인
        const userMessage = page.locator('[data-testid="user-message"]').last();
        await expect(userMessage).toContainText(complexRequest);
        
        // AI 처리 중 인디케이터
        await expect(page.locator('[data-testid="ai-typing-indicator"]')).toBeVisible();
      });

      // Then: AI 이해 및 분석 결과
      await test.step('AI 이해 및 분석', async () => {
        // AI 응답 대기
        await page.waitForSelector('[data-testid="ai-message"]:last-child', { timeout: 10000 });
        
        const aiResponse = page.locator('[data-testid="ai-message"]').last();
        
        // AI가 요청을 정확히 이해했는지 확인
        await expect(aiResponse).toContainText('화요일 일정 확인');
        await expect(aiResponse).toContainText('3개 미팅 발견');
        
        // 구체적인 조정 계획 제시
        await expect(aiResponse).toContainText('오전 10시 팀 회의 → 월요일 동시간');
        await expect(aiResponse).toContainText('오후 2시 클라이언트 미팅 → 수요일 추천');
        
        // 확인을 위한 버튼 제공
        await expect(page.locator('[data-testid="approve-changes"]')).toBeVisible();
        await expect(page.locator('[data-testid="modify-suggestion"]')).toBeVisible();
      });

      // When: 부분 수정 요청
      await test.step('부분 수정 요청', async () => {
        const modificationRequest = '클라이언트 미팅은 그냥 화요일에 두고, 나머지만 옮겨줘';
        
        await page.fill('[data-testid="chat-input"]', modificationRequest);
        await page.press('[data-testid="chat-input"]', 'Enter');
        
        // AI가 수정 요청 이해
        const modifiedResponse = page.locator('[data-testid="ai-message"]').last();
        await expect(modifiedResponse).toContainText('클라이언트 미팅 유지');
        await expect(modifiedResponse).toContainText('2개 미팅만 조정');
        
        // 수정된 계획 확인
        await expect(modifiedResponse).toContainText('✅ 오전 팀 회의 → 월요일');
        await expect(modifiedResponse).toContainText('✅ 오후 개인 미팅 → 목요일');
        await expect(modifiedResponse).toContainText('🔒 클라이언트 미팅 → 화요일 유지');
      });

      // When: 최종 승인 및 실행
      await test.step('변경사항 적용', async () => {
        await page.click('[data-testid="approve-changes"]');
        
        // 실행 진행상황 표시
        const executionProgress = page.locator('[data-testid="execution-progress"]');
        await expect(executionProgress).toBeVisible();
        
        // 진행 단계별 알림
        await expect(page.locator('[data-testid="progress-step"]')).toContainText('참석자들에게 알림 발송 중');
        
        // 완료 확인
        await page.waitForSelector('[data-testid="execution-complete"]');
        const completionMessage = page.locator('[data-testid="ai-message"]').last();
        await expect(completionMessage).toContainText('모든 변경사항이 적용되었습니다');
        await expect(completionMessage).toContainText('관련자 2명에게 알림 발송 완료');
      });

      // Then: 실제 스케줄 반영 확인
      await test.step('스케줄 변경 검증', async () => {
        await page.goto('/calendar');
        
        // 월요일 이동된 팀 회의 확인
        await page.click('[data-testid="monday-tab"]');
        await expect(page.locator('[data-testid="calendar-event"]:has-text("팀 회의")')).toBeVisible();
        
        // 화요일 클라이언트 미팅 유지 확인
        await page.click('[data-testid="tuesday-tab"]');
        await expect(page.locator('[data-testid="calendar-event"]:has-text("클라이언트 미팅")')).toBeVisible();
        
        // 변경 이력 확인
        const changeLog = page.locator('[data-testid="schedule-change-log"]');
        await expect(changeLog).toContainText('AI 채팅을 통한 일정 조정');
      });
    });

    test('모호한 요청에 대해 명확화를 요구해야 함', async ({ page }) => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      // Given: 모호한 요청
      await test.step('모호한 요청 처리', async () => {
        const ambiguousRequest = '내일 미팅 시간 바꿔줘';
        
        await page.fill('[data-testid="chat-input"]', ambiguousRequest);
        await page.press('[data-testid="chat-input"]', 'Enter');
        
        // AI 명확화 요청
        const clarificationResponse = page.locator('[data-testid="ai-message"]').last();
        await expect(clarificationResponse).toContainText('좀 더 구체적으로');
        await expect(clarificationResponse).toContainText('내일 3개의 미팅이 있습니다');
        
        // 선택 옵션 제공
        const meetingOptions = page.locator('[data-testid="meeting-option"]');
        await expect(meetingOptions).toHaveCount(3);
        
        await expect(meetingOptions.first()).toContainText('오전 9시 팀 스탠드업');
        await expect(meetingOptions.nth(1)).toContainText('오후 2시 클라이언트 미팅');
        await expect(meetingOptions.nth(2)).toContainText('오후 4시 1:1 미팅');
      });

      // When: 명확화 응답
      await test.step('명확화 응답', async () => {
        await page.click('[data-testid="meeting-option"]:first-child');
        
        // 추가 세부사항 요청
        const detailRequest = page.locator('[data-testid="ai-message"]').last();
        await expect(detailRequest).toContainText('팀 스탠드업을 언제로 변경하시겠어요?');
        
        // 시간 제안 옵션 제공
        const timeOptions = page.locator('[data-testid="time-option"]');
        await expect(timeOptions).toHaveCount(4);
        await expect(timeOptions.first()).toContainText('오전 8시 30분');
        await expect(timeOptions.nth(1)).toContainText('오전 10시');
      });
    });
  });
});