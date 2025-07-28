import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🎨 개인화 시나리오
 * 사용자별 맞춤형 경험과 적응형 인터페이스 테스트
 */

test.describe('👤 개인화 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('사용자 습관 학습', () => {
    test('일정 생성 패턴 학습 및 자동 제안', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 사용자의 과거 일정 패턴
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetUserPatterns') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                userPatterns: {
                  mostFrequentMeetingTimes: ['10:00', '14:00', '16:00'],
                  averageMeetingDuration: 60,
                  preferredMeetingDays: ['화', '목'],
                  commonAttendees: [
                    { email: 'kim@company.com', frequency: 0.8 },
                    { email: 'park@company.com', frequency: 0.6 }
                  ],
                  frequentLocations: ['회의실 A', '회의실 B', '온라인'],
                  titlePatterns: ['주간 리뷰', '1:1 미팅', '프로젝트 체크인']
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 새 일정 생성 시작
      await page.locator('[data-testid="add-event-button"]').click();
      
      // Then: 개인화된 기본값 제안
      await expect(page.locator('[data-testid="suggested-time"]')).toContainText('추천: 오전 10시');
      await expect(page.locator('[data-testid="suggested-duration"]')).toHaveValue('60');
      await expect(page.locator('[data-testid="suggested-attendees"]')).toContainText('자주 만나는 사람: 김팀장');
      
      // 제목 입력 시 자동완성
      await page.fill('[data-testid="event-title"]', '주간');
      await expect(page.locator('[data-testid="title-suggestion-1"]')).toContainText('주간 리뷰');
      
      // 스마트 시간 슬롯 추천
      await page.locator('[data-testid="show-time-suggestions"]').click();
      await expect(page.locator('[data-testid="time-slot-1"]')).toContainText('화요일 10:00 (선호 시간)');
      await expect(page.locator('[data-testid="time-slot-2"]')).toContainText('목요일 14:00 (비어있음)');
    });

    test('업무 스타일 분석 및 최적화', async ({ page, context }) => {
      await page.goto('/dashboard/insights');
      
      // Given: 사용자 업무 스타일 분석
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetWorkStyle') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                workStyle: {
                  type: 'morning_person',
                  peakProductivityHours: ['9:00-11:00', '14:00-16:00'],
                  meetingPreference: 'clustered', // 회의를 몰아서
                  focusTimeNeeded: 120, // 하루 2시간 집중 시간 필요
                  breakPattern: 'pomodoro',
                  collaborationStyle: 'async_preferred'
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Then: 개인화된 인사이트 표시
      const insights = page.locator('[data-testid="personalized-insights"]');
      await expect(insights).toBeVisible();
      await expect(insights).toContainText('당신은 아침형 인간입니다');
      await expect(insights).toContainText('오전 9-11시가 가장 생산적인 시간대예요');
      
      // 최적화 제안
      await expect(page.locator('[data-testid="optimization-1"]')).toContainText('회의를 오후에 몰아서 배치하면 오전 집중 시간 확보 가능');
      await expect(page.locator('[data-testid="optimization-2"]')).toContainText('25분 작업 + 5분 휴식 패턴 추천');
    });

    test('선호 언어 및 표현 스타일 적응', async ({ page, context }) => {
      // Given: 사용자가 이모지를 자주 사용
      await page.goto('/dashboard');
      
      // 여러 번 이모지가 포함된 일정 생성
      for (let i = 0; i < 3; i++) {
        await page.locator('[data-testid="quick-add-input"]').fill(`팀 미팅 🚀 ${i}`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
      }
      
      // When: 새 일정 생성
      await page.locator('[data-testid="add-event-button"]').click();
      
      // Then: 이모지 추천 활성화
      await expect(page.locator('[data-testid="emoji-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="frequent-emojis"]')).toContainText('🚀');
      
      // AI 응답도 이모지 포함
      await page.locator('[data-testid="ai-chat"]').click();
      await page.fill('[data-testid="chat-input"]', '오늘 일정 요약해줘');
      await page.keyboard.press('Enter');
      
      await expect(page.locator('[data-testid="ai-response"]')).toContainText('🚀');
    });
  });

  test.describe('개인 맞춤 추천', () => {
    test('컨텐츠 기반 일정 추천', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 사용자의 관심사와 활동 이력
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetPersonalizedRecommendations') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                recommendations: [
                  {
                    type: 'learning',
                    title: 'React 최신 기능 웨비나',
                    reason: '최근 React 관련 미팅이 많았어요',
                    suggestedTime: '금요일 16:00',
                    link: 'https://webinar.example.com'
                  },
                  {
                    type: 'wellness',
                    title: '스트레칭 시간',
                    reason: '3시간 연속 회의 후 휴식이 필요해요',
                    suggestedTime: '매일 15:00',
                    duration: 10
                  },
                  {
                    type: 'networking',
                    title: '김개발님과 커피 챗',
                    reason: '같은 프로젝트인데 아직 1:1 미팅이 없었어요',
                    suggestedTime: '다음주 화요일 15:00'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 추천 섹션 확인
      await page.locator('[data-testid="show-recommendations"]').click();
      
      // Then: 개인화된 추천 표시
      const recommendations = page.locator('[data-testid="recommendation-cards"]');
      await expect(recommendations.locator('.card')).toHaveCount(3);
      
      // 추천 이유 표시
      await expect(recommendations).toContainText('최근 React 관련 미팅이 많았어요');
      await expect(recommendations).toContainText('3시간 연속 회의 후 휴식이 필요해요');
      
      // 원클릭 추가
      await page.locator('[data-testid="add-recommendation-1"]').click();
      await expect(page.locator('[data-testid="event-added-toast"]')).toContainText('React 웨비나가 추가되었습니다');
    });

    test('스마트 일정 재조정 제안', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 비효율적인 일정 배치
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'AnalyzeScheduleEfficiency') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                scheduleAnalysis: {
                  inefficiencies: [
                    {
                      type: 'fragmented_focus_time',
                      description: '30분짜리 빈 시간이 3개 있어요',
                      impact: 'high'
                    },
                    {
                      type: 'back_to_back_meetings',
                      description: '연속 회의 사이 휴식 시간 없음',
                      impact: 'medium'
                    }
                  ],
                  optimization: {
                    before: {
                      focusTimeBlocks: 0,
                      totalMeetingTime: 300,
                      contextSwitches: 8
                    },
                    after: {
                      focusTimeBlocks: 2,
                      totalMeetingTime: 270,
                      contextSwitches: 4
                    },
                    changes: [
                      '오전 회의 2개를 오후로 이동',
                      '점심 후 2시간 집중 시간 확보',
                      '회의 사이 10분 버퍼 추가'
                    ]
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 일정 최적화 분석
      await page.locator('[data-testid="analyze-schedule"]').click();
      
      // Then: 개선 제안 표시
      const optimizationModal = page.locator('[data-testid="optimization-modal"]');
      await expect(optimizationModal).toBeVisible();
      await expect(optimizationModal).toContainText('일정을 더 효율적으로 만들 수 있어요');
      
      // Before/After 비교
      await expect(page.locator('[data-testid="focus-blocks-before"]')).toContainText('0개');
      await expect(page.locator('[data-testid="focus-blocks-after"]')).toContainText('2개');
      await expect(page.locator('[data-testid="context-switches-reduction"]')).toContainText('50% 감소');
      
      // 미리보기
      await page.locator('[data-testid="preview-optimization"]').click();
      await expect(page.locator('[data-testid="calendar-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="moved-events"]')).toHaveClass(/highlighted/);
    });

    test('개인별 알림 최적화', async ({ page, context }) => {
      await page.goto('/settings/notifications');
      
      // Given: 사용자의 알림 반응 패턴
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetNotificationPatterns') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                notificationPatterns: {
                  responseRate: {
                    '5min': 0.1,
                    '10min': 0.3,
                    '15min': 0.7,
                    '30min': 0.9
                  },
                  preferredChannels: ['push', 'email'],
                  quietHours: ['22:00-08:00', '12:00-13:00'],
                  importantSenders: ['ceo@company.com', 'team-lead@company.com']
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Then: 개인화된 알림 설정 제안
      await expect(page.locator('[data-testid="notification-insights"]')).toBeVisible();
      await expect(page.locator('[data-testid="insight-1"]')).toContainText('15분 전 알림에 가장 잘 반응하시네요');
      await expect(page.locator('[data-testid="insight-2"]')).toContainText('점심시간에는 알림을 끄시는 편이에요');
      
      // VIP 알림 설정
      await expect(page.locator('[data-testid="vip-notifications"]')).toBeVisible();
      await expect(page.locator('[data-testid="vip-list"]')).toContainText('CEO');
      
      // 자동 최적화 적용
      await page.locator('[data-testid="apply-smart-notifications"]').click();
      await expect(page.locator('[data-testid="notification-optimized"]')).toContainText('알림이 최적화되었습니다');
    });
  });

  test.describe('적응형 인터페이스', () => {
    test('사용 빈도에 따른 UI 재배치', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 기능별 사용 통계
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetFeatureUsage') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                featureUsage: {
                  mostUsed: ['quick-add', 'voice-input', 'ai-chat'],
                  leastUsed: ['export', 'print', 'archive'],
                  recentlyUsed: ['team-view', 'analytics'],
                  usageHeatmap: {
                    'add-button': { clicks: 45, position: { x: 100, y: 50 } },
                    'calendar-view': { clicks: 120, position: { x: 500, y: 300 } }
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Then: 자주 사용하는 기능 강조
      await expect(page.locator('[data-testid="quick-access-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-add-prominent"]')).toHaveClass(/featured/);
      await expect(page.locator('[data-testid="voice-input-prominent"]')).toHaveClass(/featured/);
      
      // 사용하지 않는 기능 숨김
      await expect(page.locator('[data-testid="export-button"]')).toHaveClass(/collapsed/);
      
      // 최근 사용 섹션
      await expect(page.locator('[data-testid="recent-features"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-1"]')).toContainText('팀 뷰');
    });

    test('개인별 대시보드 위젯 구성', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 사용자별 위젯 선호도
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetDashboardPreferences') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                dashboardConfig: {
                  layout: 'productivity_focused',
                  widgets: [
                    { id: 'today-focus', size: 'large', position: 1 },
                    { id: 'time-tracking', size: 'medium', position: 2 },
                    { id: 'quick-stats', size: 'small', position: 3 },
                    { id: 'ai-insights', size: 'medium', position: 4 }
                  ],
                  hiddenWidgets: ['weather', 'news'],
                  theme: 'minimal'
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Then: 개인화된 대시보드 레이아웃
      await expect(page.locator('[data-testid="widget-today-focus"]')).toHaveClass(/large/);
      await expect(page.locator('[data-testid="widget-today-focus"]')).toHaveAttribute('data-position', '1');
      
      // 숨겨진 위젯
      await expect(page.locator('[data-testid="widget-weather"]')).not.toBeVisible();
      
      // 위젯 추천
      await page.locator('[data-testid="customize-dashboard"]').click();
      await expect(page.locator('[data-testid="recommended-widgets"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommendation-reason"]')).toContainText('생산성에 집중하시는 분들이 좋아해요');
    });

    test('컨텍스트별 메뉴 개인화', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Given: 오전 시간대
      await page.evaluate(() => {
        const mockDate = new Date();
        mockDate.setHours(9, 0, 0, 0);
        window.__mockDate = mockDate;
      });
      
      // When: 우클릭 메뉴
      await page.locator('[data-testid="calendar-grid"]').click({ button: 'right' });
      
      // Then: 시간대별 맞춤 메뉴
      const contextMenu = page.locator('[data-testid="context-menu"]');
      await expect(contextMenu).toBeVisible();
      await expect(contextMenu.locator('[data-testid="menu-item-1"]')).toContainText('집중 시간 설정');
      await expect(contextMenu.locator('[data-testid="menu-item-2"]')).toContainText('오전 회의 추가');
      
      // Given: 점심 시간대
      await page.evaluate(() => {
        const mockDate = new Date();
        mockDate.setHours(12, 30, 0, 0);
        window.__mockDate = mockDate;
      });
      
      await page.locator('[data-testid="calendar-grid"]').click({ button: 'right' });
      
      // Then: 점심 관련 메뉴
      await expect(contextMenu.locator('[data-testid="menu-item-1"]')).toContainText('점심 약속 추가');
      await expect(contextMenu.locator('[data-testid="menu-item-2"]')).toContainText('주변 맛집 추천');
    });

    test('학습된 단축키 및 제스처', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 사용자가 자주 사용하는 단축키 패턴
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetShortcutUsage') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                shortcutPatterns: {
                  customShortcuts: [
                    { keys: 'cmd+shift+m', action: 'create_meeting', usage: 45 },
                    { keys: 'cmd+shift+t', action: 'create_task', usage: 38 }
                  ],
                  unusedShortcuts: ['cmd+p', 'cmd+b'],
                  suggestedShortcuts: [
                    { action: 'toggle_calendar_view', reason: '자주 뷰를 전환하시네요' }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // When: 단축키 도움말
      await page.keyboard.press('?');
      
      // Then: 개인화된 단축키 목록
      const shortcutModal = page.locator('[data-testid="shortcut-help"]');
      await expect(shortcutModal).toBeVisible();
      await expect(shortcutModal.locator('[data-testid="your-shortcuts"]')).toBeVisible();
      await expect(shortcutModal).toContainText('자주 사용하는 단축키');
      await expect(shortcutModal).toContainText('Cmd+Shift+M - 미팅 생성 (45회)');
      
      // 새 단축키 제안
      await expect(shortcutModal.locator('[data-testid="suggested-shortcuts"]')).toContainText('캘린더 뷰 전환 단축키를 설정해보세요');
    });
  });

  test.describe('감정 인식 및 웰빙', () => {
    test('스트레스 레벨 감지 및 대응', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 높은 업무 부하 감지
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetWellbeingMetrics') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                wellbeing: {
                  stressLevel: 'high',
                  indicators: [
                    '연속 4시간 회의',
                    '점심 시간 건너뜀',
                    '예정보다 2시간 초과 근무'
                  ],
                  recommendations: [
                    { type: 'break', message: '10분 휴식을 추천해요' },
                    { type: 'reschedule', message: '오후 회의 하나를 내일로 미루는 건 어때요?' },
                    { type: 'wellness', message: '짧은 명상이나 스트레칭 시간을 가져보세요' }
                  ]
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Then: 웰빙 알림 표시
      const wellbeingAlert = page.locator('[data-testid="wellbeing-alert"]');
      await expect(wellbeingAlert).toBeVisible();
      await expect(wellbeingAlert).toContainText('잠깐, 쉬어가세요!');
      await expect(wellbeingAlert).toHaveClass(/gentle-pulse/);
      
      // 구체적인 제안
      await page.locator('[data-testid="show-wellness-tips"]').click();
      await expect(page.locator('[data-testid="break-timer"]')).toBeVisible();
      await expect(page.locator('[data-testid="breathing-exercise"]')).toBeVisible();
      
      // 일정 자동 조정 제안
      await expect(page.locator('[data-testid="reschedule-suggestion"]')).toContainText('3시 회의를 내일로 미루면 여유가 생겨요');
    });

    test('긍정적 피드백과 동기부여', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Given: 목표 달성 상황
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetAchievements') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                achievements: {
                  today: [
                    { type: 'focus_time', message: '오늘 2시간 집중 시간 달성! 🎯' },
                    { type: 'meetings', message: '모든 회의를 시간 내에 마쳤어요 👏' }
                  ],
                  streak: {
                    type: 'workout',
                    days: 7,
                    message: '일주일 연속 운동! 대단해요 💪'
                  },
                  milestone: {
                    type: 'productivity',
                    message: '이번 달 생산성이 15% 향상되었어요 📈'
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Then: 축하 메시지와 애니메이션
      await page.locator('[data-testid="achievements-button"]').click();
      
      const achievementsModal = page.locator('[data-testid="achievements-modal"]');
      await expect(achievementsModal).toBeVisible();
      await expect(achievementsModal).toContainText('오늘의 성과');
      
      // 시각적 축하 효과
      await expect(page.locator('[data-testid="confetti-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="achievement-badge"]')).toHaveClass(/shine/);
      
      // 연속 기록
      await expect(page.locator('[data-testid="streak-counter"]')).toContainText('7일');
      await expect(page.locator('[data-testid="streak-fire"]')).toHaveClass(/burning/);
    });
  });
});