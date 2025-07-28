import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

/**
 * 👥 협업 시나리오
 * 팀 단위 일정 관리와 실시간 협업 기능 테스트
 */

test.describe('🤝 협업 UX', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
  });

  test.describe('실시간 협업 편집', () => {
    test('여러 사용자가 동시에 일정 수정', async ({ page, context, browser }) => {
      await page.goto('/calendar/event/1');
      
      // 두 번째 사용자 시뮬레이션
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await setupAuthenticatedState(page2, context2);
      await page2.goto('/calendar/event/1');
      
      // User 1이 제목 수정 시작
      await page.locator('[data-testid="event-title-input"]').click();
      await page.keyboard.type(' - 수정중');
      
      // User 2에게 실시간 표시
      await expect(page2.locator('[data-testid="editing-indicator"]')).toBeVisible();
      await expect(page2.locator('[data-testid="editor-avatar"]')).toBeVisible();
      await expect(page2.locator('[data-testid="editor-name"]')).toContainText('User 1');
      
      // 커서 위치 실시간 동기화
      await expect(page2.locator('[data-testid="remote-cursor"]')).toBeVisible();
      await expect(page2.locator('[data-testid="remote-cursor"]')).toHaveClass(/blinking/);
      
      // User 2가 설명 수정
      await page2.locator('[data-testid="event-description"]').click();
      await page2.keyboard.type('추가 메모');
      
      // User 1에게도 표시
      await expect(page.locator('[data-testid="collaborator-typing"]')).toBeVisible();
      
      // 저장 시 충돌 자동 해결
      await page.locator('[data-testid="save-button"]').click();
      await page2.locator('[data-testid="save-button"]').click();
      
      await expect(page.locator('[data-testid="merge-success"]')).toBeVisible();
      await expect(page2.locator('[data-testid="merge-success"]')).toBeVisible();
      
      await context2.close();
    });

    test('실시간 참석자 응답 추적', async ({ page, context }) => {
      await page.goto('/calendar/event/team-meeting');
      
      // WebSocket 연결 시뮬레이션
      await page.evaluate(() => {
        window.mockWebSocket = {
          send: (data: any) => {},
          onmessage: null
        };
      });
      
      // 실시간 RSVP 업데이트
      await page.evaluate(() => {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'rsvp_update',
            attendee: { name: '김팀장', email: 'kim@company.com' },
            status: 'accepted',
            message: '참석하겠습니다!'
          })
        });
        window.mockWebSocket.onmessage?.(event);
      });
      
      // RSVP 애니메이션
      const attendeeCard = page.locator('[data-testid="attendee-kim"]');
      await expect(attendeeCard).toHaveClass(/pulse-green/);
      await expect(attendeeCard.locator('[data-testid="status-icon"]')).toHaveClass(/check-animation/);
      
      // 참석률 실시간 업데이트
      await expect(page.locator('[data-testid="attendance-rate"]')).toContainText('75%');
      await expect(page.locator('[data-testid="attendance-bar"]')).toHaveClass(/filling/);
      
      // 실시간 메시지 표시
      await expect(page.locator('[data-testid="live-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-message"]')).toContainText('김팀장: 참석하겠습니다!');
    });

    test('공동 작업 공간 및 화이트보드', async ({ page }) => {
      await page.goto('/calendar/event/brainstorming');
      await page.locator('[data-testid="open-whiteboard"]').click();
      
      // 화이트보드 로드
      await expect(page.locator('[data-testid="collaborative-whiteboard"]')).toBeVisible();
      
      // 실시간 그리기
      const canvas = page.locator('[data-testid="whiteboard-canvas"]');
      await canvas.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();
      
      // 다른 사용자의 커서 표시
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('remote-cursor-move', {
          detail: {
            user: { name: '박과장', color: '#FF6B6B' },
            position: { x: 200, y: 200 }
          }
        }));
      });
      
      await expect(page.locator('[data-testid="remote-cursor-park"]')).toBeVisible();
      await expect(page.locator('[data-testid="cursor-label-park"]')).toContainText('박과장');
      
      // 스티키 노트 추가
      await page.locator('[data-testid="add-sticky-note"]').click();
      await page.locator('[data-testid="sticky-note-input"]').fill('아이디어: AI 기능 강화');
      
      // 실시간 동기화
      await expect(page.locator('[data-testid="sync-indicator"]')).toHaveClass(/syncing/);
      await expect(page.locator('[data-testid="sync-indicator"]')).toHaveClass(/synced/);
    });
  });

  test.describe('팀 일정 관리', () => {
    test('팀원 가용 시간 자동 찾기', async ({ page, context }) => {
      await page.goto('/calendar/schedule-meeting');
      
      // 참석자 추가
      await page.locator('[data-testid="add-attendees"]').click();
      await page.fill('[data-testid="attendee-search"]', '개발팀');
      await page.locator('[data-testid="select-all-team"]').click();
      
      // Mock 팀원들의 일정
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'FindCommonAvailability') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                availability: {
                  slots: [
                    {
                      start: '2024-01-29T10:00:00',
                      end: '2024-01-29T11:00:00',
                      score: 0.9,
                      conflicts: []
                    },
                    {
                      start: '2024-01-29T14:00:00',
                      end: '2024-01-29T15:00:00',
                      score: 0.7,
                      conflicts: [{ user: '김대리', reason: '점심 직후' }]
                    },
                    {
                      start: '2024-01-30T09:00:00',
                      end: '2024-01-30T10:00:00',
                      score: 0.5,
                      conflicts: [{ user: '박차장', reason: '출장' }]
                    }
                  ],
                  heatmap: {
                    monday: { '10:00': 0.9, '14:00': 0.7 },
                    tuesday: { '09:00': 0.5, '15:00': 0.8 }
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 가용 시간 분석
      await page.locator('[data-testid="find-available-times"]').click();
      
      // 히트맵 표시
      await expect(page.locator('[data-testid="availability-heatmap"]')).toBeVisible();
      await expect(page.locator('[data-testid="best-time-slot"]')).toHaveClass(/highlighted/);
      await expect(page.locator('[data-testid="best-time-label"]')).toContainText('최적 시간');
      
      // 충돌 정보 호버
      await page.locator('[data-testid="slot-2"]').hover();
      await expect(page.locator('[data-testid="conflict-tooltip"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-tooltip"]')).toContainText('김대리: 점심 직후');
      
      // 원클릭 예약
      await page.locator('[data-testid="book-best-slot"]').click();
      await expect(page.locator('[data-testid="meeting-scheduled"]')).toContainText('월요일 10시로 예약되었습니다');
    });

    test('팀 전체 일정 대시보드', async ({ page, context }) => {
      await page.goto('/team/dashboard');
      
      // Mock 팀 데이터
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetTeamOverview') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                teamOverview: {
                  members: [
                    {
                      id: '1',
                      name: '김팀장',
                      status: 'in_meeting',
                      currentEvent: '경영 회의',
                      nextAvailable: '14:00',
                      workload: 85
                    },
                    {
                      id: '2',
                      name: '박과장',
                      status: 'available',
                      currentEvent: null,
                      nextAvailable: 'now',
                      workload: 45
                    },
                    {
                      id: '3',
                      name: '이대리',
                      status: 'focus_time',
                      currentEvent: '집중 시간',
                      nextAvailable: '15:00',
                      workload: 70
                    }
                  ],
                  teamMetrics: {
                    meetingLoad: 35,
                    focusTime: 25,
                    collaboration: 40
                  }
                }
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 팀원 상태 카드
      await expect(page.locator('[data-testid="team-grid"]')).toBeVisible();
      
      // 실시간 상태 표시
      const kimCard = page.locator('[data-testid="member-1"]');
      await expect(kimCard).toHaveClass(/status-busy/);
      await expect(kimCard.locator('[data-testid="status-indicator"]')).toHaveClass(/pulse-red/);
      await expect(kimCard).toContainText('경영 회의 중');
      
      const parkCard = page.locator('[data-testid="member-2"]');
      await expect(parkCard).toHaveClass(/status-available/);
      await expect(parkCard.locator('[data-testid="quick-chat"]')).toBeVisible();
      
      // 워크로드 시각화
      await expect(page.locator('[data-testid="workload-kim"]')).toHaveAttribute('data-load', '85');
      await expect(page.locator('[data-testid="workload-kim"]')).toHaveClass(/warning/);
      
      // 팀 밸런스 차트
      await expect(page.locator('[data-testid="team-balance-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="meeting-percentage"]')).toContainText('35%');
    });

    test('스마트 회의록 및 액션 아이템', async ({ page, context }) => {
      await page.goto('/calendar/event/1/minutes');
      
      // 실시간 전사
      await page.locator('[data-testid="start-transcription"]').click();
      
      // 음성 인식 시뮬레이션
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('transcription-update', {
          detail: {
            speaker: '김팀장',
            text: '다음 주까지 프로토타입을 완성해야 합니다.',
            timestamp: new Date().toISOString()
          }
        }));
      });
      
      // 실시간 전사 표시
      await expect(page.locator('[data-testid="live-transcript"]')).toBeVisible();
      await expect(page.locator('[data-testid="transcript-line-1"]')).toContainText('김팀장: 다음 주까지 프로토타입을');
      
      // AI 액션 아이템 추출
      await page.locator('[data-testid="extract-action-items"]').click();
      
      await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
      
      // 추출된 액션 아이템
      await expect(page.locator('[data-testid="action-item-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-item-1"]')).toContainText('프로토타입 완성');
      await expect(page.locator('[data-testid="assignee-1"]')).toContainText('자동 할당 제안: 개발팀');
      await expect(page.locator('[data-testid="due-date-1"]')).toContainText('다음 주');
      
      // 원클릭 작업 생성
      await page.locator('[data-testid="create-all-tasks"]').click();
      await expect(page.locator('[data-testid="tasks-created"]')).toContainText('3개의 작업이 생성되었습니다');
    });
  });

  test.describe('공유 캘린더와 권한', () => {
    test('계층별 캘린더 권한 관리', async ({ page, context }) => {
      await page.goto('/calendar/settings/sharing');
      
      // Mock 공유 설정
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetSharingSettings') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                sharingSettings: {
                  calendars: [
                    {
                      id: 'personal',
                      name: '개인 캘린더',
                      visibility: 'private',
                      shares: []
                    },
                    {
                      id: 'team',
                      name: '팀 캘린더',
                      visibility: 'team',
                      shares: [
                        { user: '팀 전체', permission: 'view' },
                        { user: '김팀장', permission: 'edit' }
                      ]
                    },
                    {
                      id: 'project',
                      name: '프로젝트 A',
                      visibility: 'custom',
                      shares: [
                        { user: '개발팀', permission: 'edit' },
                        { user: '디자인팀', permission: 'view' }
                      ]
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
      
      // 캘린더별 권한 표시
      await expect(page.locator('[data-testid="calendar-list"]')).toBeVisible();
      
      // 개인 캘린더 - 비공개
      const personalCal = page.locator('[data-testid="calendar-personal"]');
      await expect(personalCal.locator('[data-testid="visibility-icon"]')).toHaveClass(/lock/);
      
      // 팀 캘린더 - 공유
      const teamCal = page.locator('[data-testid="calendar-team"]');
      await expect(teamCal.locator('[data-testid="share-count"]')).toContainText('2명과 공유');
      
      // 권한 수정
      await teamCal.locator('[data-testid="edit-permissions"]').click();
      
      const permissionModal = page.locator('[data-testid="permission-modal"]');
      await expect(permissionModal).toBeVisible();
      
      // 세분화된 권한
      await expect(permissionModal.locator('[data-testid="permission-view"]')).toBeChecked();
      await expect(permissionModal.locator('[data-testid="permission-edit"]')).not.toBeChecked();
      await expect(permissionModal.locator('[data-testid="permission-delete"]')).not.toBeChecked();
      
      // 권한 변경
      await permissionModal.locator('[data-testid="permission-edit"]').check();
      await permissionModal.locator('[data-testid="save-permissions"]').click();
      
      await expect(page.locator('[data-testid="permission-updated"]')).toContainText('권한이 업데이트되었습니다');
    });

    test('외부 공유 및 게스트 접근', async ({ page }) => {
      await page.goto('/calendar/event/1/share');
      
      // 공유 링크 생성
      await page.locator('[data-testid="create-share-link"]').click();
      
      // 공유 옵션
      await expect(page.locator('[data-testid="share-options"]')).toBeVisible();
      await page.locator('[data-testid="allow-comments"]').check();
      await page.locator('[data-testid="expire-after"]').selectOption('7days');
      
      // 링크 생성
      await page.locator('[data-testid="generate-link"]').click();
      
      const shareLink = page.locator('[data-testid="share-link-input"]');
      await expect(shareLink).toBeVisible();
      await expect(shareLink).toHaveValue(/https:\/\/.*\/shared\/.*/);
      
      // 복사 버튼
      await page.locator('[data-testid="copy-link"]').click();
      await expect(page.locator('[data-testid="copied-indicator"]')).toBeVisible();
      
      // QR 코드 생성
      await page.locator('[data-testid="show-qr-code"]').click();
      await expect(page.locator('[data-testid="qr-code-image"]')).toBeVisible();
      
      // 접근 로그
      await page.locator('[data-testid="view-access-log"]').click();
      await expect(page.locator('[data-testid="access-log-empty"]')).toContainText('아직 접근 기록이 없습니다');
    });

    test('팀 템플릿 및 반복 일정', async ({ page, context }) => {
      await page.goto('/team/templates');
      
      // Mock 팀 템플릿
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetTeamTemplates') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                templates: [
                  {
                    id: '1',
                    name: '주간 스프린트 회의',
                    description: '매주 월요일 스프린트 계획',
                    schedule: {
                      frequency: 'weekly',
                      day: 'monday',
                      time: '10:00',
                      duration: 60
                    },
                    attendees: ['개발팀 전체'],
                    usageCount: 45
                  },
                  {
                    id: '2',
                    name: '1:1 미팅',
                    description: '팀원 개별 면담',
                    schedule: {
                      frequency: 'biweekly',
                      time: '14:00',
                      duration: 30
                    },
                    attendees: ['매니저', '팀원'],
                    usageCount: 120
                  }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 템플릿 갤러리
      await expect(page.locator('[data-testid="template-gallery"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-card"]')).toHaveCount(2);
      
      // 인기 템플릿 표시
      await expect(page.locator('[data-testid="popular-badge"]')).toBeVisible();
      
      // 템플릿 적용
      await page.locator('[data-testid="use-template-1"]').click();
      
      const applyModal = page.locator('[data-testid="apply-template-modal"]');
      await expect(applyModal).toBeVisible();
      
      // 커스터마이징 옵션
      await expect(applyModal.locator('[data-testid="customize-time"]')).toBeVisible();
      await expect(applyModal.locator('[data-testid="customize-attendees"]')).toBeVisible();
      
      // 미리보기
      await applyModal.locator('[data-testid="preview-schedule"]').click();
      await expect(page.locator('[data-testid="schedule-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-event"]')).toHaveCount(4); // 4주 미리보기
      
      // 적용
      await applyModal.locator('[data-testid="apply-template"]').click();
      await expect(page.locator('[data-testid="template-applied"]')).toContainText('템플릿이 적용되었습니다');
    });
  });

  test.describe('비동기 협업', () => {
    test('시간대 차이 극복', async ({ page, context }) => {
      await page.goto('/calendar');
      
      // 글로벌 팀 설정
      await page.locator('[data-testid="team-settings"]').click();
      await page.locator('[data-testid="global-team-mode"]').check();
      
      // Mock 팀원 시간대
      await context.route('**/graphql', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        
        if (postData?.operationName === 'GetTeamTimezones') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                teamTimezones: [
                  { name: '나', timezone: 'Asia/Seoul', offset: '+09:00' },
                  { name: 'John (SF)', timezone: 'America/Los_Angeles', offset: '-08:00' },
                  { name: 'Emma (London)', timezone: 'Europe/London', offset: '+00:00' }
                ]
              }
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // 시간대 표시
      await expect(page.locator('[data-testid="timezone-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="timezone-seoul"]')).toContainText('09:00');
      await expect(page.locator('[data-testid="timezone-sf"]')).toContainText('16:00 (어제)');
      await expect(page.locator('[data-testid="timezone-london"]')).toContainText('00:00');
      
      // 최적 미팅 시간 제안
      await page.locator('[data-testid="find-global-time"]').click();
      await expect(page.locator('[data-testid="best-global-time"]')).toContainText('한국 17:00 = SF 00:00 = London 08:00');
      
      // 비동기 업데이트 알림
      await page.locator('[data-testid="async-updates"]').click();
      await expect(page.locator('[data-testid="overnight-changes"]')).toBeVisible();
      await expect(page.locator('[data-testid="change-summary"]')).toContainText('밤사이 3개 일정 변경');
    });

    test('댓글 및 멘션 시스템', async ({ page }) => {
      await page.goto('/calendar/event/1');
      
      // 댓글 작성
      const commentBox = page.locator('[data-testid="comment-box"]');
      await commentBox.click();
      await commentBox.fill('이 건에 대해 @김팀장 님의 의견이 필요합니다. ');
      
      // 멘션 자동완성
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="mention-kim"]')).toContainText('김팀장');
      await page.locator('[data-testid="mention-kim"]').click();
      
      // 서식 옵션
      await page.locator('[data-testid="format-bold"]').click();
      await commentBox.type('중요: ');
      await page.locator('[data-testid="format-bold"]').click();
      await commentBox.type('금요일까지 검토 필요');
      
      // 파일 첨부
      await page.setInputFiles('[data-testid="attach-file"]', 'test-file.pdf');
      await expect(page.locator('[data-testid="attachment-preview"]')).toBeVisible();
      
      // 댓글 게시
      await page.locator('[data-testid="post-comment"]').click();
      
      // 실시간 알림 발송 확인
      await expect(page.locator('[data-testid="notification-sent"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-sent"]')).toContainText('김팀장님에게 알림 전송');
      
      // 스레드 표시
      await expect(page.locator('[data-testid="comment-thread"]')).toBeVisible();
      await expect(page.locator('[data-testid="comment-1"]')).toContainText('중요: 금요일까지 검토 필요');
    });

    test('작업 핸드오버 및 인수인계', async ({ page, context }) => {
      await page.goto('/calendar/handover');
      
      // 휴가/부재 설정
      await page.locator('[data-testid="set-out-of-office"]').click();
      await page.fill('[data-testid="ooo-start"]', '2024-02-01');
      await page.fill('[data-testid="ooo-end"]', '2024-02-07');
      
      // 자동 인수인계 설정
      await page.locator('[data-testid="delegate-select"]').selectOption('박과장');
      
      // AI 인수인계 문서 생성
      await page.locator('[data-testid="generate-handover"]').click();
      
      await expect(page.locator('[data-testid="ai-generating"]')).toBeVisible();
      
      // 생성된 인수인계 문서
      const handoverDoc = page.locator('[data-testid="handover-document"]');
      await expect(handoverDoc).toBeVisible();
      await expect(handoverDoc).toContainText('진행 중인 프로젝트');
      await expect(handoverDoc).toContainText('예정된 미팅');
      await expect(handoverDoc).toContainText('긴급 연락처');
      
      // 권한 임시 이양
      await expect(page.locator('[data-testid="permission-transfer"]')).toBeVisible();
      await page.locator('[data-testid="transfer-edit-rights"]').check();
      await page.locator('[data-testid="transfer-approval-rights"]').check();
      
      // 자동 응답 설정
      await page.locator('[data-testid="auto-reply-message"]').fill('2월 1일-7일 휴가입니다. 긴급 건은 박과장(park@company.com)에게 연락 바랍니다.');
      
      // 인수인계 완료
      await page.locator('[data-testid="complete-handover"]').click();
      await expect(page.locator('[data-testid="handover-success"]')).toContainText('인수인계가 완료되었습니다');
    });
  });
});