# Deployment Guide

This guide covers multiple deployment options for your ceramic color picker with Slack bot integration.

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

Railway is the simplest option with automatic deployments from GitHub.

#### Steps:
1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Slack bot integration"
   git push origin main
   ```

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect the Node.js app

3. **Set Environment Variables:**
   - Go to your project settings
   - Add these variables:
     ```
     SLACK_BOT_TOKEN=xoxb-your-bot-token
     SLACK_SIGNING_SECRET=your-signing-secret
     SLACK_APP_TOKEN=xapp-your-app-token
     NODE_ENV=production
     PORT=3000
     ```

4. **Update Slack App Settings:**
   - Use your Railway URL in Slack app configuration
   - Update Request URLs to: `https://your-app.railway.app/slack/events`

### Option 2: Heroku

#### Steps:
1. **Install Heroku CLI:**
   ```bash
   # macOS
   brew install heroku/brew/heroku
   
   # Or download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login and Create App:**
   ```bash
   heroku login
   heroku create your-ceramic-color-picker
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set SLACK_BOT_TOKEN=xoxb-your-bot-token
   heroku config:set SLACK_SIGNING_SECRET=your-signing-secret
   heroku config:set SLACK_APP_TOKEN=xapp-your-app-token
   heroku config:set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

5. **Update Slack App:**
   - Use your Heroku URL: `https://your-ceramic-color-picker.herokuapp.com/slack/events`

### Option 3: Vercel

#### Steps:
1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variables:**
   - Go to Vercel dashboard
   - Project Settings → Environment Variables
   - Add all required variables

4. **Update Slack App:**
   - Use your Vercel URL: `https://your-app.vercel.app/slack/events`

### Option 4: Docker (Any VPS/Cloud Provider)

#### Steps:
1. **Build and Run Locally:**
   ```bash
   docker build -t ceramic-color-picker .
   docker run -p 3000:3000 --env-file .env ceramic-color-picker
   ```

2. **Deploy to Cloud:**
   - Use any cloud provider (AWS, DigitalOcean, Linode, etc.)
   - Upload your code and run the Docker container
   - Set up reverse proxy (nginx) if needed

3. **Using Docker Compose:**
   ```bash
   docker-compose up -d
   ```

## 🔧 Environment Variables

Create a `.env` file with these variables:

```env
# Required Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional: Fallback webhook (if you want to keep the old system)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 📋 Pre-Deployment Checklist

- [ ] All environment variables are set
- [ ] Slack app is configured with correct URLs
- [ ] Bot has required permissions (`files:write`, `chat:write`)
- [ ] Bot is installed in your workspace
- [ ] Test the deployment locally first
- [ ] Check that all file paths are correct
- [ ] Verify the health check endpoint works

## 🔍 Post-Deployment Steps

1. **Test the Health Check:**
   ```bash
   curl https://your-app-url.com/api/health
   ```

2. **Test Slack Integration:**
   - Open your deployed web app
   - Create a pattern and send to Slack
   - Check that the image appears in your channel

3. **Update Slack App URLs:**
   - Go to your Slack app settings
   - Update all Request URLs to your deployed domain
   - Reinstall the app if needed

## 🐛 Troubleshooting

### Common Issues:

1. **"Bot not responding"**
   - Check environment variables are set correctly
   - Verify Slack app URLs point to your deployment
   - Check server logs for errors

2. **"Image upload failed"**
   - Ensure bot has `files:write` permission
   - Check that target channel exists
   - Verify bot is a member of the channel

3. **"Pattern not found"**
   - Check that pattern files are included in deployment
   - Verify file paths are correct

4. **"CORS errors"**
   - Make sure your frontend is served from the same domain
   - Check that API calls use the correct base URL

### Debug Commands:

```bash
# Check if server is running
curl https://your-app-url.com/api/health

# Test Slack bot connection
curl -X POST https://your-app-url.com/api/send-to-slack \
  -H "Content-Type: application/json" \
  -d '{"pattern":"metaAndLines.svg","bgColor":"#ffffff","patternColor":"#000000","bgColorName":"White","patternColorName":"Black"}'

# Check server logs (platform specific)
# Heroku: heroku logs --tail
# Railway: Check dashboard logs
# Vercel: vercel logs
```

## 🔄 Continuous Deployment

### GitHub Actions (Optional):

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - name: Deploy to Railway
        uses: railway-app/railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

## 📊 Monitoring

### Health Check Endpoint:
- `GET /api/health` - Returns server status
- Use this for uptime monitoring services

### Logs:
- Check your platform's logging system
- Monitor for errors and performance issues

### Metrics to Watch:
- Response times
- Error rates
- Memory usage
- Slack API rate limits

## 🔒 Security Considerations

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform-specific secret management
   - Rotate tokens regularly

2. **Slack App Security:**
   - Use signing secret verification
   - Limit bot permissions to minimum required
   - Monitor for suspicious activity

3. **Server Security:**
   - Use HTTPS in production
   - Implement rate limiting if needed
   - Keep dependencies updated

## 💰 Cost Considerations

- **Railway:** Free tier available, then $5/month
- **Heroku:** Free tier discontinued, $7/month minimum
- **Vercel:** Free tier available, then $20/month
- **Docker/VPS:** Varies by provider, typically $5-20/month

Choose based on your needs and budget!
