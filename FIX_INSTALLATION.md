# Fix Installation Issues

The canvas package is failing to install due to Node.js v21.6.1 compatibility issues. Here are several solutions:

## 🚀 Solution 1: Use Simple Version (Recommended)

This version uploads SVG files directly to Slack without PNG conversion:

### Steps:
1. **Clean up the failed installation:**
   ```bash
   rm -rf node_modules package-lock.json
   ```

2. **Use the simple package.json:**
   ```bash
   cp package-simple.json package.json
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Use the simple server:**
   ```bash
   cp server-simple.js server.js
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

## 🔧 Solution 2: Fix Canvas Installation

If you want PNG conversion, try these fixes:

### Option A: Install System Dependencies (macOS)
```bash
# Install required system libraries
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Option B: Use Node Version Manager
```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18 (more stable with canvas)
nvm install 18
nvm use 18

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Option C: Use Docker (No local compilation)
```bash
# Build and run with Docker
docker build -t ceramic-color-picker .
docker run -p 3000:3000 --env-file .env ceramic-color-picker
```

## 🎯 Solution 3: Alternative Image Generation

Use Puppeteer instead of canvas (already included in main package.json):

### Steps:
1. **Clean up:**
   ```bash
   rm -rf node_modules package-lock.json
   ```

2. **Install with Puppeteer:**
   ```bash
   npm install
   ```

3. **Start server:**
   ```bash
   npm start
   ```

## 🔍 Troubleshooting

### If you still get errors:

1. **Check Node.js version:**
   ```bash
   node --version
   ```

2. **Check system dependencies:**
   ```bash
   # macOS
   brew list | grep -E "(cairo|pango|jpeg|giflib)"
   
   # Ubuntu/Debian
   dpkg -l | grep -E "(libcairo|libpango|libjpeg|libgif)"
   ```

3. **Try with different Node versions:**
   ```bash
   # Using nvm
   nvm install 18
   nvm use 18
   npm install
   ```

4. **Check for Python issues:**
   ```bash
   # Make sure you have Python 3.8-3.11
   python3 --version
   ```

## 📋 Quick Test

After installation, test with:

```bash
# Test the server
npm start

# In another terminal, test the API
curl http://localhost:3000/api/health
```

## 🚀 Deployment Options

### For Production (No local compilation issues):

1. **Railway/Heroku:** Use the simple version (SVG uploads)
2. **Docker:** Use the full version with image conversion
3. **VPS:** Install system dependencies first

### Recommended Approach:
1. Use **Solution 1** (simple version) for quick setup
2. Deploy to Railway/Heroku for production
3. Upgrade to PNG conversion later if needed

## 💡 Why This Happens

- **Canvas** requires native compilation (C++ bindings)
- **Node.js v21** has breaking changes in the build system
- **macOS ARM64** (M1/M2) has additional compatibility issues
- **System dependencies** must be installed for native modules

The simple version avoids all these issues by uploading SVG files directly to Slack, which works perfectly for your use case!
