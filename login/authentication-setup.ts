import { chromium } from '@playwright/test';
import * as OTPAuth from 'otpauth';

/**
 * Generates a TOTP verification code for Microsoft authentication
 * @param userName - The username/email for the TOTP label
 * @param otpSecret - The OTP secret key
 * @returns The generated 6-digit verification code
 */
function generateMicrosoftTOTP(userName: string, otpSecret: string): string {
    const totp = new OTPAuth.TOTP({
        issuer: 'Microsoft',
        label: userName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: otpSecret,
    });

    return totp.generate();
}

/**
 * Core authentication function that handles the complete Microsoft login flow
 * @param page - The Playwright page object
 * @param userName - The username/email for authentication
 * @param password - The user's password
 * @param pageURL - The URL to which you want to authenticate
 * @param otpSecret - Optional OTP secret key for MFA
 * @returns Promise<void>
 */
async function authenticate(
    page: any, 
    userName: string, 
    password: string, 
    pageURL: string,
    otpSecret?: string
): Promise<void> {
    // Validate required parameters
    if (!userName || userName.trim() === '') {
        throw new Error('userName is required and cannot be empty');
    }
    if (!password || password.trim() === '') {
        throw new Error('password is required and cannot be empty');
    }
    if (!pageURL || pageURL.trim() === '') {
        throw new Error('pageURL is required and cannot be empty');
    }

    console.log(`Navigating to: ${pageURL}`);
    await page.goto(pageURL);

    console.log(`Signing in as ${userName}`);  
    // Email
    const emailInput = page.locator('input[type=email]');
    await emailInput.waitFor({ state: 'visible', timeout: 2000 });
    await emailInput.fill(userName);

    // Next
    await page.getByRole('button', { name: 'Next' }).click();

    // Password
    const passwordInput = page.locator('input[type=password]');
    await passwordInput.waitFor({ state: 'visible', timeout: 2000 });
    await passwordInput.fill(password);
    
    // Submit
    await page.locator('input[type=submit]').click();

    // Handle MFA if OTP secret is provided
    if (otpSecret) {
        console.log('OTP Secret provided, checking if MFA is needed.');

        try {
            // Sign in another way
            const otherWayLink = page.locator('a#signInAnotherWay');
            await otherWayLink.waitFor({ state: 'visible', timeout: 2000 });
            await otherWayLink.click();

            // Sign using a verification code
            const otpLink = page.locator(`div[data-value='PhoneAppOTP']`);
            await otpLink.waitFor({ state: 'visible', timeout: 2000 });
            await otpLink.click();
            
            // Generate verification code
            const code = generateMicrosoftTOTP(userName, otpSecret);

            // Use verification code
            const otpInput = await page.waitForSelector('input#idTxtBx_SAOTCC_OTC', { state: 'visible', timeout: 2000 });
            await otpInput.fill(code);
            await page.locator('input[type=submit]').click();
        } catch (error: any) {
            console.log(`MFA potentially not needed, continuing. ${error.message}`);
        }
    }

    // Handle 'Stay signed in?' prompt
    await page.waitForTimeout(1000);
    const staySignedInBtn = page.locator(`input[type=submit][value=Yes]`);

    if ((await staySignedInBtn.count()) > 0) {
        console.log(`'Stay signed in' set to Yes`);
        await staySignedInBtn.click();
    }

    console.log('Microsoft authentication successful');
}

// This script executes ONCE before all test cases run, authenticates the user,
// stores the session in 'auth.json', then all subsequent test cases automatically
// use this saved session without needing to log in again
// 
// To enable: Add this line to your playwright.config.ts:
// globalSetup: require.resolve('./login/authentication-setup'),
export default async function globalSetup() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Configuration parameters
    const pageURL = process.env.M365_PAGE_URL ?? '';
    const userName = process.env.M365_USERNAME ?? '';
    const password = process.env.M365_PASSWORD ?? '';
    const otpSecret = process.env.M365_OTP_SECRET ?? '';

    await authenticate(page, userName, password, pageURL, otpSecret);

    // Save the authenticated session for all tests to use
    await context.storageState({ path: 'login/auth.json' });
    console.log('Session saved to login/auth.json');

    await browser.close();
}

export { generateMicrosoftTOTP, authenticate };