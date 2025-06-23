# Playwright Microsoft 365 MFA Authentication

A Playwright testing solution for Microsoft 365 applications with Multi-Factor Authentication (MFA) support, designed for Azure DevOps CI/CD pipelines.

## Overview

This project enables automated end-to-end testing of Microsoft 365 applications by handling the complete authentication flow including TOTP-based MFA. The solution uses Playwright's global setup to authenticate once and reuse the session across all tests.

## Key Features

- **🔐 MFA Support**: Automatic TOTP code generation for Microsoft Authenticator
- **⚡ Session Reuse**: Authenticate once, run multiple tests without re-login
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
├── 📁 login/
│   ├── authentication-setup.ts    # Authentication logic & TOTP generation
│   └── auth.json                  # Session storage (auto-generated)
├── 📁 tests/
│   └── *.spec.ts                  # Your test files
├── 📁 test-results/               # JUnit XML reports (auto-generated)
├── 📁 playwright-report/          # HTML reports (auto-generated)
├── ⚙️ playwright.config.ts         # Main configuration
├── 📄 .env                        # Local secrets (create this)
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

Authentication implementation follows the approach outlined by **Elio Struyf** in his article [**"Automating M365 login with MFA in Playwright tests"**](https://www.eliostruyf.com/automating-microsoft-365-login-mfa-playwright-tests/) and was adapted based on it.

---
