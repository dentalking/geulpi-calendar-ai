import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🌍 글로벌 시나리오
 * 다국가, 다시간대, 다문화 환경에서의 캘린더 서비스 테스트
 */

test.describe('🌐 글로벌 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('다국어 지원 (i18n)', () => {
    test('언어 전환 및 실시간 번역', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 초기 언어 (한국어) 확인
      await expect(page.locator('[data-testid="app-title"]')).toContainText('대시보드');
      
      // 언어 설정 메뉴
      await page.locator('[data-testid="language-selector"]').click();
      
      const languageMenu = page.locator('[data-testid="language-menu"]');
      await expect(languageMenu).toBeVisible();
      
      // 지원 언어 목록
      await expect(languageMenu.locator('[data-testid="lang-ko"]')).toContainText('한국어');
      await expect(languageMenu.locator('[data-testid="lang-en"]')).toContainText('English');
      await expect(languageMenu.locator('[data-testid="lang-ja"]')).toContainText('日本語');
      await expect(languageMenu.locator('[data-testid="lang-zh"]')).toContainText('中文');
      await expect(languageMenu.locator('[data-testid="lang-es"]')).toContainText('Español');
      
      // 영어로 전환
      await languageMenu.locator('[data-testid="lang-en"]').click();
      
      // UI 언어 변경 확인
      await expect(page.locator('[data-testid="app-title"]')).toContainText('Dashboard');
      await expect(page.locator('[data-testid="today-events"]')).toContainText('Today\'s Events');
      await expect(page.locator('[data-testid="add-event-button"]')).toContainText('Add Event');
      
      // 날짜 형식 변경 확인
      await expect(page.locator('[data-testid="current-date"]')).toContainText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      
      // 일본어로 전환
      await page.locator('[data-testid="language-selector"]').click();
      await languageMenu.locator('[data-testid="lang-ja"]').click();
      
      await expect(page.locator('[data-testid="app-title"]')).toContainText('ダッシュボード');
      await expect(page.locator('[data-testid="add-event-button"]')).toContainText('イベントを追加');
      
      // 중국어 번체로 전환
      await page.locator('[data-testid="language-selector"]').click();
      await languageMenu.locator('[data-testid="lang-zh-tw"]').click();
      
      await expect(page.locator('[data-testid="app-title"]')).toContainText('儀表板');
      
      // RTL 언어 (아랍어) 지원 테스트
      await page.locator('[data-testid="language-selector"]').click();
      await languageMenu.locator('[data-testid="lang-ar"]').click();
      
      // RTL 레이아웃 적용 확인
      await expect(page.locator('body')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/rtl/);
    });

    test('혼합 언어 환경에서의 일정 처리', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Mock 다국어 팀원 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetTeamMembers') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                teamMembers: [
                  { id: '1', name: '김철수', locale: 'ko-KR', timezone: 'Asia/Seoul' },
                  { id: '2', name: 'John Smith', locale: 'en-US', timezone: 'America/New_York' },
                  { id: '3', name: '田中太郎', locale: 'ja-JP', timezone: 'Asia/Tokyo' },
                  { id: '4', name: '王小明', locale: 'zh-CN', timezone: 'Asia/Shanghai' }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 다국어 회의 생성
      await page.locator('[data-testid="add-event-button"]').click();
      
      // 제목을 여러 언어로 입력
      await page.fill('[data-testid="event-title"]', 'Global Team Meeting / グローバルチーム会議 / 全球团队会议');
      
      // 참석자 추가
      await page.locator('[data-testid="add-attendees"]').click();
      await page.locator('[data-testid="select-all-team"]').click();
      
      // 자동 언어 감지 및 번역 제안
      await expect(page.locator('[data-testid="language-detected"]')).toBeVisible();
      await expect(page.locator('[data-testid="translation-suggestions"]')).toContainText('다국어 제목 감지됨');
      
      // 참석자별 맞춤 초대장
      await page.locator('[data-testid="customize-invitations"]').click();
      
      const inviteCustomization = page.locator('[data-testid="invite-customization"]');
      await expect(inviteCustomization).toBeVisible();
      
      // 각 참석자의 선호 언어로 초대장 미리보기
      await expect(inviteCustomization.locator('[data-testid="preview-ko"]')).toContainText('회의 초대');
      await expect(inviteCustomization.locator('[data-testid="preview-en"]')).toContainText('Meeting Invitation');
      await expect(inviteCustomization.locator('[data-testid="preview-ja"]')).toContainText('会議の招待');
      
      // 일정 생성
      await page.locator('[data-testid="create-multilingual-event"]').click();
      await expect(page.locator('[data-testid="event-created"]')).toContainText('다국어 일정이 생성되었습니다');
    });

    test('AI 번역 및 요약 기능', async ({ page, context }) => {
      await page.goto('/calendar/event/1');
      
      // 영어로 작성된 회의록
      await page.locator('[data-testid="meeting-notes"]').click();
      await page.fill('[data-testid="notes-input"]', 
        'We discussed the Q1 roadmap and decided to prioritize the mobile app development. ' +
        'The deadline is March 31st. John will lead the frontend team and Sarah will handle backend.'
      );
      
      // AI 번역 활성화
      await page.locator('[data-testid="enable-translation"]').click();
      
      // 번역 언어 선택
      await page.selectOption('[data-testid="target-language"]', 'ko');
      
      // 실시간 번역 결과
      const translation = page.locator('[data-testid="translation-result"]');
      await expect(translation).toBeVisible();
      await expect(translation).toContainText('1분기 로드맵을 논의했으며');
      await expect(translation).toContainText('모바일 앱 개발을 우선순위로');
      await expect(translation).toContainText('마감일은 3월 31일');
      
      // 번역 품질 평가
      await expect(page.locator('[data-testid="translation-quality"]')).toContainText('번역 품질: 높음');
      
      // 다국어 요약 생성
      await page.locator('[data-testid="generate-summary"]').click();
      
      const summary = page.locator('[data-testid="multilingual-summary"]');
      await expect(summary).toBeVisible();
      
      // 각 언어별 요약
      await expect(summary.locator('[data-testid="summary-ko"]')).toContainText('주요 결정사항');
      await expect(summary.locator('[data-testid="summary-en"]')).toContainText('Key Decisions');
      await expect(summary.locator('[data-testid="summary-ja"]')).toContainText('主要な決定事項');
      
      // 문화적 맥락 고려 메모
      await expect(page.locator('[data-testid="cultural-notes"]')).toBeVisible();
      await expect(page.locator('[data-testid="cultural-notes"]')).toContainText('미국식 날짜 형식 (MM/DD) → 한국식 (MM월 DD일)로 변환됨');
    });
  });

  test.describe('시간대 관리', () => {
    test('글로벌 팀 시간대 동기화', async ({ page, context }) => {
      await page.goto('/team/global-view');
      
      // Mock 글로벌 팀 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetGlobalTeam') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                globalTeam: [
                  { 
                    name: '김철수', 
                    location: 'Seoul', 
                    timezone: 'Asia/Seoul',
                    currentTime: '2024-02-01T14:00:00+09:00',
                    workingHours: { start: '09:00', end: '18:00' },
                    status: 'working'
                  },
                  { 
                    name: 'John Smith', 
                    location: 'New York', 
                    timezone: 'America/New_York',
                    currentTime: '2024-02-01T00:00:00-05:00',
                    workingHours: { start: '09:00', end: '17:00' },
                    status: 'sleeping'
                  },
                  { 
                    name: 'Emma Wilson', 
                    location: 'London', 
                    timezone: 'Europe/London',
                    currentTime: '2024-02-01T05:00:00+00:00',
                    workingHours: { start: '08:30', end: '17:30' },
                    status: 'sleeping'
                  },
                  { 
                    name: 'Raj Patel', 
                    location: 'Mumbai', 
                    timezone: 'Asia/Kolkata',
                    currentTime: '2024-02-01T10:30:00+05:30',
                    workingHours: { start: '10:00', end: '19:00' },
                    status: 'working'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 글로벌 시간대 대시보드
      const timezoneDashboard = page.locator('[data-testid="timezone-dashboard"]');
      await expect(timezoneDashboard).toBeVisible();
      
      // 각 팀원의 현재 시간 표시
      await expect(timezoneDashboard.locator('[data-testid="time-seoul"]')).toContainText('14:00');
      await expect(timezoneDashboard.locator('[data-testid="time-newyork"]')).toContainText('00:00');
      await expect(timezoneDashboard.locator('[data-testid="time-london"]')).toContainText('05:00');
      await expect(timezoneDashboard.locator('[data-testid="time-mumbai"]')).toContainText('10:30');
      
      // 근무 상태 표시
      await expect(timezoneDashboard.locator('[data-testid="status-seoul"]')).toHaveClass(/working/);
      await expect(timezoneDashboard.locator('[data-testid="status-newyork"]')).toHaveClass(/sleeping/);
      await expect(timezoneDashboard.locator('[data-testid="status-mumbai"]')).toHaveClass(/working/);
      
      // 최적 회의 시간 찾기
      await page.locator('[data-testid="find-optimal-time"]').click();
      
      const optimalTime = page.locator('[data-testid="optimal-meeting-time"]');
      await expect(optimalTime).toBeVisible();
      await expect(optimalTime).toContainText('권장 회의 시간');
      
      // 시간대별 회의 시간 표시
      await expect(optimalTime.locator('[data-testid="time-for-seoul"]')).toContainText('10:00 (수요일)');
      await expect(optimalTime.locator('[data-testid="time-for-newyork"]')).toContainText('20:00 (화요일)');
      await expect(optimalTime.locator('[data-testid="time-for-london"]')).toContainText('01:00 (수요일)');
      
      // 참가 가능성 점수
      await expect(optimalTime.locator('[data-testid="attendance-score"]')).toContainText('참가 가능성: 75%');
      
      // 대안 시간 제안
      await expect(page.locator('[data-testid="alternative-times"]')).toBeVisible();
      await expect(page.locator('[data-testid="alternative-1"]')).toContainText('Seoul 15:00 = NYC 01:00 = London 06:00');
    });

    test('일광절약시간 자동 처리', async ({ page, context }) => {
      await page.goto('/calendar');
      
      // Mock DST 전환 시나리오
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetDSTInfo') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                dstInfo: {
                  upcomingChanges: [
                    {
                      timezone: 'America/New_York',
                      changeDate: '2024-03-10T07:00:00Z',
                      type: 'spring_forward',
                      hourChange: '+1',
                      affectedEvents: ['meeting-with-us-team']
                    },
                    {
                      timezone: 'Europe/London', 
                      changeDate: '2024-03-31T01:00:00Z',
                      type: 'spring_forward',
                      hourChange: '+1',
                      affectedEvents: ['london-sync']
                    }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // DST 알림 배너
      const dstAlert = page.locator('[data-testid="dst-alert"]');
      await expect(dstAlert).toBeVisible();
      await expect(dstAlert).toContainText('일광절약시간 변경 예정');
      await expect(dstAlert).toContainText('3월 10일');
      
      // 영향받는 일정 확인
      await dstAlert.locator('[data-testid="view-affected-events"]').click();
      
      const affectedEvents = page.locator('[data-testid="dst-affected-events"]');
      await expect(affectedEvents).toBeVisible();
      await expect(affectedEvents.locator('.affected-event')).toHaveCount(2);
      
      // 자동 조정 제안
      const autoAdjust = affectedEvents.locator('[data-testid="auto-adjust-dst"]');
      await expect(autoAdjust).toBeVisible();
      await expect(autoAdjust).toContainText('자동으로 시간 조정');
      
      // 조정 미리보기
      await autoAdjust.locator('[data-testid="preview-adjustments"]').click();
      
      const preview = page.locator('[data-testid="dst-adjustment-preview"]');
      await expect(preview).toBeVisible();
      await expect(preview).toContainText('기존: 10:00 EST → 조정 후: 11:00 EDT');
      
      // 조정 적용
      await preview.locator('[data-testid="apply-dst-adjustments"]').click();
      await expect(page.locator('[data-testid="dst-adjusted"]')).toContainText('시간대 변경이 적용되었습니다');
      
      // 참석자 알림
      await expect(page.locator('[data-testid="attendee-notification"]')).toContainText('참석자들에게 시간 변경 알림 발송됨');
    });

    test('시차 피로도 관리', async ({ page, context }) => {
      await page.goto('/wellness/jetlag');
      
      // Mock 출장 일정
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetTravelSchedule') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                travelSchedule: {
                  departure: {
                    city: 'Seoul',
                    timezone: 'Asia/Seoul',
                    date: '2024-02-15T14:00:00+09:00'
                  },
                  arrival: {
                    city: 'San Francisco',
                    timezone: 'America/Los_Angeles',
                    date: '2024-02-15T09:00:00-08:00'
                  },
                  timeDifference: -17, // 17시간 차이
                  flightDuration: '11h 30m'
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 시차 피로도 계산
      const jetlagCalculator = page.locator('[data-testid="jetlag-calculator"]');
      await expect(jetlagCalculator).toBeVisible();
      
      // 출발/도착 정보
      await expect(jetlagCalculator.locator('[data-testid="departure-info"]')).toContainText('서울 → 샌프란시스코');
      await expect(jetlagCalculator.locator('[data-testid="time-difference"]')).toContainText('17시간 차이');
      
      // 피로도 예측
      const fatigueLevel = jetlagCalculator.locator('[data-testid="fatigue-prediction"]');
      await expect(fatigueLevel).toBeVisible();
      await expect(fatigueLevel).toContainText('예상 피로도: 높음');
      await expect(fatigueLevel).toContainText('회복 기간: 5-7일');
      
      // 적응 스케줄 제안
      const adaptationSchedule = page.locator('[data-testid="adaptation-schedule"]');
      await expect(adaptationSchedule).toBeVisible();
      
      // 날짜별 추천 일정
      await expect(adaptationSchedule.locator('[data-testid="day-1"]')).toContainText('도착일: 가벼운 업무만');
      await expect(adaptationSchedule.locator('[data-testid="day-2"]')).toContainText('둘째날: 오전 회의 피하기');
      await expect(adaptationSchedule.locator('[data-testid="day-3"]')).toContainText('셋째날: 정상 업무 가능');
      
      // 수면 패턴 조정 알림
      const sleepAdjustment = page.locator('[data-testid="sleep-adjustment"]');
      await expect(sleepAdjustment).toBeVisible();
      await expect(sleepAdjustment).toContainText('출발 3일 전부터 수면 시간 조정 시작');
      
      // 캘린더에 자동 적용
      await page.locator('[data-testid="apply-jetlag-schedule"]').click();
      await expect(page.locator('[data-testid="schedule-applied"]')).toContainText('시차 적응 일정이 캘린더에 반영되었습니다');
    });
  });

  test.describe('문화적 차이 고려', () => {
    test('지역별 업무 문화 적응', async ({ page, context }) => {
      await page.goto('/settings/cultural-preferences');
      
      // 문화 프로필 설정
      await page.selectOption('[data-testid="cultural-profile"]', 'east-asian');
      
      // 동아시아 문화 설정 적용
      await expect(page.locator('[data-testid="hierarchy-respect"]')).toBeChecked();
      await expect(page.locator('[data-testid="group-harmony"]')).toBeChecked();
      await expect(page.locator('[data-testid="formal-communication"]')).toBeChecked();
      
      await page.goto('/dashboard');
      
      // 문화적 맥락이 반영된 UI
      await expect(page.locator('[data-testid="formal-greeting"]')).toContainText('안녕하십니까');
      
      // 회의 생성 시 문화적 고려사항
      await page.locator('[data-testid="add-event-button"]').click();
      
      const culturalTips = page.locator('[data-testid="cultural-tips"]');
      await expect(culturalTips).toBeVisible();
      await expect(culturalTips).toContainText('상급자 일정을 먼저 확인하세요');
      await expect(culturalTips).toContainText('충분한 준비 시간을 제공하세요');
      
      // 서구 문화로 변경
      await page.goto('/settings/cultural-preferences');
      await page.selectOption('[data-testid="cultural-profile"]', 'western');
      
      await page.goto('/dashboard');
      await page.locator('[data-testid="add-event-button"]').click();
      
      // 서구 문화 팁
      const westernTips = page.locator('[data-testid="cultural-tips"]');
      await expect(westernTips).toContainText('직접적인 커뮤니케이션 권장');
      await expect(westernTips).toContainText('효율성과 시간 엄수 중시');
    });

    test('종교적 고려사항 및 금식일', async ({ page, context }) => {
      await page.goto('/settings/religious-preferences');
      
      // Mock 종교 설정
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetReligiousCalendar') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                religiousEvents: [
                  {
                    name: '라마단 시작',
                    date: '2024-03-11',
                    religion: 'Islam',
                    type: 'fasting_period',
                    duration: 30,
                    restrictions: ['no_daytime_meetings', 'avoid_food_events']
                  },
                  {
                    name: '안식일',
                    date: '2024-02-03',
                    religion: 'Judaism',
                    type: 'weekly_observance',
                    timeRange: { start: 'Friday 18:00', end: 'Saturday 20:00' },
                    restrictions: ['no_work_meetings']
                  },
                  {
                    name: '부활절',
                    date: '2024-03-31',
                    religion: 'Christianity',
                    type: 'holiday',
                    restrictions: ['family_time_priority']
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 종교 설정
      await page.check('[data-testid="religion-islam"]');
      await page.check('[data-testid="religion-christianity"]');
      
      await page.goto('/calendar');
      
      // 종교적 이벤트 표시
      const religiousEvents = page.locator('[data-testid="religious-events"]');
      await expect(religiousEvents).toBeVisible();
      await expect(religiousEvents.locator('[data-testid="ramadan-indicator"]')).toBeVisible();
      
      // 회의 스케줄링 시 종교적 고려
      await page.locator('[data-testid="add-event-button"]').click();
      await page.fill('[data-testid="event-date"]', '2024-03-15'); // 라마단 기간
      
      const religiousWarning = page.locator('[data-testid="religious-warning"]');
      await expect(religiousWarning).toBeVisible();
      await expect(religiousWarning).toContainText('라마단 기간입니다');
      await expect(religiousWarning).toContainText('낮 시간 회의 피하기 권장');
      
      // 대안 시간 제안
      await expect(page.locator('[data-testid="suggested-time"]')).toContainText('19:30 (일몰 후) 권장');
      
      // 팀원의 종교적 배경 고려
      await page.locator('[data-testid="add-attendees"]').click();
      
      const attendeeList = page.locator('[data-testid="attendee-list"]');
      await expect(attendeeList.locator('[data-testid="muslim-attendee"]')).toHaveAttribute('data-fasting', 'true');
      await expect(attendeeList.locator('[data-testid="jewish-attendee"]')).toHaveAttribute('data-sabbath', 'observant');
    });

    test('국가별 비즈니스 에티켓', async ({ page, context }) => {
      await page.goto('/settings/business-etiquette');
      
      // 국가별 에티켓 설정
      await page.selectOption('[data-testid="business-culture"]', 'japan');
      
      await page.goto('/calendar/meeting-prep');
      
      // 일본 비즈니스 에티켓 가이드
      const etiquetteGuide = page.locator('[data-testid="etiquette-guide"]');
      await expect(etiquetteGuide).toBeVisible();
      await expect(etiquetteGuide).toContainText('명함 교환 프로토콜');
      await expect(etiquetteGuide).toContainText('회의 시작 전 5분 여유');
      await expect(etiquetteGuide).toContainText('서열에 따른 인사 순서');
      
      // 선물 문화 알림
      await expect(page.locator('[data-testid="gift-culture"]')).toContainText('작은 선물 준비 고려');
      
      // 미국 문화로 변경
      await page.goto('/settings/business-etiquette');
      await page.selectOption('[data-testid="business-culture"]', 'usa');
      
      await page.goto('/calendar/meeting-prep');
      
      // 미국 비즈니스 에티켓
      const usEtiquette = page.locator('[data-testid="etiquette-guide"]');
      await expect(usEtiquette).toContainText('직접적이고 간결한 소통');
      await expect(usEtiquette).toContainText('시간 엄수 중요');
      await expect(usEtiquette).toContainText('개인 성과 강조');
      
      // 독일 문화
      await page.goto('/settings/business-etiquette');
      await page.selectOption('[data-testid="business-culture"]', 'germany');
      
      await page.goto('/calendar/meeting-prep');
      
      const germanEtiquette = page.locator('[data-testid="etiquette-guide"]');
      await expect(germanEtiquette).toContainText('철저한 사전 준비');
      await expect(germanEtiquette).toContainText('정확성과 세부사항 중시');
      await expect(germanEtiquette).toContainText('형식적인 호칭 사용');
    });
  });

  test.describe('지역별 법정 공휴일', () => {
    test('다국가 공휴일 자동 인식', async ({ page, context }) => {
      await page.goto('/settings/holidays');
      
      // Mock 다국가 공휴일 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetHolidays') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                holidays: {
                  'KR': [
                    { name: '설날', date: '2024-02-10', type: 'national', duration: 3 },
                    { name: '어린이날', date: '2024-05-05', type: 'national', duration: 1 },
                    { name: '추석', date: '2024-09-17', type: 'national', duration: 3 }
                  ],
                  'US': [
                    { name: 'Presidents Day', date: '2024-02-19', type: 'federal', duration: 1 },
                    { name: 'Independence Day', date: '2024-07-04', type: 'federal', duration: 1 },
                    { name: 'Thanksgiving', date: '2024-11-28', type: 'federal', duration: 1 }
                  ],
                  'JP': [
                    { name: '建国記念の日', date: '2024-02-11', type: 'national', duration: 1 },
                    { name: 'ゴールデンウィーク', date: '2024-04-29', type: 'national', duration: 7 },
                    { name: '天皇誕生日', date: '2024-02-23', type: 'national', duration: 1 }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 국가별 공휴일 설정
      await page.check('[data-testid="country-kr"]');
      await page.check('[data-testid="country-us"]');
      await page.check('[data-testid="country-jp"]');
      
      await page.goto('/calendar');
      
      // 공휴일 표시
      const holidayMarkers = page.locator('[data-testid="holiday-markers"]');
      await expect(holidayMarkers).toBeVisible();
      
      // 각국 공휴일 구분 표시
      await expect(holidayMarkers.locator('[data-testid="holiday-kr-seollal"]')).toHaveClass(/korean-holiday/);
      await expect(holidayMarkers.locator('[data-testid="holiday-us-presidents"]')).toHaveClass(/us-holiday/);
      await expect(holidayMarkers.locator('[data-testid="holiday-jp-kenkoku"]')).toHaveClass(/japanese-holiday/);
      
      // 공휴일 충돌 회피
      await page.locator('[data-testid="add-event-button"]').click();
      await page.fill('[data-testid="event-date"]', '2024-02-10'); // 설날
      
      const holidayWarning = page.locator('[data-testid="holiday-warning"]');
      await expect(holidayWarning).toBeVisible();
      await expect(holidayWarning).toContainText('한국 설날입니다');
      await expect(holidayWarning).toContainText('3일간 연휴');
      
      // 글로벌 팀 고려 제안
      await expect(page.locator('[data-testid="global-consideration"]')).toContainText('미국/일본 팀원은 정상 근무일');
      
      // 대안 날짜 제안
      await expect(page.locator('[data-testid="alternative-dates"]')).toContainText('2월 13일 (모든 국가 근무일) 권장');
    });

    test('종교별 공휴일 관리', async ({ page, context }) => {
      await page.goto('/settings/religious-holidays');
      
      // Mock 종교 공휴일 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetReligiousHolidays') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                religiousHolidays: {
                  christian: [
                    { name: 'Easter', date: '2024-03-31', significance: 'high' },
                    { name: 'Christmas', date: '2024-12-25', significance: 'high' },
                    { name: 'Good Friday', date: '2024-03-29', significance: 'medium' }
                  ],
                  islamic: [
                    { name: 'Eid al-Fitr', date: '2024-04-10', significance: 'high' },
                    { name: 'Eid al-Adha', date: '2024-06-17', significance: 'high' },
                    { name: 'Mawlid al-Nabi', date: '2024-09-16', significance: 'medium' }
                  ],
                  jewish: [
                    { name: 'Passover', date: '2024-04-23', significance: 'high' },
                    { name: 'Rosh Hashanah', date: '2024-09-16', significance: 'high' },
                    { name: 'Yom Kippur', date: '2024-09-25', significance: 'high' }
                  ],
                  buddhist: [
                    { name: 'Buddha\'s Birthday', date: '2024-05-15', significance: 'high' },
                    { name: 'Vesak Day', date: '2024-05-23', significance: 'high' }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 종교별 공휴일 활성화
      await page.check('[data-testid="enable-christian-holidays"]');
      await page.check('[data-testid="enable-islamic-holidays"]');
      await page.check('[data-testid="enable-jewish-holidays"]');
      
      await page.goto('/calendar');
      
      // 종교별 공휴일 구분 표시
      const religiousHolidays = page.locator('[data-testid="religious-holidays"]');
      await expect(religiousHolidays.locator('[data-testid="easter"]')).toHaveClass(/christian/);
      await expect(religiousHolidays.locator('[data-testid="eid-fitr"]')).toHaveClass(/islamic/);
      await expect(religiousHolidays.locator('[data-testid="passover"]')).toHaveClass(/jewish/);
      
      // 다종교 팀 배려 알림
      await page.locator('[data-testid="add-event-button"]').click();
      await page.fill('[data-testid="event-date"]', '2024-04-10'); // Eid al-Fitr
      
      const multiReligiousAlert = page.locator('[data-testid="multi-religious-alert"]');
      await expect(multiReligiousAlert).toBeVisible();
      await expect(multiReligiousAlert).toContainText('이슬람 축제일 (Eid al-Fitr)');
      await expect(multiReligiousAlert).toContainText('무슬림 팀원 배려 필요');
      
      // 중요도 표시
      await expect(multiReligiousAlert.locator('[data-testid="significance-high"]')).toBeVisible();
      
      // 대체 일정 제안
      await expect(page.locator('[data-testid="alternative-suggestions"]')).toContainText('모든 종교 고려한 날짜: 4월 12일');
    });

    test('유연근무제 및 현지 관습 반영', async ({ page, context }) => {
      await page.goto('/settings/work-culture');
      
      // 지역별 근무 문화 설정
      await page.selectOption('[data-testid="regional-culture"]', 'spain');
      
      // 스페인 근무 문화 (시에스타 시간)
      await expect(page.locator('[data-testid="siesta-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="siesta-start"]')).toHaveValue('14:00');
      await expect(page.locator('[data-testid="siesta-end"]')).toHaveValue('16:00');
      
      await page.goto('/calendar');
      
      // 시에스타 시간 표시
      const siestaBlock = page.locator('[data-testid="siesta-block"]');
      await expect(siestaBlock).toBeVisible();
      await expect(siestaBlock).toHaveClass(/protected-time/);
      
      // 회의 스케줄링 시 시에스타 시간 피하기
      await page.locator('[data-testid="add-event-button"]').click();
      await page.fill('[data-testid="event-time"]', '15:00');
      
      const siestaWarning = page.locator('[data-testid="siesta-warning"]');
      await expect(siestaWarning).toBeVisible();
      await expect(siestaWarning).toContainText('시에스타 시간입니다');
      
      // 독일 근무 문화로 변경 (정시 퇴근 문화)
      await page.goto('/settings/work-culture');
      await page.selectOption('[data-testid="regional-culture"]', 'germany');
      
      await page.goto('/calendar');
      
      // 정시 퇴근 시간 보호
      const workEndProtection = page.locator('[data-testid="work-end-protection"]');
      await expect(workEndProtection).toBeVisible();
      await expect(workEndProtection).toContainText('17:00 이후 회의 제한');
      
      // 브라질 문화 (유연한 시간 관념)
      await page.goto('/settings/work-culture');
      await page.selectOption('[data-testid="regional-culture"]', 'brazil');
      
      await page.goto('/calendar');
      
      // 유연한 시간 설정
      await expect(page.locator('[data-testid="flexible-time-note"]')).toContainText('15분 여유 시간 자동 추가');
      await expect(page.locator('[data-testid="relationship-focus"]')).toContainText('관계 형성 시간 중시');
    });
  });
});