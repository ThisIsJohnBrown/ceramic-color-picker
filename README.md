# Ceramic Color Picker with Slack Bot

A web application for designing ceramic patterns with color combinations, featuring a Slack bot for sharing designs and uploading images.

## Features

- 🎨 Interactive ceramic pattern designer
- 🌈 Extensive color palette with underglaze and glaze colors
- 📱 Real-time pattern preview
- 🤖 Slack bot integration for sharing designs
- 📤 Image upload to Slack channels
- 🔗 Shareable URLs for pattern combinations

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Slack App

1. Go to [api.slack.com](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Ceramic Color Picker Bot")
4. Select your workspace

### 3. Configure Slack App Permissions

#### Bot Token Scopes (OAuth & Permissions):
- `files:write` - Upload files to channels
- `chat:write` - Send messages
- `commands` - Add slash commands

#### App-Level Tokens:
- Create a token with `connections:write` scope for Socket Mode

### 4. Set up Slash Command (Optional)

1. Go to "Slash Commands" in your app settings
2. Create a new command:
   - Command: `/ceramic`
   - Request URL: `https://your-domain.com/slack/events` (or use ngrok for local development)
   - Short Description: "Generate ceramic patterns"
   - Usage Hint: `[pattern] [bg-color] [pattern-color]`

### 5. Environment Configuration

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Fill in your Slack credentials:
   ```env
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   SLACK_SIGNING_SECRET=your-signing-secret-here
   SLACK_APP_TOKEN=xapp-your-app-token-here
   PORT=3000
   NODE_ENV=development
   ```

### 6. Install Slack App in Workspace

1. Go to "Install App" in your Slack app settings
2. Click "Install to Workspace"
3. Copy the Bot User OAuth Token to your `.env` file

### 7. Run the Application

#### Development Mode:
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Usage

### Web Interface

1. Open the web app in your browser
2. Select a pattern from the thumbnails
3. Choose underglaze colors for the background
4. Choose glaze colors for the pattern
5. Click "Send to Slack" to share your design

### Slack Bot Commands

#### Slash Command (if configured):
```
/ceramic metaAndLines.svg #ffffff #000000
```

#### Direct API Usage:
The bot automatically generates and uploads images when you use the web interface.

## API Endpoints

- `POST /api/send-to-slack` - Send pattern to Slack
- `GET /api/patterns` - Get available patterns
- `GET /api/colors` - Get colors data
- `GET /api/health` - Health check

## File Structure

```
ceramic-color-picker/
├── server.js              # Main server file
├── package.json           # Dependencies
├── index.html            # Web interface
├── colors.json           # Color data
├── patterns/             # SVG pattern files
├── glaze_images/         # Glaze color images
├── underglaze_images/    # Underglaze color images
├── uploads/              # Temporary files (auto-created)
└── README.md            # This file
```

## Development

### Local Development with ngrok

For local development with Slack webhooks:

1. Install ngrok: `npm install -g ngrok`
2. Start your server: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Use the ngrok URL in your Slack app configuration

### Adding New Patterns

1. Add SVG files to the `patterns/` directory
2. Update the pattern selector in `index.html`
3. The bot will automatically detect new patterns

### Adding New Colors

1. Add color data to `colors.json`
2. Add corresponding images to `glaze_images/` or `underglaze_images/`
3. The web interface will automatically load new colors

## Troubleshooting

### Common Issues

1. **"Slack bot not responding"**
   - Check your `.env` file has correct tokens
   - Verify the bot is installed in your workspace
   - Check the server logs for errors

2. **"Image upload failed"**
   - Ensure the bot has `files:write` permission
   - Check that the target channel exists
   - Verify the bot is a member of the channel

3. **"Pattern not found"**
   - Check that pattern files exist in `patterns/` directory
   - Verify file names match exactly

### Logs

Check the server console for detailed error messages and debugging information.

## License

MIT License - feel free to use and modify as needed.
