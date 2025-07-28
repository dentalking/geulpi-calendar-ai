import { test, expect } from '@playwright/test';

test.describe('Calendar Functionality', () => {
  test.use({
    storageState: '.auth/user.json' // Reuse authenticated state
  });

  // Base URL for consistency
  const BASE_URL = 'http://localhost:3000';
  const CALENDAR_URL = `${BASE_URL}/calendar`;

  test.beforeEach(async ({ page, context }) => {
    // Set up authenticated state
    await context.addCookies([{
      name: 'auth_token',
      value: 'test_jwt_token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    }]);

    // Mock common GraphQL queries
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'GetEvents') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              events: [
                {
                  id: '1',
                  title: '팀 미팅',
                  start: '2025-01-26T10:00:00Z',
                  end: '2025-01-26T11:00:00Z',
                  allDay: false,
                  location: '회의실 A',
                  description: '주간 팀 미팅',
                  ownerId: '1',
                  isRecurring: false
                },
                {
                  id: '2',
                  title: '프로젝트 마감',
                  start: '2025-01-30T00:00:00Z',
                  end: '2025-01-30T23:59:59Z',
                  allDay: true,
                  description: 'Q1 프로젝트 마감일',
                  ownerId: '1',
                  isRecurring: false
                }
              ]
            }
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should display calendar view', async ({ page }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check calendar components
    await expect(page.locator('[data-testid="calendar-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-header"]')).toBeVisible();
    
    // Check view selector
    const viewSelector = page.locator('[data-testid="view-selector"]');
    await expect(viewSelector).toBeVisible();
    await expect(viewSelector).toContainText('월');
  });

  test('should switch between calendar views', async ({ page }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for calendar to be loaded
    await page.waitForSelector('[data-testid="calendar-container"]');
    
    // Switch to week view
    await page.locator('[data-testid="view-selector"]').click();
    await page.locator('[data-testid="view-option-week"]').click();
    
    await expect(page.locator('[data-testid="calendar-week-view"]')).toBeVisible();
    
    // Switch to day view
    await page.locator('[data-testid="view-selector"]').click();
    await page.locator('[data-testid="view-option-day"]').click();
    
    await expect(page.locator('[data-testid="calendar-day-view"]')).toBeVisible();
  });

  test('should create new event via modal', async ({ page, context }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for calendar to load before mocking
    await page.waitForSelector('[data-testid="calendar-container"]');
    
    // Mock create event mutation
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'CreateEvent') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              createEvent: {
                id: '3',
                title: postData.variables.input.title,
                start: postData.variables.input.start,
                end: postData.variables.input.end,
                allDay: postData.variables.input.allDay,
                location: postData.variables.input.location,
                description: postData.variables.input.description,
                ownerId: '1',
                isRecurring: false
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Click add event button and wait for modal
    await page.locator('[data-testid="add-event-button"]').click();
    await expect(page.locator('[data-testid="event-modal"]')).toBeVisible();
    
    // Fill event form
    await page.fill('[data-testid="event-title-input"]', '새로운 미팅');
    await page.fill('[data-testid="event-location-input"]', '스타벅스 강남점');
    await page.fill('[data-testid="event-description-input"]', '클라이언트 미팅');
    
    // Set date and time
    await page.fill('[data-testid="event-start-date"]', '2025-01-28');
    await page.fill('[data-testid="event-start-time"]', '14:00');
    await page.fill('[data-testid="event-end-time"]', '15:30');
    
    // Submit form and wait for completion
    await page.locator('[data-testid="save-event-button"]').click();
    
    // Wait for and check success message
    await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('일정이 추가되었습니다');
    
    // Modal should be closed
    await expect(page.locator('[data-testid="event-modal"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should create event using voice input', async ({ page, context }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for calendar to be ready
    await page.waitForSelector('[data-testid="calendar-container"]');
    
    // Mock speech recognition
    await page.evaluate(() => {
      window.SpeechRecognition = class {
        start() {
          setTimeout(() => {
            this.onresult?.({
              results: [[{
                transcript: '내일 오후 3시에 치과 예약'
              }]]
            });
          }, 100);
        }
        stop() {}
      };
    });

    // Mock ML server response
    await context.route('**/ml/process-voice', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          parsed_event: {
            title: '치과 예약',
            start: '2025-01-27T15:00:00Z',
            end: '2025-01-27T16:00:00Z',
            allDay: false,
            description: '정기 검진'
          }
        })
      });
    });

    // Click voice input button
    await page.locator('[data-testid="voice-input-button"]').click();
    
    // Wait for processing indicator
    await page.waitForSelector('[data-testid="voice-processing"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="voice-processing"]')).toBeVisible();
    
    // Wait for modal to appear and form to be populated
    await expect(page.locator('[data-testid="event-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-title-input"]')).toHaveValue('치과 예약');
    
    // Save event
    await page.locator('[data-testid="save-event-button"]').click();
    
    // Wait for success toast
    await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('일정이 추가되었습니다');
  });

  test('should edit existing event', async ({ page, context }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for events to load
    await page.waitForSelector('[data-testid="event-1"]', { timeout: 10000 });
    
    // Mock update event mutation
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'UpdateEvent') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              updateEvent: {
                id: postData.variables.id,
                ...postData.variables.input,
                ownerId: '1'
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Click on existing event and wait for modal
    await page.locator('[data-testid="event-1"]').click();
    await expect(page.locator('[data-testid="event-modal"]')).toBeVisible();
    
    // Edit event details
    await page.fill('[data-testid="event-title-input"]', '팀 미팅 (업데이트)');
    await page.fill('[data-testid="event-location-input"]', '회의실 B');
    
    // Save changes and wait for success
    await page.locator('[data-testid="save-event-button"]').click();
    
    await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('일정이 수정되었습니다');
  });

  test('should delete event', async ({ page, context }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for events to load
    await page.waitForSelector('[data-testid="event-1"]', { timeout: 10000 });
    
    // Mock delete event mutation
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'DeleteEvent') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              deleteEvent: true
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Click on event to open details
    await page.locator('[data-testid="event-1"]').click();
    await expect(page.locator('[data-testid="event-modal"]')).toBeVisible();
    
    // Click delete button
    await page.locator('[data-testid="delete-event-button"]').click();
    
    // Wait for confirmation dialog and confirm deletion
    await page.waitForSelector('[data-testid="confirm-delete-button"]', { timeout: 5000 });
    await page.locator('[data-testid="confirm-delete-button"]').click();
    
    // Wait for success message
    await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('일정이 삭제되었습니다');
    
    // Event should be removed from calendar
    await expect(page.locator('[data-testid="event-1"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should navigate between months', async ({ page }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for calendar to load
    await page.waitForSelector('[data-testid="current-month"]');
    
    // Get current month
    const currentMonth = await page.locator('[data-testid="current-month"]').textContent();
    
    // Navigate to next month
    await page.locator('[data-testid="next-month-button"]').click();
    
    // Month should change
    const nextMonth = await page.locator('[data-testid="current-month"]').textContent();
    expect(currentMonth).not.toBe(nextMonth);
    
    // Navigate to previous month
    await page.locator('[data-testid="prev-month-button"]').click();
    await page.locator('[data-testid="prev-month-button"]').click();
    
    // Should be in previous month
    const prevMonth = await page.locator('[data-testid="current-month"]').textContent();
    expect(prevMonth).not.toBe(currentMonth);
  });

  test('should show today button and navigate to current date', async ({ page }) => {
    await page.goto(CALENDAR_URL);
    
    // Wait for calendar to load
    await page.waitForSelector('[data-testid="today-button"]');
    
    // Navigate away from current month
    await page.locator('[data-testid="next-month-button"]').click();
    await page.locator('[data-testid="next-month-button"]').click();
    
    // Click today button
    await page.locator('[data-testid="today-button"]').click();
    
    // Wait for navigation to complete and check today's date
    await page.waitForTimeout(1000); // Allow navigation to complete
    await expect(page.locator('[data-testid="today-cell"]')).toHaveClass(/today/);
  });
});