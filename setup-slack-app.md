# Slack App Setup Guide

Follow these steps to set up your Slack app for the ceramic color picker bot.

## Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter app name: `Ceramic Color Picker Bot`
5. Select your workspace
6. Click **"Create App"**

## Step 2: Configure App Settings

### Basic Information
1. Go to **"Basic Information"** in the left sidebar
2. Note down the **"Signing Secret"** - you'll need this for your `.env` file
3. Scroll down to **"App-Level Tokens"**
4. Click **"Generate Token and Scopes"**
5. Name it: `Socket Mode Token`
6. Add scope: `connections:write`
7. Click **"Generate"**
8. Copy the token (starts with `xapp-`) - you'll need this for your `.env` file

### OAuth & Permissions
1. Go to **"OAuth & Permissions"** in the left sidebar
2. Scroll down to **"Scopes"** section
3. Add these **Bot Token Scopes**:
   - `files:write` - Upload files to channels
   - `chat:write` - Send messages
   - `commands` - Add slash commands (optional)
4. Scroll up and click **"Install to Workspace"**
5. Click **"Allow"** to authorize the app
6. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`) - you'll need this for your `.env` file

### Event Subscriptions (Optional - for advanced features)
1. Go to **"Event Subscriptions"** in the left sidebar
2. Toggle **"Enable Events"** to On
3. Set Request URL to your server URL (e.g., `https://your-domain.com/slack/events`)
4. Subscribe to bot events:
   - `message.channels`
   - `message.groups`
   - `message.im`

### Slash Commands (Optional)
1. Go to **"Slash Commands"** in the left sidebar
2. Click **"Create New Command"**
3. Fill in:
   - Command: `/ceramic`
   - Request URL: `https://your-domain.com/slack/events`
   - Short Description: `Generate ceramic patterns`
   - Usage Hint: `[pattern] [bg-color] [pattern-color]`
4. Click **"Save"**

## Step 3: Update Your Environment File

Create a `.env` file in your project root with:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here
PORT=3000
NODE_ENV=development
```

Replace the placeholder values with the actual tokens you copied from the Slack app settings.

## Step 4: Test Your Setup

1. Start your server: `npm start`
2. Open your web app: `http://localhost:3000`
3. Create a pattern and click "Send to Slack"
4. Check your Slack workspace for the uploaded image

## Step 5: Deploy (Optional)

For production deployment, you'll need to:

1. Deploy your server to a hosting service (Heroku, Railway, etc.)
2. Update the Request URLs in your Slack app settings to point to your deployed server
3. Update your `.env` file with production values

## Troubleshooting

### Bot not responding
- Check that all tokens are correct in your `.env` file
- Verify the bot is installed in your workspace
- Check server logs for error messages

### Permission errors
- Ensure the bot has the required scopes (`files:write`, `chat:write`)
- Make sure the bot is a member of the channels you're trying to post to

### Image upload fails
- Check that the target channel exists
- Verify the bot has permission to upload files
- Check file size limits (current limit is 10MB)

## Next Steps

Once your Slack app is set up:

1. Test the web interface
2. Try the slash command (if configured)
3. Customize the bot's behavior by modifying `server.js`
4. Add more features like pattern history or user preferences

For more help, check the [Slack API documentation](https://api.slack.com/) or the server logs for detailed error messages.
