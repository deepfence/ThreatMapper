---
title: Managing Users
---

# Managing Users

The first Management Console user is created through the [Initial Registration](initial-configuration) process.  This is a one-time process; further users must be invited to the Console by an existing Admin user.

An admin user can invite users by two methods:

 * Generate an invitation link for a named email address, and then provide that link to the user
 * Configure an email relay for the Management Console, then use the Management Console to invite users by email

## Generate an Invitation Link

1. Go to **Settings** > **User Management** and select **Send Invite**

2. Enter the user's email, select the desired role, and click "Get an invite link"

3. Copy-and-paste the invite link and share it with the user.  Links are valid for a short period of time only.


## Invite via Email

You should configure an Email relay first, so that invitation emails can be sent.

1. Go to **Settings** > **Email Configuration**

2. Select the mailer type

### Configuring Google SMTP

:::info
For more information, see [Set up a device or app to send email through Google Workspace](https://support.google.com/a/answer/176600?hl=en#zippy=%2Cuse-the-gmail-smtp-server).
:::

First, provide:

 * An appropriate Google Workspace email address (one for which you can generate an App Password)
 * The SMTP server and port, for example `smtp.google.com`, port `465`

You will need to generate an **App Password**:

 * Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
 * Under **Select App**, chose **Others** and enter a name, for example, "ThreatMapper"
 * Click the **Generate** button.

If the 'App Password' facility is not available, please refer to your Google Workspace administrator.

Copy the password that has been generated, and enter it into **App Password** field.  Save settings.

### Configuring AWS SES

:::info
For more information, see [Using Amazon Simple Email Service](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-email.html).
:::

 * Provide an email address to identify the email sender
 * Specify an [AWS SES Region](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/regions.html)
 * Provide the Access and Secret keys (see here: [Programmatic Access](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#access-keys-and-secret-access-keys))

Save the email configuration.

### Sending Invitations to New Users

Go to **Settings** > **User Management** and select **Send Invite**.  Provide:

 * The email address of the user to invite
 * The role the user should be given

This will send an invitation to the user with a registration link (URL).  The URL is valid for 24 hours only.


