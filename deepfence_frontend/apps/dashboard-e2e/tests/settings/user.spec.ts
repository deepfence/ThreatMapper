import { test, expect, Page, Locator } from '@playwright/test';

const username = process.env.USERNAME;
const password = process.env.PASSWORD;

test.describe('Settings - User management', () => {
  test.beforeEach(async ({ baseURL, page }) => {
    await page.goto(`${baseURL}/settings/user-management`);
  });
  test('should be able to change password', async ({ page }) => {
    const wrapper = page.getByTestId('currentUserWrapperId');
    await expect(wrapper).toBeVisible();
    const emailLabel = wrapper.getByText('Email', {
      exact: true,
    });

    await expect(emailLabel).toBeVisible();
    const emailHolder = emailLabel.locator('..');

    expect(emailHolder).toContainText(username!);

    await page
      .getByRole('button', {
        name: 'change password',
      })
      .click();

    const addModal = page.getByRole('dialog');
    await expect(addModal).toBeVisible();

    await addModal.getByLabel('Current Password').fill(password!);
    await addModal
      .getByLabel(/New Password/, {
        exact: true,
      })
      .fill(password!);
    await addModal.getByLabel('Confirm new Password').fill(password!);

    await addModal
      .getByRole('button', {
        name: 'submit',
      })
      .click();

    await expect(addModal.getByText('Password changed successfully')).toBeVisible();
  });
  test('should show permission message or show user list', async ({ page }) => {
    const response = await page.waitForResponse((response) => {
      return response.url().includes('/deepfence/user');
    });

    if (response.status() === 200) {
      const user = (await response.json()) as {
        role: 'read-only-user';
      };
      if (user.role === 'read-only-user') {
        const userTableWrapper = page
          .getByText('User accounts')
          .locator('..')
          .locator('..');
        await expect(userTableWrapper).toContainText(
          'You do not have enough permissions',
        );
      } else {
        const tableBody = page.getByRole('table').locator('tbody');
        const email = tableBody.locator('tr', {
          hasText: process.env.USERNAME,
        });
        await expect(email).toBeVisible();
        await expect(email).toContainText(process.env.USERNAME!);
      }
    }
  });
  test('should show error message on invite user unless email provider not configured', async ({
    page,
    baseURL,
  }) => {
    async function inviteUser(): Promise<Locator> {
      await page.goto(`${baseURL}/settings/user-management`);
      const inviteUserBtn = page.getByRole('button', {
        name: 'invite user',
      });
      await expect(inviteUserBtn).toBeVisible();
      await inviteUserBtn.click();
      const inviteModal = page.getByRole('dialog');
      await inviteModal.getByLabel('Email').fill(process.env.USERNAME);
      await inviteModal.getByLabel('Role').click();
      await page
        .getByRole('listbox')
        .getByRole('option')
        .filter({
          hasText: 'Admin',
        })
        .click();
      await inviteModal
        .getByRole('button', {
          name: 'Send invite via email',
        })
        .click();
      return inviteModal;
    }

    async function configureEmail(): Promise<Locator> {
      await page.goto(`${baseURL}/settings/email-configuration`);
      const addConfigBtn = page.getByRole('button', {
        name: 'add configuration',
      });
      await expect(addConfigBtn).toBeVisible();
      await addConfigBtn.click();

      const addModal = page.getByRole('dialog');
      await expect(addModal).toBeVisible();

      await page.fill("input[name='email_id']", process.env.SETTING_EMAIL);
      await addModal.getByLabel('Password').fill(process.env.SETTING_PASSWORD);
      await addModal.getByLabel('Port').fill('1234');
      await page.fill("input[name='smtp']", 'smtp.gmail.com');

      await addModal
        .getByRole('button', {
          name: 'submit',
        })
        .click();
      return addModal;
    }

    await page.goto(`${baseURL}/settings/email-configuration`);
    await page.waitForTimeout(5000);
    if (await page.isVisible('button:has-text("add configuration")')) {
      // try to invite user before email configuration is set
      const inviteModal = await inviteUser();
      await expect(inviteModal.getByText('not configured to send emails')).toBeVisible();

      // configure email provider
      const addModal = await configureEmail();
      await expect(addModal.getByText('Configured successfully')).toBeVisible();
      // close modal
      await page.getByTestId('sliding-modal-close-button').click();
      const refreshBtn = page.locator(`button[title="Refresh now"]`);
      if (refreshBtn) {
        await refreshBtn.click();
      }
      const deleteButton = page.getByRole('button', {
        name: 'delete configuration',
      });
      await expect(deleteButton).toBeVisible();

      // invite user should success
      const inviteSucccessModal = await inviteUser();
      await expect(
        inviteSucccessModal.getByText('invite will expire after'),
      ).toBeVisible();
    } else {
      const deleteButton = page.getByRole('button', {
        name: 'delete configuration',
      });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      const deleteModal = page.getByRole('dialog');
      await expect(deleteModal).toBeVisible();
      await deleteModal
        .getByRole('button', {
          name: 'delete',
        })
        .click();
      await expect(deleteModal.getByText('Deleted successfully')).toBeVisible();
    }
  });
});
