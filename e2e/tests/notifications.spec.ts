import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers/auth';

test.describe('Notification System', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedState(page, context);
    
    // Mock notification permissions
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: () => Promise.resolve('granted')
        }
      });
    });
  });

  test('should display notification settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    // Navigate to notification tab
    await page.locator('[data-testid="notifications-tab"]').click();
    
    // Check notification toggles
    await expect(page.locator('[data-testid="browser-notifications-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-notifications-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-timing-select"]')).toBeVisible();
  });

  test('should update notification preferences', async ({ page, context }) => {
    await page.goto('/dashboard/settings');
    await page.locator('[data-testid="notifications-tab"]').click();
    
    // Mock GraphQL mutation
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'UpdateNotificationSettings') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              updateNotificationSettings: {
                browserEnabled: postData.variables.input.browserEnabled,
                emailEnabled: postData.variables.input.emailEnabled,
                notificationTiming: postData.variables.input.notificationTiming
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Toggle browser notifications
    await page.locator('[data-testid="browser-notifications-toggle"]').click();
    
    // Change notification timing
    await page.selectOption('[data-testid="notification-timing-select"]', '30');
    
    // Save settings
    await page.locator('[data-testid="save-settings-button"]').click();
    
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('알림 설정이 저장되었습니다');
  });

  test('should show upcoming event notifications', async ({ page, context }) => {
    // Mock GraphQL subscription for notifications
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'NotificationSubscription') {
        // Simulate WebSocket-like behavior
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({
            data: {
              notificationReceived: {
                id: '1',
                type: 'EVENT_REMINDER',
                title: '팀 미팅 알림',
                message: '15분 후에 팀 미팅이 시작됩니다',
                eventId: '1',
                createdAt: new Date().toISOString()
              }
            }
          })}\n\n`
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');
    
    // Wait for notification to appear
    await expect(page.locator('[data-testid="notification-popup"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-title"]')).toContainText('팀 미팅 알림');
    await expect(page.locator('[data-testid="notification-message"]')).toContainText('15분 후에 팀 미팅이 시작됩니다');
    
    // Click notification should navigate to event
    await page.locator('[data-testid="notification-popup"]').click();
    await expect(page.locator('[data-testid="event-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-title-input"]')).toHaveValue('팀 미팅');
  });

  test('should handle notification permissions', async ({ page, context }) => {
    // Override notification permission to denied
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'denied',
          requestPermission: () => Promise.resolve('denied')
        }
      });
    });

    await page.goto('/dashboard/settings');
    await page.locator('[data-testid="notifications-tab"]').click();
    
    // Should show permission denied message
    await expect(page.locator('[data-testid="notification-permission-denied"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-permission-denied"]')).toContainText('브라우저 알림이 차단되어 있습니다');
    
    // Browser notification toggle should be disabled
    await expect(page.locator('[data-testid="browser-notifications-toggle"]')).toBeDisabled();
  });

  test('should display notification history', async ({ page, context }) => {
    // Mock notification history query
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'GetNotificationHistory') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: [
                {
                  id: '1',
                  type: 'EVENT_REMINDER',
                  title: '팀 미팅 알림',
                  message: '팀 미팅이 시작되었습니다',
                  read: false,
                  createdAt: new Date(Date.now() - 3600000).toISOString()
                },
                {
                  id: '2',
                  type: 'EVENT_CREATED',
                  title: '새 일정 추가됨',
                  message: '프로젝트 마감 일정이 추가되었습니다',
                  read: true,
                  createdAt: new Date(Date.now() - 7200000).toISOString()
                },
                {
                  id: '3',
                  type: 'EVENT_UPDATED',
                  title: '일정 변경됨',
                  message: '회의 장소가 변경되었습니다',
                  read: true,
                  createdAt: new Date(Date.now() - 86400000).toISOString()
                }
              ]
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');
    
    // Open notification center
    await page.locator('[data-testid="notification-bell-icon"]').click();
    
    // Check notification count badge
    await expect(page.locator('[data-testid="unread-count-badge"]')).toContainText('1');
    
    // Check notification list
    const notifications = page.locator('[data-testid="notification-item"]');
    await expect(notifications).toHaveCount(3);
    
    // Check unread notification styling
    const unreadNotification = notifications.first();
    await expect(unreadNotification).toHaveClass(/unread/);
    
    // Mark as read
    await unreadNotification.locator('[data-testid="mark-as-read"]').click();
    
    // Badge should disappear
    await expect(page.locator('[data-testid="unread-count-badge"]')).not.toBeVisible();
  });

  test('should clear all notifications', async ({ page, context }) => {
    // Mock clear notifications mutation
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'ClearAllNotifications') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              clearAllNotifications: true
            }
          })
        });
      } else if (postData?.operationName === 'GetNotificationHistory') {
        // Return empty list after clearing
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: []
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');
    await page.locator('[data-testid="notification-bell-icon"]').click();
    
    // Click clear all button
    await page.locator('[data-testid="clear-all-notifications"]').click();
    
    // Confirm clearing
    await page.locator('[data-testid="confirm-clear-button"]').click();
    
    // Should show empty state
    await expect(page.locator('[data-testid="no-notifications-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-notifications-message"]')).toContainText('알림이 없습니다');
  });
});