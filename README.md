# Playwright Microsoft 365 MFA Authentication & User Impersonation

A Playwright testing solution for Microsoft 365 applications with Multi-Factor Authentication (MFA) support and user impersonation capabilities for Dynamics 365 CE Model Driven Apps, designed for Azure DevOps CI/CD pipelines.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Creating Tests with Playwright Codegen](#creating-tests-with-playwright-codegen)
- [Project Structure](#project-structure)
- [How Authentication Works](#how-authentication-works)
- [User Impersonation](#user-impersonation)
- [Azure DevOps Pipeline Setup](#azure-devops-pipeline-setup)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Important Files to .gitignore](#important-files-to-gitignore)
- [Acknowledgments](#acknowledgments)

## Overview

This project enables automated end-to-end testing of Microsoft 365 applications by handling the authentication flow including TOTP-based MFA. The solution uses Playwright's global setup to authenticate once and reuse the session across all tests. Additionally, it provides user impersonation functionality for testing scenarios as different users without requiring their actual credentials in a Model Driven App.

## Key Features

- **🔐 MFA Support**: Automatic TOTP code generation for Microsoft Authenticator
- **⚡ Session Reuse**: Authenticate once, run multiple tests without re-login
- **👥 User Impersonation**: Test as different users without their credentials
- **🚀 Azure Pipeline**: Example for Azure DevOps Pipeline

## Quick Start

### 1. Prerequisites

- Node.js 18.x or higher
- Azure DevOps access (for CI/CD)
- Microsoft 365 account with access to the applications you want to test

### 2. Setup MFA for Your Microsoft Account

Before using this solution, you need to configure TOTP authentication:

1. Go to [Microsoft Security Info](https://mysignins.microsoft.com/security-info)
2. Click **Add sign-in method** → **Microsoft Authenticator**
3. Select **I want to use a different authenticator app**
4. Click **Can't scan image?** to reveal the secret key
5. **Save the Secret Key** - you'll need this for the `.env` file and Azure DevOps variable group
6. Scan the QR code with your authenticator app
7. Complete the setup by entering the verification code

### 3. Local Development Setup

```bash
# Clone the repository
git clone https://github.com/shamak1/playwright-azure-mfa-auth.git
cd playwright-azure-mfa-auth

# Install dependencies
npm install
```
> [!IMPORTANT]
> This project already includes Playwright in its dependencies.
> 
> ```json
> {
>   "devDependencies": {
>     "@playwright/test": "^1.53.1"
>   }
> }
> ```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
M365_PAGE_URL=https://your-microsoft365-app-url.com/

M365_USERNAME=your-email@domain.com
M365_PASSWORD=your-password

M365_OTP_SECRET=your-totp-secret-key
```

### 5. Run Tests

```bash
# Run all tests
npx playwright test

# Run tests with UI (for debugging)
npx playwright test --headed
```

## Creating Tests with Playwright Codegen

You can use Playwright's code generation tool to create tests by recording your interactions:

### Command Line Codegen
```bash
# Generate tests for your Microsoft 365 application
npx playwright codegen https://xxxxxxxxxxxxx.crm4.dynamics.com/
```

📖 **Learn more**: [Running Codegen from Command Line](https://playwright.dev/docs/codegen#running-codegen)

### Visual Studio Code Extension
For an enhanced development experience, install the [Playwright VS Code extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) which provides:
- **Integrated Test Runner**: Run and debug tests directly in VS Code
- **Record New Tests**: Generate tests using the built-in recorder
- **Pick Locator**: Interactive element selection
- **Live Debugging**: Step through tests with full debugging support

📖 **Learn more**: [VS Code Extension for Test Recording](https://playwright.dev/docs/getting-started-vscode#opening-the-testing-sidebar)

> [!NOTE]
> Codegen will start a fresh browser session and won't automatically use your saved authentication. You'll need to log in manually during the recording session, then copy the generated actions into your test files.

## Project Structure

```
playwright-ci-cd/
├── 📁 .pipelines/
│   └── azure-pipelines.yml        # CI/CD configuration
├── 📁 impersonation/
│   └── impersonation-helper.ts    # User impersonation utilities
├── 📁 login/
│   └── auth.json                  # Session storage (auto-generated)
│   ├── authentication-setup.ts    # Authentication logic & TOTP generation
├── 📁 playwright-report/          # HTML reports (auto-generated)
├── 📁 test-results/               # JUnit XML reports (auto-generated)
├── 📁 tests/
│   └── *.spec.ts                  # Your test files
├── 📄 .env                        # Local secrets (create this)
├── ⚙️ playwright.config.ts         # Main configuration
└── 📋 README.md
```

## How Authentication Works

1. **Global Setup**: Before any tests run, `authentication-setup.ts` executes
2. **Login Flow**: Automated login with username/password
3. **MFA Challenge**: If MFA is required, generates TOTP code automatically
4. **Session Save**: Stores authentication cookies in `auth.json`
5. **Test Execution**: All tests reuse the saved session

The authentication is orchestrated through Playwright's `globalSetup` configuration:

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve('./login/authentication-setup'),
  use: {
    storageState: './login/auth.json',
  },
});
```

> [!NOTE]
> To better understand how Playwright's `globalSetup` works and how it's used to initialize authentication or setup logic before tests, visit the [official documentation](https://playwright.dev/docs/test-global-setup-teardown). 

### Key Functions

The authentication uses two main functions:

```typescript
// 1. Entry point called by Playwright's globalSetup
export default async function globalSetup(): Promise<void>

// 2. Handles complete login flow including MFA  
async function authenticate(page, userName, password, pageURL, otpSecret?)

// 3. Generates TOTP codes when MFA is required
function generateMicrosoftTOTP(userName: string, otpSecret: string): string
```

> [!NOTE]
> Check `login/authentication-setup.ts` for the complete implementation details.

## User Impersonation

The project includes user impersonation capabilities for Dynamics 365 CE/Model Driven Apps testing, allowing you to test scenarios as different users without needing their actual credentials.

### How Impersonation Works

User impersonation in Dynamics 365 CE works by injecting the `CallerObjectId` header (containing the Azure AD Object ID) or `MSCRMCallerID` header (containing the Dynamics 365 User ID) into API requests made to `/api/data/**` endpoints.

This follows Microsoft's official impersonation guidance where the impersonator needs the "Act on Behalf of Another User" privilege, and the effective permissions are the intersection of both users' privileges.

### Important Limitations

> [!WARNING]
> **Model Driven App UI Limitations**

> - **Navigation Panel**: The left navigation panel will always show the authenticated user's view, not the impersonated user's. However, impersonation still takes effect. API calls will use the impersonated user's permissions.
> - **Multiple Users per Test**: You cannot impersonate multiple users within the same test. Each impersonated user must be in a separate test. Hard refresh could fix this limitation but at the moment I don't believe it is possible to do a hard refresh with playwright.
> - **App Navigation**: When navigating between different apps in the same tenant while impersonated, the UI will not update properly and will show the authenticated user's interface. Despite the UI appearance, the backend impersonation remains active and API calls will still use the impersonated user's permissions.

### Setting Up Impersonation

**1. Import the Impersonation Helper**

```typescript
import { createImpersonationHelper } from './impersonation/impersonation-helper';
```

**2. Initialize in Your Test**

```typescript
import { test } from '@playwright/test';
import { createImpersonationHelper } from './impersonation/impersonation-helper';

test.describe('Tests with User Impersonation', () => {
  test('should test functionality as different user', async ({ page }) => {
    // Navigate to your application
    const pageURL = process.env.M365_PAGE_URL ?? '';
    await page.goto(pageURL);
    
    // Create impersonation helper
    const impersonationHelper = createImpersonationHelper(page);
    
    // Start impersonation using Azure AD Object ID (recommended)
    await impersonationHelper.impersonateUserByAzureADObjectId('user-azure-ad-object-id');
    
    // Wait for impersonation to take effect
    await page.waitForTimeout(2000);
    
    // Your test code here - all API calls will be made as the impersonated user
    // ...
  });
});
```

### Impersonation Methods

**Method 1: Azure AD Object ID (Recommended)**

Uses the user's Azure AD Object ID to impersonate the user. This is the recommended approach for modern environments.

```typescript
// Impersonate using Azure AD Object ID
await impersonationHelper.impersonateUserByAzureADObjectId('12345678-1234-1234-1234-123456789abc');
```

**Method 2: User ID (Legacy)**

Uses the Dynamics 365 User ID to impersonate the user. This is the legacy method but still supported.

```typescript
// Impersonate using Dynamics 365 User ID
await impersonationHelper.impersonateUserByUserId('87654321-4321-4321-4321-cba987654321');
```

**Method 3: Stop Impersonation**

Stops the impersonation and returns to the original authenticated user.

```typescript
// Stop impersonation and return to original authenticated user
await impersonationHelper.stopImpersonation();
await page.reload(); // Required to update UI
```

### Impersonation Helper API

The `ImpersonationHelper` class provides these methods:

```typescript
// Set up impersonation by Azure AD Object ID
await impersonationHelper.impersonateUserByAzureADObjectId(azureAdObjectId: string);

// Set up impersonation by User ID (legacy method)
await impersonationHelper.impersonateUserByUserId(userId: string);

// Stop impersonation
await impersonationHelper.stopImpersonation();

// Check if impersonation is currently active
const isActive = impersonationHelper.isImpersonationActive();

// Get current impersonation headers (Azure AD Object ID or User Id)
const headers = impersonationHelper.getCurrentImpersonationHeaders();
```

### Microsoft Documentation Reference

This impersonation implementation follows Microsoft's official guidance for Dataverse user impersonation:

- **Required Privilege**: The authenticated user needs "Act on Behalf of Another User" (`prvActOnBehalfOfAnotherUser`) privilege
- **Direct Assignment**: The impersonation privilege must be assigned directly to users (cannot be inherited through teams)
- **Web API Method**: Uses the `CallerObjectId` or `MSCRMCallerID` header with the user's Azure AD Object ID

### Example: Testing with Different Users (Separate Tests)

This example demonstrates how to test functionality with different user impersonations. And potnentially could be avoided if we can hard refresh the page.

```typescript
import { test, expect } from '@playwright/test';
import { createImpersonationHelper } from '../impersonation/impersonation-helper';

test.describe('Contact Creation with Different Users', () => {
  let impersonationHelper: any;

  test.beforeEach(async ({ page }) => {
    const pageURL = process.env.M365_PAGE_URL ?? '';
    const fullURL = `${pageURL}main.aspx?appid=xxxxxxxx-4a32-xxxx-8c4e-xxxxxxxxxxxx`;

    await page.goto(fullURL);
  });

  test('Create Contact as User 1', async ({ page }) => {
    impersonationHelper = createImpersonationHelper(page);
    
    // Impersonate User 1
    await impersonationHelper.impersonateUserByAzureADObjectId('user1-azure-ad-object-id');
    await page.waitForTimeout(5000);

    // Navigate to contacts and create new contact
    await page.getByText('Contacts', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'New', exact: true }).click();
    
    // Fill contact details
    await page.getByRole('textbox', { name: 'First Name' }).fill('Filip');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Shamakoski');
    await page.getByRole('textbox', { name: 'Email' }).fill('filip_shamakoski@outlook.com');
    
    // Save the contact
    await page.getByRole('menuitem', { name: 'Save (CTRL+S)' }).click();
    await page.waitForTimeout(5000);
  });

  test('Create Contact as User 2', async ({ page }) => {
    impersonationHelper = createImpersonationHelper(page);
    
    // Impersonate User 2 - separate test required
    await impersonationHelper.impersonateUserByAzureADObjectId('user2-azure-ad-object-id');
    await page.waitForTimeout(5000);

    // Same workflow but as different user
    await page.getByText('Contacts', { exact: true }).click();
    await page.getByRole('menuitem', { name: 'New', exact: true }).click();
    
    // Test different permissions/access levels
    // ...test logic here...
  });
});
```

## Azure DevOps Pipeline Setup

### 1. Create Variable Group

In Azure DevOps:
1. Go to **Pipelines** → **Library** → **Variable Groups**
2. Create a variable group (you can name it whatever you want, in our example it's `M365 Credentials`)
3. Add these variables (mark passwords/secrets as secret):
   - `M365_PAGE_URL`: Your Microsoft 365 application URL
   - `M365_USERNAME`: Your email address
   - `M365_PASSWORD`: Your password (secret)
   - `M365_OTP_SECRET`: Your TOTP secret key (secret)

### 2. Pipeline Configuration

The included `azure-pipelines.yml` handles:
- Node.js setup
- Dependency installation
- Playwright browser installation
- Test execution with MFA
- Results and artifact publishing

### 3. Trigger Pipeline

The pipeline runs automatically on:
- Pushes to `main` branch
- Pull requests to `main`

## Security Best Practices

- ✅ Never commit `.env` files or `auth.json`
- ✅ Use Azure DevOps variable groups for secrets
- ✅ Mark sensitive variables as secret
- ✅ Use accounts with sufficient permissions / roles
- ✅ Be mindful when using impersonation - ensure proper authorization

## Troubleshooting

### Authentication Issues
- Verify your credentials in the `.env` file
- Check if MFA is properly configured
- Ensure the TOTP secret key is correct
- **Timeout Issues**: If you encounter timeout errors during the Microsoft authentication process (e.g., when locating email input, password input, or other authentication elements), you can adjust the timeout values in `authentication-setup.ts` to accommodate slower page loads or network conditions

```typescript
// Email
const emailInput = page.locator('input[type=email]');
await emailInput.waitFor({ state: 'visible', timeout: 5000 }); // Increased from 2000ms to 5000ms
await emailInput.fill(userName);
```

### Impersonation Issues
- Verify that the Azure AD Object ID or User ID is correct
- Ensure the authenticated user has the "Act on Behalf of Another User" privilege (`prvActOnBehalfOfAnotherUser`)
- Remember that UI elements may show from the authenticated user's perspective, but API permissions are enforced for the impersonated user
- Each impersonated user must be tested in separate test cases - multiple impersonations in one test are not supported

## Important Files to .gitignore

```gitignore
# Authentication session (contains sensitive cookies)
login/auth.json

# Environment variables (contains credentials)
.env

# Playwright outputs
test-results/
playwright-report/
playwright/.cache/
```

## Acknowledgments

Special thanks to **Yurii Nazarenko** for helping out during the process.
Authentication implementation follows the approach outlined by **Elio Struyf** in his article [**Automating M365 login with MFA in Playwright tests**](https://www.eliostruyf.com/automating-microsoft-365-login-mfa-playwright-tests/) and was adapted based on it.

---
