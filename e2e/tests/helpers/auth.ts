import { Page, BrowserContext } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async authenticateUser() {
    const context = this.page.context();
    await context.addCookies([{
      name: 'auth_token',
      value: 'test_jwt_token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    }]);
  }

  async mockUserQuery(userData = {
    id: '1',
    email: 'test@geulpi.com',
    name: '테스트 사용자',
    picture: 'https://example.com/avatar.jpg'
  }) {
    const context = this.page.context();
    await context.route('**/graphql', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.operationName === 'GetCurrentUser') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              me: userData
            }
          })
        });
      } else {
        await route.continue();
      }
    });
  }

  async loginAsExistingUser() {
    await this.authenticateUser();
    await this.mockUserQuery();
  }

  async logout() {
    const context = this.page.context();
    await context.route('**/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Set-Cookie': 'auth_token=; Path=/; Max-Age=0'
        },
        body: JSON.stringify({ success: true })
      });
    });
    
    await this.page.locator('[data-testid="logout-button"]').click();
  }
}

// Keep the original functions for backward compatibility
export async function authenticateUser(context: BrowserContext) {
  await context.addCookies([{
    name: 'auth_token',
    value: 'test_jwt_token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Strict'
  }]);
}

export async function mockUserQuery(context: BrowserContext, userData = {
  id: '1',
  email: 'test@geulpi.com',
  name: '테스트 사용자',
  picture: 'https://example.com/avatar.jpg'
}) {
  await context.route('**/graphql', async route => {
    const request = route.request();
    const postData = request.postDataJSON();
    
    if (postData?.operationName === 'GetCurrentUser') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            me: userData
          }
        })
      });
    } else {
      await route.continue();
    }
  });
}

export async function setupAuthenticatedState(page: Page, context: BrowserContext) {
  await authenticateUser(context);
  await mockUserQuery(context);
}

export async function logout(page: Page, context: BrowserContext) {
  await context.route('**/auth/logout', async route => {
    await route.fulfill({
      status: 200,
      headers: {
        'Set-Cookie': 'auth_token=; Path=/; Max-Age=0'
      },
      body: JSON.stringify({ success: true })
    });
  });
  
  await page.locator('[data-testid="logout-button"]').click();
}