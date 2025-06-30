import { Page } from '@playwright/test';

/**
 * Helper class for managing user impersonation in Dynamics 365 CE
 */
export class ImpersonationHelper {
  private page: Page;
  private currentImpersonationHeaders: Record<string, string> = {};

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Sets up impersonation for a specific user using their Azure AD Object ID
   * @param callerObjectId - The Azure AD Object ID of the user to impersonate
   */
  async impersonateUserByAzureADObjectId(azureADObjectId: string): Promise<void> {
    if (!azureADObjectId || azureADObjectId.trim() === '') {
      throw new Error('Azure AD Object ID is required and cannot be empty');
    }

    console.log(`Setting up impersonation for user with Azure AD Object ID: ${azureADObjectId}`);

    this.currentImpersonationHeaders = {
      'CallerObjectId': azureADObjectId
    };

    await this.setupRequestInterception();
  }

  /**
   * Sets up impersonation for a specific user using their user ID (legacy method)
   * @param userId - The user ID (GUID) of the user to impersonate
   */
  async impersonateUserByUserId(userId: string): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('systemUserId is required and cannot be empty');
    }

    console.log(`Setting up impersonation for user with System ID: ${userId}`);

    this.currentImpersonationHeaders = {
      'MSCRMCallerID': userId
    };

    await this.setupRequestInterception();
  }

  /**
   * Removes impersonation and returns to the original authenticated user
   */
  async stopImpersonation(): Promise<void> {
    console.log('Stopping impersonation - returning to original user');
    this.currentImpersonationHeaders = {};
    await this.setupRequestInterception();
  }

  /**
   * Gets the current impersonation headers
   * @returns The current impersonation headers object
   */
  getCurrentImpersonationHeaders(): Record<string, string> {
    return { ...this.currentImpersonationHeaders };
  }

  /**
   * Checks if impersonation is currently active
   * @returns True if impersonation is active, false otherwise
   */
  isImpersonationActive(): boolean {
    return Object.keys(this.currentImpersonationHeaders).length > 0;
  }

  /**
   * Sets up request interception to inject impersonation headers
   * @private
   */
  private async setupRequestInterception(): Promise<void> {
    // Remove any existing route handlers for this pattern
    await this.page.unroute('**/api/data/**');

    // Only set up interception if we have headers to inject
    if (Object.keys(this.currentImpersonationHeaders).length > 0) {
      await this.page.route('**/api/data/**', async (route) => {
        const request = route.request();

        // Get existing headers
        const headers = request.headers();

        // Add impersonation headers
        const modifiedHeaders = {
          ...headers,
          ...this.currentImpersonationHeaders
        };

        // Continue with modified headers
        await route.continue({
          headers: modifiedHeaders
        });
      });
    }
  }

  /**
   * Creates a new impersonation helper instance
   * @param page - The Playwright page object
   * @returns A new ImpersonationHelper instance
   */
  static create(page: Page): ImpersonationHelper {
    return new ImpersonationHelper(page);
  }
}

/**
 * Convenience function to create an impersonation helper
 * @param page - The Playwright page object
 * @returns A new ImpersonationHelper instance
 */
export function createImpersonationHelper(page: Page): ImpersonationHelper {
  return ImpersonationHelper.create(page);
}