# Deployment Notification Guide

This document explains how to receive notifications when the application is deployed to GitHub Pages.

## Overview

The deployment workflow (`.github/workflows/deploy.yml`) includes a notification system that informs you about:
- Successful deployments with the deployment URL
- Failed deployments with error details
- Build status and commit information

## How to Receive Notifications

### 1. GitHub Commit Status (Always Active)

**What it is:** A status check that appears directly on commits and pull requests.

**How to view:**
- Navigate to your repository's commit history
- Each commit will show a checkmark (✓) for success or an X (✗) for failure
- Click on the status icon to see details
- The status is labeled "Deployment Notification"

**Benefits:**
- No configuration needed
- Visible directly in your repository
- Works in pull requests

### 2. GitHub Actions Tab (Always Active)

**What it is:** Detailed workflow execution logs in the Actions tab.

**How to view:**
- Go to your repository
- Click the "Actions" tab
- Click on any workflow run to see details
- The notification job will show deployment status, URL, and instructions

**Benefits:**
- Most detailed information
- Includes full deployment URL
- Shows step-by-step execution

### 3. Email Notifications (Requires Configuration)

**What it is:** Email notifications sent by GitHub when workflows complete.

**How to configure:**

1. Go to [GitHub Notification Settings](https://github.com/settings/notifications)
2. Scroll to the "Actions" section
3. Choose one of these options:
   - ✅ **Recommended**: "Send notifications for failed workflows only"
     - You'll only get emails when deployments fail
     - Success notifications visible in commit status
   - "Send notifications for failed workflows that you have pushed to"
     - Only for workflows you triggered
   - "Send all notifications"
     - Get emails for all deployment successes and failures

**Email content includes:**
- Workflow name and status
- Repository and branch
- Commit information
- Link to workflow run

### 4. GitHub Mobile App (Requires Installation)

**What it is:** Push notifications on your mobile device.

**How to configure:**

1. Install the GitHub Mobile app ([iOS](https://apps.apple.com/app/github/id1477376905) / [Android](https://play.google.com/store/apps/details?id=com.github.android))
2. Sign in to your GitHub account
3. Go to app Settings → Notifications
4. Enable "Workflow runs"
5. Choose notification preferences:
   - All workflow runs
   - Only failed workflows
   - Custom per repository

**Benefits:**
- Instant push notifications
- No need to check email or browser
- Works anywhere

### 5. Repository Watch Settings

**What it is:** Subscribe to all repository activity including workflow runs.

**How to configure:**

1. Go to your repository page
2. Click the "Watch" button (top right)
3. Select "Custom"
4. Check "Actions" (and any other events you want)
5. Click "Apply"

**Note:** This sends notifications for ALL workflow runs in the repository, which may be noisy if there are many workflows.

### 6. Slack/Discord Integration (Optional - Advanced)

If you want notifications in Slack or Discord, you can add webhook steps to the workflow:

**For Slack:**
```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Deployment ${{ needs.deploy.result }}: ${{ needs.deploy.outputs.page_url }}"
      }
```

**For Discord:**
```yaml
- name: Notify Discord
  if: always()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    title: "Deployment Notification"
    description: "Status: ${{ needs.deploy.result }}"
```

You'll need to:
1. Create a webhook in Slack/Discord
2. Add it as a secret in your repository settings
3. Add the step to the workflow

## Notification Content

Each notification includes:

- **Status**: Success (✅ 🚀) or Failed (❌ ⚠️)
- **Commit SHA**: Short commit hash
- **Commit Message**: What was deployed
- **Author**: Who made the commit
- **Deployment URL**: Where the app is deployed (on success)
- **Workflow Link**: Direct link to the workflow run for details

## Troubleshooting

### Not receiving email notifications?

1. Check your [GitHub notification settings](https://github.com/settings/notifications)
2. Verify "Actions" notifications are enabled
3. Check your spam folder
4. Ensure your email is verified in GitHub

### Not seeing commit status?

1. Wait a few seconds after workflow completes
2. Refresh the page
3. Check if the workflow completed successfully in the Actions tab
4. Ensure you have proper repository permissions

### Mobile app not showing notifications?

1. Check app notification permissions in your phone's settings
2. Verify GitHub app has permission to send notifications
3. Check notification preferences within the GitHub mobile app
4. Ensure you're logged in with the correct account

## Testing Notifications

To test if notifications are working:

1. Make a small change to the repository (e.g., update README)
2. Commit and push to the `main` branch
3. Check the Actions tab to see the workflow running
4. Wait for the workflow to complete
5. Verify you receive the notification through your configured channels

## Customizing Notifications

The notification system is defined in `.github/workflows/deploy.yml` in the `notify` job. You can customize:

- The message format
- What information is included
- When notifications are sent (success only, failure only, or always)
- Additional notification channels (Slack, Discord, etc.)

Refer to the workflow file for implementation details.
