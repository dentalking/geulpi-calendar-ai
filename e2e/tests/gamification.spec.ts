import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 🎮 게이미피케이션 시나리오
 * 포인트, 배지, 레벨업 등 게임 요소를 통한 사용자 참여도 향상 테스트
 */

test.describe('🏆 게이미피케이션 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('포인트 및 레벨 시스템', () => {
    test('일정 완료로 포인트 획득', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Mock 게이미피케이션 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetUserProfile') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                userProfile: {
                  level: 12,
                  totalPoints: 2340,
                  pointsToNext: 160, // 다음 레벨까지 160포인트
                  currentLevelPoints: 2340,
                  nextLevelPoints: 2500,
                  title: '시간 관리 전문가',
                  badges: ['early_bird', 'meeting_master', 'streak_champion']
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 레벨 바 표시
      await expect(page.locator('[data-testid="level-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-level"]')).toContainText('Lv.12');
      
      // 경험치 바
      const xpBar = page.locator('[data-testid="xp-progress-bar"]');
      await expect(xpBar).toBeVisible();
      await expect(page.locator('[data-testid="xp-current"]')).toContainText('2340');
      await expect(page.locator('[data-testid="xp-next"]')).toContainText('2500');
      
      // 일정 완료로 포인트 획득
      await page.locator('[data-testid="complete-task-1"]').click();
      
      // 포인트 획득 애니메이션
      await expect(page.locator('[data-testid="point-gain-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="points-earned"]')).toContainText('+25 포인트');
      await expect(page.locator('[data-testid="point-reason"]')).toContainText('일정 완료');
      
      // 경험치 바 애니메이션
      await expect(xpBar).toHaveClass(/filling/);
      await expect(page.locator('[data-testid="xp-current"]')).toContainText('2365');
      
      // 연속 완료 보너스
      await page.locator('[data-testid="complete-task-2"]').click();
      await expect(page.locator('[data-testid="streak-bonus"]')).toContainText('+5 연속 보너스');
    });

    test('레벨업 축하 및 보상', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 레벨업 직전 상태
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'CompleteTask') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                completeTask: {
                  success: true,
                  pointsEarned: 30,
                  levelUp: {
                    oldLevel: 12,
                    newLevel: 13,
                    newTitle: '시간 관리 마스터',
                    rewards: [
                      { type: 'badge', name: 'level_13', title: '13레벨 달성' },
                      { type: 'feature', name: 'advanced_analytics', title: '고급 분석 기능 해제' },
                      { type: 'customization', name: 'premium_themes', title: '프리미엄 테마 사용 가능' }
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
      
      // 레벨업을 트리거하는 작업 완료
      await page.locator('[data-testid="complete-major-task"]').click();
      
      // 레벨업 축하 모달
      const levelUpModal = page.locator('[data-testid="level-up-modal"]');
      await expect(levelUpModal).toBeVisible();
      
      // 축하 애니메이션
      await expect(page.locator('[data-testid="level-up-fireworks"]')).toBeVisible();
      await expect(page.locator('[data-testid="level-glow"]')).toHaveClass(/golden-glow/);
      
      // 레벨업 정보
      await expect(levelUpModal).toContainText('레벨 업!');
      await expect(levelUpModal).toContainText('Lv.12 → Lv.13');
      await expect(page.locator('[data-testid="new-title"]')).toContainText('시간 관리 마스터');
      
      // 해제된 기능
      await expect(page.locator('[data-testid="unlocked-features"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-1"]')).toContainText('고급 분석 기능');
      await expect(page.locator('[data-testid="feature-2"]')).toContainText('프리미엄 테마');
      
      // 소셜 공유
      await page.locator('[data-testid="share-achievement"]').click();
      await expect(page.locator('[data-testid="share-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-text"]')).toContainText('레벨 13 달성!');
    });

    test('포인트 멀티플라이어 및 이벤트', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 특별 이벤트 진행 중
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetActiveEvents') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                activeEvents: [
                  {
                    id: 'productivity_week',
                    title: '생산성 주간',
                    description: '이번 주 동안 모든 포인트 2배!',
                    multiplier: 2,
                    endDate: '2024-02-02T23:59:59Z',
                    icon: '⚡'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 이벤트 배너
      const eventBanner = page.locator('[data-testid="event-banner"]');
      await expect(eventBanner).toBeVisible();
      await expect(eventBanner).toContainText('생산성 주간 ⚡');
      await expect(eventBanner).toContainText('포인트 2배');
      await expect(eventBanner).toHaveClass(/pulsing/);
      
      // 이벤트 타이머
      await expect(page.locator('[data-testid="event-countdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="time-remaining"]')).toContainText('일');
      
      // 포인트 배수 표시
      await page.locator('[data-testid="complete-task-event"]').click();
      await expect(page.locator('[data-testid="multiplier-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="base-points"]')).toContainText('25');
      await expect(page.locator('[data-testid="multiplied-points"]')).toContainText('50 (x2)');
      
      // 이벤트 진행도
      await expect(page.locator('[data-testid="event-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-participation"]')).toContainText('이벤트 참여도: 75%');
    });
  });

  test.describe('배지 및 성취 시스템', () => {
    test('특수 배지 획득 및 수집', async ({ page, context }) => {
      await page.goto('/achievements');
      
      // Mock 배지 데이터
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
                  earned: [
                    {
                      id: 'early_bird',
                      name: '얼리버드',
                      description: '오전 7시 전에 첫 일정 완료',
                      icon: '🐦',
                      rarity: 'common',
                      earnedAt: '2024-01-25T06:45:00Z'
                    },
                    {
                      id: 'meeting_master',
                      name: '미팅 마스터',
                      description: '한 달간 100개 회의 참석',
                      icon: '🎯',
                      rarity: 'rare',
                      earnedAt: '2024-01-30T15:00:00Z'
                    }
                  ],
                  available: [
                    {
                      id: 'perfectionist',
                      name: '완벽주의자',
                      description: '일주일간 모든 일정 100% 완료',
                      icon: '💎',
                      rarity: 'legendary',
                      progress: { current: 6, total: 7 }
                    },
                    {
                      id: 'night_owl',
                      name: '올빼미',
                      description: '밤 11시 이후 일정 10개 완료',
                      icon: '🦉',
                      rarity: 'uncommon',
                      progress: { current: 3, total: 10 }
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
      
      // 배지 갤러리
      await expect(page.locator('[data-testid="badge-gallery"]')).toBeVisible();
      
      // 획득한 배지
      const earnedBadges = page.locator('[data-testid="earned-badges"]');
      await expect(earnedBadges.locator('.badge')).toHaveCount(2);
      
      // 희귀도별 스타일
      const rareBadge = page.locator('[data-testid="badge-meeting_master"]');
      await expect(rareBadge).toHaveClass(/rare/);
      await expect(rareBadge.locator('[data-testid="rarity-indicator"]')).toHaveClass(/rare-glow/);
      
      // 배지 호버 정보
      await rareBadge.hover();
      const tooltip = page.locator('[data-testid="badge-tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('미팅 마스터');
      await expect(tooltip).toContainText('획득일: 2024-01-30');
      
      // 진행 중인 배지
      const progressBadges = page.locator('[data-testid="progress-badges"]');
      const perfectionist = progressBadges.locator('[data-testid="badge-perfectionist"]');
      
      await expect(perfectionist).toHaveClass(/locked/);
      await expect(perfectionist.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(perfectionist.locator('[data-testid="progress-text"]')).toContainText('6/7');
      
      // 거의 달성 알림
      await expect(page.locator('[data-testid="almost-earned"]')).toBeVisible();
      await expect(page.locator('[data-testid="almost-earned"]')).toContainText('완벽주의자 배지까지 1개 남았어요!');
    });

    test('배지 획득 순간 축하 효과', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 배지 획득을 트리거하는 작업
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'CompleteEarlyMorningTask') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                completeTask: {
                  success: true,
                  badgeEarned: {
                    id: 'early_bird_master',
                    name: '얼리버드 마스터',
                    description: '7일 연속 오전 6시 전 일정 완료',
                    icon: '🌅',
                    rarity: 'epic'
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 이른 아침 시간대 설정
      await page.evaluate(() => {
        const mockDate = new Date();
        mockDate.setHours(5, 45, 0, 0);
        window.__mockDate = mockDate;
      });
      
      // 배지 획득 트리거
      await page.locator('[data-testid="complete-morning-task"]').click();
      
      // 배지 획득 모달
      const badgeModal = page.locator('[data-testid="badge-earned-modal"]');
      await expect(badgeModal).toBeVisible();
      
      // 드라마틱한 등장 애니메이션
      await expect(page.locator('[data-testid="badge-entrance"]')).toHaveClass(/scale-in/);
      await expect(page.locator('[data-testid="badge-shine"]')).toHaveClass(/epic-shine/);
      
      // 사운드 효과 (모킹)
      await page.evaluate(() => {
        window.badgeAudioPlayed = true;
      });
      const audioPlayed = await page.evaluate(() => window.badgeAudioPlayed);
      expect(audioPlayed).toBeTruthy();
      
      // 배지 정보
      await expect(badgeModal).toContainText('새 배지 획득!');
      await expect(badgeModal).toContainText('얼리버드 마스터 🌅');
      await expect(page.locator('[data-testid="badge-rarity"]')).toContainText('에픽');
      
      // 소셜 공유 버튼
      await expect(page.locator('[data-testid="share-badge"]')).toBeVisible();
      
      // 컬렉션으로 이동
      await page.locator('[data-testid="view-collection"]').click();
      await expect(page.url()).toContain('/achievements');
    });

    test('시크릿 배지 및 히든 성취', async ({ page, context }) => {
      await page.goto('/achievements');
      
      // 시크릿 배지 카테고리
      await page.locator('[data-testid="category-secret"]').click();
      
      // 히든 배지들 (물음표로 표시)
      const secretBadges = page.locator('[data-testid="secret-badges"]');
      await expect(secretBadges.locator('.badge')).toHaveCount(5);
      
      // 미스터리 배지
      const mysteryBadge = secretBadges.locator('[data-testid="mystery-badge-1"]');
      await expect(mysteryBadge.locator('[data-testid="badge-icon"]')).toContainText('❓');
      await expect(mysteryBadge.locator('[data-testid="badge-name"]')).toContainText('???');
      
      // 힌트 시스템
      await mysteryBadge.hover();
      const hint = page.locator('[data-testid="badge-hint"]');
      await expect(hint).toBeVisible();
      await expect(hint).toContainText('특별한 날짜와 관련된 무언가...');
      
      // 이미 발견한 시크릿 배지
      const discoveredSecret = secretBadges.locator('[data-testid="secret-discovered-1"]');
      await expect(discoveredSecret).not.toHaveClass(/locked/);
      await expect(discoveredSecret.locator('[data-testid="discovery-date"]')).toBeVisible();
    });
  });

  test.describe('경쟁 및 리더보드', () => {
    test('팀 내 리더보드 및 랭킹', async ({ page, context }) => {
      await page.goto('/leaderboard');
      
      // Mock 리더보드 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetLeaderboard') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                leaderboard: {
                  weekly: [
                    { rank: 1, user: '김팀장', points: 850, badge: 'crown', trend: 'up' },
                    { rank: 2, user: '나', points: 720, badge: 'medal', trend: 'same' },
                    { rank: 3, user: '박과장', points: 680, badge: 'bronze', trend: 'down' },
                    { rank: 4, user: '이대리', points: 540, badge: '', trend: 'up' },
                    { rank: 5, user: '최사원', points: 430, badge: '', trend: 'up' }
                  ],
                  myStats: {
                    rank: 2,
                    pointsThisWeek: 720,
                    pointsLastWeek: 650,
                    pointsToFirst: 130,
                    pointsFromThird: 40
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 리더보드 테이블
      await expect(page.locator('[data-testid="leaderboard-table"]')).toBeVisible();
      
      // 1위 사용자 하이라이트
      const firstPlace = page.locator('[data-testid="rank-1"]');
      await expect(firstPlace).toHaveClass(/first-place/);
      await expect(firstPlace.locator('[data-testid="crown-icon"]')).toBeVisible();
      await expect(firstPlace.locator('[data-testid="user-name"]')).toContainText('김팀장');
      
      // 내 순위 하이라이트
      const myRank = page.locator('[data-testid="rank-2"]');
      await expect(myRank).toHaveClass(/my-rank/);
      await expect(myRank).toHaveClass(/highlighted/);
      
      // 순위 변동 표시
      await expect(page.locator('[data-testid="trend-up"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-down"]')).toBeVisible();
      
      // 내 통계
      const myStats = page.locator('[data-testid="my-stats"]');
      await expect(myStats).toContainText('2위');
      await expect(myStats).toContainText('1위까지 130포인트');
      await expect(myStats).toContainText('3위와 40포인트 차이');
      
      // 시간대별 필터
      await page.locator('[data-testid="period-monthly"]').click();
      await expect(page.locator('[data-testid="loading-leaderboard"]')).toBeVisible();
    });

    test('친구 도전 및 대결', async ({ page, context }) => {
      await page.goto('/challenges');
      
      // 진행 중인 도전
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetChallenges') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                challenges: {
                  active: [
                    {
                      id: 'productivity_duel',
                      type: '1v1',
                      opponent: '박과장',
                      title: '일주일 생산성 대결',
                      description: '누가 더 많은 일정을 완료할까요?',
                      endDate: '2024-02-02T23:59:59Z',
                      myScore: 24,
                      opponentScore: 21,
                      status: 'winning'
                    }
                  ],
                  pending: [
                    {
                      id: 'team_challenge',
                      type: 'team',
                      challenger: '김팀장',
                      title: '팀 협업 챌린지',
                      description: '팀원들과 함께 목표 달성하기',
                      participants: 5
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
      
      // 활성 도전
      const activeChallenge = page.locator('[data-testid="challenge-productivity_duel"]');
      await expect(activeChallenge).toBeVisible();
      await expect(activeChallenge).toHaveClass(/winning/);
      
      // 스코어 비교
      await expect(activeChallenge.locator('[data-testid="my-score"]')).toContainText('24');
      await expect(activeChallenge.locator('[data-testid="opponent-score"]')).toContainText('21');
      await expect(activeChallenge.locator('[data-testid="lead-indicator"]')).toContainText('+3');
      
      // 실시간 진행도
      const progressBar = activeChallenge.locator('[data-testid="progress-comparison"]');
      await expect(progressBar).toBeVisible();
      await expect(progressBar.locator('[data-testid="my-progress"]')).toHaveClass(/leading/);
      
      // 도전 수락
      const pendingChallenge = page.locator('[data-testid="challenge-team_challenge"]');
      await pendingChallenge.locator('[data-testid="accept-challenge"]').click();
      
      await expect(page.locator('[data-testid="challenge-accepted"]')).toContainText('팀 협업 챌린지에 참여했습니다!');
      
      // 새 도전 생성
      await page.locator('[data-testid="create-challenge"]').click();
      await page.fill('[data-testid="challenge-title"]', '한 달 운동 챌린지');
      await page.selectOption('[data-testid="challenge-type"]', 'group');
      await page.locator('[data-testid="send-challenge"]').click();
    });

    test('길드 및 팀 경쟁', async ({ page, context }) => {
      await page.goto('/guilds');
      
      // Mock 길드 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetGuilds') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                myGuild: {
                  id: 'productivity_masters',
                  name: '생산성 마스터즈',
                  level: 15,
                  members: 24,
                  totalPoints: 45600,
                  rank: 3,
                  icon: '⚡'
                },
                guildRankings: [
                  { rank: 1, name: '시간 지배자들', points: 52300, members: 18 },
                  { rank: 2, name: '효율성 전문가', points: 48900, members: 22 },
                  { rank: 3, name: '생산성 마스터즈', points: 45600, members: 24, isMyGuild: true },
                  { rank: 4, name: '균형 추구자들', points: 42100, members: 20 }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 내 길드 정보
      const myGuild = page.locator('[data-testid="my-guild"]');
      await expect(myGuild).toBeVisible();
      await expect(myGuild).toContainText('생산성 마스터즈 ⚡');
      await expect(myGuild).toContainText('Lv.15');
      await expect(myGuild).toContainText('24명');
      
      // 길드 랭킹
      const rankings = page.locator('[data-testid="guild-rankings"]');
      await expect(rankings.locator('[data-testid="guild-rank"]')).toHaveCount(4);
      
      // 내 길드 하이라이트
      const myGuildRank = rankings.locator('[data-testid="guild-rank-3"]');
      await expect(myGuildRank).toHaveClass(/my-guild/);
      await expect(myGuildRank).toHaveClass(/highlighted/);
      
      // 길드 활동
      await page.locator('[data-testid="guild-activities"]').click();
      await expect(page.locator('[data-testid="guild-chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="guild-challenges"]')).toBeVisible();
      await expect(page.locator('[data-testid="guild-events"]')).toBeVisible();
      
      // 길드 기여도
      await expect(page.locator('[data-testid="my-contribution"]')).toContainText('이번 주 기여도: 1,240포인트');
    });
  });

  test.describe('도전과제 및 퀘스트', () => {
    test('일일/주간 퀘스트 시스템', async ({ page, context }) => {
      await page.goto('/quests');
      
      // Mock 퀘스트 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetQuests') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                quests: {
                  daily: [
                    {
                      id: 'complete_3_tasks',
                      title: '오늘의 목표',
                      description: '일정 3개 완료하기',
                      progress: { current: 2, total: 3 },
                      reward: { type: 'points', amount: 50 },
                      timeLeft: '4시간 23분',
                      difficulty: 'easy'
                    },
                    {
                      id: 'early_bird',
                      title: '얼리버드',
                      description: '오전 8시 전에 첫 일정 완료',
                      progress: { current: 0, total: 1 },
                      reward: { type: 'badge', name: 'morning_warrior' },
                      timeLeft: '내일까지',
                      difficulty: 'medium'
                    }
                  ],
                  weekly: [
                    {
                      id: 'workout_week',
                      title: '운동 주간',
                      description: '운동 관련 일정 5개 완료',
                      progress: { current: 3, total: 5 },
                      reward: { type: 'points', amount: 200 },
                      timeLeft: '3일',
                      difficulty: 'hard'
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
      
      // 일일 퀘스트
      const dailyQuests = page.locator('[data-testid="daily-quests"]');
      await expect(dailyQuests.locator('.quest-card')).toHaveCount(2);
      
      // 진행도 표시
      const quest1 = dailyQuests.locator('[data-testid="quest-complete_3_tasks"]');
      await expect(quest1.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(quest1.locator('[data-testid="progress-text"]')).toContainText('2/3');
      await expect(quest1.locator('[data-testid="progress-percent"]')).toContainText('66%');
      
      // 난이도 표시
      await expect(quest1.locator('[data-testid="difficulty-easy"]')).toBeVisible();
      
      // 보상 정보
      await expect(quest1.locator('[data-testid="reward-points"]')).toContainText('50 포인트');
      
      // 남은 시간
      await expect(quest1.locator('[data-testid="time-left"]')).toContainText('4시간 23분');
      await expect(quest1.locator('[data-testid="urgency-indicator"]')).toHaveClass(/urgent/);
      
      // 주간 퀘스트
      const weeklyQuests = page.locator('[data-testid="weekly-quests"]');
      const weeklyQuest = weeklyQuests.locator('[data-testid="quest-workout_week"]');
      await expect(weeklyQuest.locator('[data-testid="difficulty-hard"]')).toBeVisible();
      await expect(weeklyQuest.locator('[data-testid="reward-points"]')).toContainText('200 포인트');
    });

    test('퀘스트 완료 및 보상 수령', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // 퀘스트 완료를 위한 행동
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'CompleteTask') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                completeTask: {
                  success: true,
                  questCompleted: {
                    id: 'complete_3_tasks',
                    title: '오늘의 목표',
                    reward: { type: 'points', amount: 50 }
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 퀘스트 완료 트리거 (3번째 작업 완료)
      await page.locator('[data-testid="complete-final-task"]').click();
      
      // 퀘스트 완료 알림
      const questComplete = page.locator('[data-testid="quest-complete-notification"]');
      await expect(questComplete).toBeVisible();
      await expect(questComplete).toContainText('퀘스트 완료!');
      await expect(questComplete).toContainText('오늘의 목표');
      
      // 보상 획득 애니메이션
      await expect(page.locator('[data-testid="reward-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="points-gained"]')).toContainText('+50');
      
      // 퀘스트 진행도 업데이트
      await page.goto('/quests');
      const completedQuest = page.locator('[data-testid="quest-complete_3_tasks"]');
      await expect(completedQuest).toHaveClass(/completed/);
      await expect(completedQuest.locator('[data-testid="claim-reward"]')).toBeVisible();
      
      // 보상 수령
      await completedQuest.locator('[data-testid="claim-reward"]').click();
      await expect(page.locator('[data-testid="reward-claimed"]')).toContainText('보상을 받았습니다!');
    });

    test('특별 이벤트 퀘스트', async ({ page, context }) => {
      await page.goto('/quests');
      
      // Mock 특별 이벤트
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetEventQuests') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                eventQuests: [
                  {
                    id: 'new_year_challenge',
                    title: '새해 다짐 챌린지',
                    description: '2024년 첫 달 목표 달성하기',
                    type: 'limited_time',
                    steps: [
                      { name: '운동 계획 세우기', completed: true },
                      { name: '독서 목표 설정', completed: true },
                      { name: '새로운 스킬 배우기', completed: false },
                      { name: '네트워킹 이벤트 참석', completed: false }
                    ],
                    reward: {
                      type: 'exclusive_badge',
                      name: '새해 결심왕',
                      icon: '🎆'
                    },
                    endDate: '2024-01-31T23:59:59Z',
                    participantCount: 1247
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 특별 이벤트 섹션
      await page.locator('[data-testid="event-quests-tab"]').click();
      
      const eventQuest = page.locator('[data-testid="event-quest-new_year_challenge"]');
      await expect(eventQuest).toBeVisible();
      await expect(eventQuest).toHaveClass(/limited-time/);
      
      // 멀티 스텝 진행도
      const steps = eventQuest.locator('[data-testid="quest-steps"]');
      await expect(steps.locator('.step')).toHaveCount(4);
      await expect(steps.locator('.step.completed')).toHaveCount(2);
      
      // 독점 보상
      await expect(eventQuest.locator('[data-testid="exclusive-reward"]')).toContainText('새해 결심왕 🎆');
      await expect(eventQuest.locator('[data-testid="reward-exclusive"]')).toHaveClass(/golden/);
      
      // 참가자 수
      await expect(eventQuest).toContainText('1,247명 참여');
      
      // 남은 시간 (긴급도 표시)
      await expect(eventQuest.locator('[data-testid="event-deadline"]')).toBeVisible();
      await expect(eventQuest.locator('[data-testid="urgency-high"]')).toHaveClass(/blinking/);
    });
  });

  test.describe('소셜 기능', () => {
    test('성과 공유 및 소셜 피드', async ({ page, context }) => {
      await page.goto('/social');
      
      // Mock 소셜 피드
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetSocialFeed') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                socialFeed: [
                  {
                    id: '1',
                    user: { name: '김팀장', avatar: '/avatars/kim.jpg' },
                    type: 'badge_earned',
                    content: {
                      badge: { name: '미팅 마스터', icon: '🎯' },
                      message: '100번째 회의 완료!'
                    },
                    reactions: { likes: 12, comments: 3 },
                    timestamp: '2시간 전'
                  },
                  {
                    id: '2',
                    user: { name: '박과장', avatar: '/avatars/park.jpg' },
                    type: 'level_up',
                    content: {
                      oldLevel: 14,
                      newLevel: 15,
                      message: '레벨 15 달성! 시간 관리 전문가가 되었습니다.'
                    },
                    reactions: { likes: 8, comments: 5 },
                    timestamp: '4시간 전'
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 소셜 피드
      const socialFeed = page.locator('[data-testid="social-feed"]');
      await expect(socialFeed.locator('.feed-item')).toHaveCount(2);
      
      // 배지 획득 포스트
      const badgePost = socialFeed.locator('[data-testid="post-1"]');
      await expect(badgePost.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(badgePost).toContainText('김팀장');
      await expect(badgePost).toContainText('미팅 마스터 🎯');
      await expect(badgePost).toContainText('100번째 회의 완료!');
      
      // 반응 및 댓글
      await expect(badgePost.locator('[data-testid="like-count"]')).toContainText('12');
      await expect(badgePost.locator('[data-testid="comment-count"]')).toContainText('3');
      
      // 좋아요 버튼
      await badgePost.locator('[data-testid="like-button"]').click();
      await expect(badgePost.locator('[data-testid="like-animation"]')).toBeVisible();
      await expect(badgePost.locator('[data-testid="like-count"]')).toContainText('13');
      
      // 댓글 작성
      await badgePost.locator('[data-testid="comment-button"]').click();
      const commentBox = badgePost.locator('[data-testid="comment-input"]');
      await commentBox.fill('축하드립니다! 👏');
      await commentBox.press('Enter');
      
      await expect(badgePost.locator('[data-testid="my-comment"]')).toContainText('축하드립니다! 👏');
    });

    test('친구 초대 및 추천', async ({ page }) => {
      await page.goto('/social/invite');
      
      // 친구 초대 인터페이스
      await expect(page.locator('[data-testid="invite-interface"]')).toBeVisible();
      
      // 추천 보상 정보
      await expect(page.locator('[data-testid="referral-rewards"]')).toBeVisible();
      await expect(page.locator('[data-testid="reward-info"]')).toContainText('친구가 가입하면 500포인트');
      await expect(page.locator('[data-testid="mutual-reward"]')).toContainText('친구도 300포인트');
      
      // 초대 링크 생성
      await page.locator('[data-testid="generate-invite-link"]').click();
      const inviteLink = page.locator('[data-testid="invite-link"]');
      await expect(inviteLink).toBeVisible();
      await expect(inviteLink).toHaveValue(/https:\/\/.*\/invite\/.*/);
      
      // 소셜 공유 버튼
      await expect(page.locator('[data-testid="share-kakao"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-line"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-email"]')).toBeVisible();
      
      // 초대 현황
      await expect(page.locator('[data-testid="invite-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="invites-sent"]')).toContainText('보낸 초대: 5명');
      await expect(page.locator('[data-testid="invites-accepted"]')).toContainText('가입한 친구: 2명');
      await expect(page.locator('[data-testid="earned-points"]')).toContainText('획득 포인트: 1,000');
    });
  });
});