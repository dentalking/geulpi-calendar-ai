import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🧠 컨텍스트 인식 UX 시나리오
 * 사용자의 상황과 맥락을 이해하고 적응하는 지능형 캘린더 테스트
 */

test.describe('📍 컨텍스트 인식 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
    
    // 위치 권한 허용
    await context.grantPermissions(['geolocation']);
  });

  test.describe('위치 기반 스마트 알림', () => {
    test('사용자가 회의 장소에서 멀리 있을 때 이동 시간을 고려한 알림', async ({ page, context }) => {
      // Given: 사용자의 현재 위치 설정
      await context.setGeolocation({ latitude: 37.4979, longitude: 127.0276 }); // 강남역
      
      await page.goto('/dashboard');
      
      // 1시간 후 종로에서 미팅이 있는 상황
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetUpcomingEvents') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                upcomingEvents: [{
                  id: '1',
                  title: '클라이언트 미팅',
                  start: new Date(Date.now() + 3600000).toISOString(), // 1시간 후
                  location: '종로 스타벅스',
                  coordinates: { lat: 37.5729, lng: 126.9794 },
                  attendees: ['client@example.com']
                }]
              }
            })
          });
        } else {
          await route.continue();
        }
      });

      // When: 이동 시간 계산 및 알림
      await page.locator('[data-testid="smart-notifications"]').click();
      
      // Then: 이동 시간을 고려한 알림 표시
      const notification = page.locator('[data-testid="location-aware-notification"]');
      await expect(notification).toBeVisible();
      await expect(notification).toContainText('이동 시간 약 40분');
      await expect(notification).toContainText('20분 후 출발하세요');
      
      // 실시간 교통 정보 반영
      await expect(page.locator('[data-testid="traffic-info"]')).toContainText('현재 교통 상황: 보통');
    });

    test('회의 장소 근처에 있을 때 체크인 알림', async ({ page, context }) => {
      // Given: 회의 장소 근처 위치
      await context.setGeolocation({ latitude: 37.5729, longitude: 126.9794 }); // 종로
      
      await page.goto('/dashboard');
      
      // When: 회의 시작 10분 전
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('proximity-detected', {
          detail: { 
            eventId: '1',
            distance: 50, // 50m 거리
            minutesUntilStart: 10
          }
        }));
      });
      
      // Then: 체크인 알림 표시
      const checkInNotification = page.locator('[data-testid="check-in-notification"]');
      await expect(checkInNotification).toBeVisible();
      await expect(checkInNotification).toContainText('회의 장소 도착');
      await expect(checkInNotification).toContainText('체크인 하시겠어요?');
      
      // 체크인 버튼 클릭
      await page.locator('[data-testid="check-in-button"]').click();
      await expect(page.locator('[data-testid="check-in-success"]')).toContainText('체크인 완료');
    });

    test('재택/출근 모드 자동 전환', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 집 위치에서 접속
      await context.setGeolocation({ latitude: 37.5665, longitude: 126.9780 }); // 서울시청 (집으로 가정)
      
      // Then: 재택 모드 활성화
      await expect(page.locator('[data-testid="work-mode"]')).toContainText('재택 근무');
      await expect(page.locator('[data-testid="video-call-defaults"]')).toBeVisible();
      
      // When: 사무실로 이동
      await context.setGeolocation({ latitude: 37.5045, longitude: 127.0498 }); // 테헤란로 (사무실)
      await page.reload();
      
      // Then: 사무실 모드로 전환
      await expect(page.locator('[data-testid="work-mode"]')).toContainText('사무실 근무');
      await expect(page.locator('[data-testid="meeting-room-suggestions"]')).toBeVisible();
    });
  });

  test.describe('시간대별 자동 모드 전환', () => {
    test('업무 시간/개인 시간 자동 전환', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 오전 9시 (업무 시간)
      await page.evaluate(() => {
        const mockDate = new Date();
        mockDate.setHours(9, 0, 0, 0);
        window.__mockDate = mockDate;
      });
      
      // Then: 업무 모드 UI
      await expect(page.locator('[data-testid="time-mode"]')).toContainText('업무 시간');
      await expect(page.locator('[data-testid="focus-timer"]')).toBeVisible();
      await expect(page.locator('[data-testid="slack-status"]')).toContainText('업무 중');
      
      // When: 오후 6시 (퇴근 시간)
      await page.evaluate(() => {
        const mockDate = new Date();
        mockDate.setHours(18, 0, 0, 0);
        window.__mockDate = mockDate;
      });
      await page.reload();
      
      // Then: 개인 시간 모드
      await expect(page.locator('[data-testid="time-mode"]')).toContainText('개인 시간');
      await expect(page.locator('[data-testid="work-life-balance"]')).toBeVisible();
      await expect(page.locator('[data-testid="personal-suggestions"]')).toContainText('운동 시간');
    });

    test('점심 시간 자동 인식 및 추천', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 오전 11시 30분
      await page.evaluate(() => {
        const mockDate = new Date();
        mockDate.setHours(11, 30, 0, 0);
        window.__mockDate = mockDate;
      });
      
      // When: AI 추천 확인
      await page.locator('[data-testid="ai-suggestions"]').click();
      
      // Then: 점심 시간 추천
      const lunchSuggestion = page.locator('[data-testid="lunch-time-suggestion"]');
      await expect(lunchSuggestion).toBeVisible();
      await expect(lunchSuggestion).toContainText('12시-1시 점심 시간 확보');
      await expect(lunchSuggestion).toContainText('주변 맛집 추천');
      
      // 동료 점심 일정 표시
      await expect(page.locator('[data-testid="colleague-lunch-status"]')).toContainText('김팀장님도 12시 점심');
    });

    test('집중 시간대 자동 보호', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 오전 9-11시 (설정된 집중 시간)
      await page.evaluate(() => {
        const mockDate = new Date();
        mockDate.setHours(9, 30, 0, 0);
        window.__mockDate = mockDate;
      });
      
      // When: 새 미팅 요청 시도
      await page.locator('[data-testid="add-event-button"]').click();
      await page.fill('[data-testid="event-title"]', '긴급 미팅');
      await page.fill('[data-testid="event-time"]', '10:00');
      
      // Then: 집중 시간 보호 경고
      const focusWarning = page.locator('[data-testid="focus-time-warning"]');
      await expect(focusWarning).toBeVisible();
      await expect(focusWarning).toContainText('집중 시간대입니다');
      await expect(focusWarning).toContainText('정말 일정을 추가하시겠어요?');
      
      // 대안 시간 제안
      await expect(page.locator('[data-testid="alternative-slots"]')).toContainText('11:30 이후 추천');
    });
  });

  test.describe('참석자 프로필 기반 미팅 준비', () => {
    test('VIP 미팅 자동 준비 체크리스트', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: CEO와의 미팅 예정
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetEventDetails') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                event: {
                  id: '1',
                  title: '분기 리뷰',
                  attendees: [{
                    email: 'ceo@company.com',
                    name: '김대표',
                    profile: {
                      title: 'CEO',
                      isVIP: true,
                      preferences: {
                        communicationStyle: 'data-driven',
                        interests: ['ROI', 'Growth Metrics']
                      }
                    }
                  }],
                  start: new Date(Date.now() + 3600000).toISOString()
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 미팅 준비 도우미 활성화
      await page.locator('[data-testid="event-1"]').click();
      await page.locator('[data-testid="meeting-prep"]').click();
      
      // Then: VIP 맞춤 준비 사항
      const prepChecklist = page.locator('[data-testid="vip-prep-checklist"]');
      await expect(prepChecklist).toBeVisible();
      await expect(prepChecklist).toContainText('분기 실적 데이터 준비');
      await expect(prepChecklist).toContainText('ROI 분석 자료');
      await expect(prepChecklist).toContainText('성장 지표 대시보드');
      
      // 자동 자료 생성
      await expect(page.locator('[data-testid="auto-generate-deck"]')).toBeVisible();
      await expect(page.locator('[data-testid="estimated-prep-time"]')).toContainText('예상 준비 시간: 45분');
    });

    test('팀원 생일/기념일 인식 및 축하', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 팀원 생일인 날
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetTeamEvents') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                teamEvents: [{
                  type: 'birthday',
                  person: {
                    name: '박차장',
                    email: 'park@company.com',
                    team: '개발팀'
                  },
                  date: new Date().toISOString()
                }]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Then: 생일 알림 배너
      const birthdayBanner = page.locator('[data-testid="birthday-banner"]');
      await expect(birthdayBanner).toBeVisible();
      await expect(birthdayBanner).toContainText('오늘은 박차장님의 생일입니다! 🎉');
      
      // 축하 메시지 빠른 전송
      await page.locator('[data-testid="send-birthday-wish"]').click();
      await expect(page.locator('[data-testid="wish-sent"]')).toContainText('축하 메시지 전송 완료');
    });

    test('신규 참석자 프로필 자동 브리핑', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 처음 만나는 외부 참석자와의 미팅
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetMeetingBrief') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                meetingBrief: {
                  firstTimeAttendees: [{
                    name: 'John Smith',
                    company: 'Tech Startup Inc.',
                    linkedIn: 'linkedin.com/in/johnsmith',
                    recentNews: '시리즈 A 투자 유치 성공',
                    commonConnections: ['김이사', '박부장'],
                    suggestedTalkingPoints: [
                      '최근 투자 유치 축하',
                      '공통 지인 김이사님 언급',
                      '우리 제품과의 시너지'
                    ]
                  }]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 미팅 30분 전
      await page.locator('[data-testid="upcoming-meeting"]').click();
      
      // Then: 참석자 브리핑 표시
      const attendeeBrief = page.locator('[data-testid="attendee-brief"]');
      await expect(attendeeBrief).toBeVisible();
      await expect(attendeeBrief).toContainText('John Smith - Tech Startup Inc.');
      await expect(attendeeBrief).toContainText('시리즈 A 투자 유치 성공');
      
      // 대화 주제 추천
      await expect(page.locator('[data-testid="talking-points"]')).toContainText('추천 대화 주제');
      await expect(page.locator('[data-testid="common-connections"]')).toContainText('공통 지인: 김이사');
    });
  });

  test.describe('환경/기기별 적응형 UI', () => {
    test('배터리 부족 시 절전 모드', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 배터리 20% 이하
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'getBattery', {
          value: () => Promise.resolve({
            level: 0.15,
            charging: false
          })
        });
      });
      
      // When: 페이지 새로고침
      await page.reload();
      
      // Then: 절전 모드 UI
      await expect(page.locator('[data-testid="power-save-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="reduced-animations"]')).toHaveAttribute('data-enabled', 'true');
      await expect(page.locator('[data-testid="sync-frequency"]')).toContainText('동기화 주기: 30분');
    });

    test('네트워크 상태별 최적화', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 느린 3G 네트워크
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'connection', {
          value: {
            effectiveType: '3g',
            downlink: 0.4
          }
        });
      });
      
      // When: 이미지 많은 콘텐츠 로드
      await page.locator('[data-testid="team-photos"]').click();
      
      // Then: 저화질 이미지 및 지연 로딩
      await expect(page.locator('[data-testid="low-quality-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="image-quality"]')).toHaveAttribute('data-quality', 'low');
      await expect(page.locator('[data-testid="lazy-load-enabled"]')).toBeTruthy();
    });

    test('화면 크기별 정보 밀도 조절', async ({ page }) => {
      // Given: 대형 모니터
      await page.setViewportSize({ width: 2560, height: 1440 });
      await page.goto('/dashboard');
      
      // Then: 고밀도 정보 표시
      await expect(page.locator('[data-testid="calendar-view"]')).toHaveAttribute('data-density', 'high');
      await expect(page.locator('[data-testid="sidebar-expanded"]')).toBeVisible();
      await expect(page.locator('[data-testid="multi-column-layout"]')).toBeVisible();
      
      // When: 작은 노트북 화면
      await page.setViewportSize({ width: 1366, height: 768 });
      
      // Then: 중간 밀도
      await expect(page.locator('[data-testid="calendar-view"]')).toHaveAttribute('data-density', 'medium');
      await expect(page.locator('[data-testid="sidebar-collapsed"]')).toBeVisible();
    });
  });

  test.describe('활동 패턴 학습 및 예측', () => {
    test('반복 패턴 감지 및 자동 제안', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 매주 수요일 팀 미팅 패턴
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'DetectPatterns') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                detectedPatterns: [{
                  type: 'recurring_meeting',
                  pattern: 'weekly_wednesday_10am',
                  confidence: 0.95,
                  suggestion: '매주 수요일 10시 팀 미팅을 반복 일정으로 설정할까요?',
                  historicalData: [
                    { date: '2024-01-03', title: '팀 미팅' },
                    { date: '2024-01-10', title: '팀 미팅' },
                    { date: '2024-01-17', title: '팀 미팅' }
                  ]
                }]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 패턴 분석 실행
      await page.locator('[data-testid="analyze-patterns"]').click();
      
      // Then: 패턴 감지 알림
      const patternSuggestion = page.locator('[data-testid="pattern-suggestion"]');
      await expect(patternSuggestion).toBeVisible();
      await expect(patternSuggestion).toContainText('반복 패턴 감지');
      await expect(patternSuggestion).toContainText('매주 수요일 10시 팀 미팅');
      
      // 원클릭 반복 설정
      await page.locator('[data-testid="accept-pattern"]').click();
      await expect(page.locator('[data-testid="recurring-created"]')).toContainText('반복 일정 생성 완료');
    });

    test('업무 부하 예측 및 균형 조정', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 다음 주 업무 부하 분석
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'PredictWorkload') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                workloadPrediction: {
                  nextWeek: {
                    monday: { load: 95, hours: 11 },
                    tuesday: { load: 90, hours: 10 },
                    wednesday: { load: 70, hours: 8 },
                    thursday: { load: 60, hours: 7 },
                    friday: { load: 85, hours: 9 }
                  },
                  suggestions: [
                    '월요일과 화요일의 업무가 과도합니다',
                    '수요일로 일부 업무 이동을 추천합니다',
                    '목요일 오후가 집중 작업에 최적입니다'
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 주간 업무 분석
      await page.locator('[data-testid="weekly-analysis"]').click();
      
      // Then: 부하 예측 차트
      const workloadChart = page.locator('[data-testid="workload-chart"]');
      await expect(workloadChart).toBeVisible();
      await expect(page.locator('[data-testid="monday-overload"]')).toHaveClass(/warning/);
      await expect(page.locator('[data-testid="thursday-optimal"]')).toHaveClass(/success/);
      
      // 자동 재조정 제안
      await page.locator('[data-testid="auto-balance"]').click();
      await expect(page.locator('[data-testid="rebalance-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="rebalance-result"]')).toContainText('2개 미팅을 수요일로 이동');
    });
  });
});