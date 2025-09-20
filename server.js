const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
require('dotenv').config();

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Initialize Express app
const expressApp = express();
const PORT = process.env.PORT || 3000;

// Middleware
expressApp.use(cors());
expressApp.use(express.json({ limit: '10mb' })); // Increase limit to handle large SVG files
expressApp.use(express.static('.'));

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Load colors data
let colorsData = null;
try {
  colorsData = JSON.parse(fs.readFileSync('colors.json', 'utf8'));
} catch (error) {
  console.error('Error loading colors.json:', error);
}


// Fallback function to convert SVG to PNG using Sharp (simpler, more reliable)
async function svgToPngSharp(svgContent, width = 800, height = 600) {
  const outputPngPath = path.join(__dirname, 'uploads', `output_${Date.now()}.png`);
  
  try {
    console.log('🔄 Using Sharp fallback for SVG conversion...');
    
    // Convert SVG to PNG using Sharp
    await sharp(Buffer.from(svgContent))
      .resize(width, height)
      .png()
      .toFile(outputPngPath);
    
    console.log('✅ Sharp conversion successful:', outputPngPath);
    return outputPngPath;
  } catch (error) {
    console.error('❌ Sharp conversion failed:', error);
    throw error;
  }
}

// Helper function to convert SVG to PNG using Puppeteer with Railway-optimized fallbacks
async function svgToPng(svgContent, width = 800, height = 600) {
  const tempSvgPath = path.join(__dirname, 'uploads', `temp_${Date.now()}.svg`);
  const outputPngPath = path.join(__dirname, 'uploads', `output_${Date.now()}.png`);
  
  let browser;
  
  try {
    console.log('📝 Writing SVG to temp file:', tempSvgPath);
    
    
    // Write SVG to temporary file
    fs.writeFileSync(tempSvgPath, svgContent);
    
    console.log('🚀 Launching Puppeteer browser...');
    
    // Try multiple Chrome executable paths for Railway compatibility
    const possiblePaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/opt/google/chrome/chrome'
    ];
    
    let executablePath = null;
    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        executablePath = chromePath;
        console.log('✅ Found Chrome at:', chromePath);
        break;
      }
    }
    
    if (!executablePath) {
      console.log('⚠️ No Chrome found, using default Puppeteer Chrome');
    }
    
    // Launch Puppeteer browser with Railway-optimized configuration
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-plugins',
        '--single-process',
        '--no-zygote',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--disable-windows10-custom-titlebar',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ],
      timeout: 60000,
      protocolTimeout: 60000
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    browser = await puppeteer.launch(launchOptions);
    
    console.log('📄 Creating new page...');
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width, height });
    
    console.log('🌐 Loading SVG file...');
    // Load the SVG file
    const fileUrl = `file://${tempSvgPath}`;
    await page.goto(fileUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for any animations or rendering to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: outputPngPath,
      type: 'png',
      fullPage: true,
      omitBackground: false
    });
    
    console.log('✅ Screenshot saved to:', outputPngPath);
    
    // Clean up temporary SVG file
    fs.unlinkSync(tempSvgPath);
    
    return outputPngPath;
  } catch (error) {
    console.error('❌ Puppeteer failed, trying Sharp fallback:', error.message);
    
    // Clean up on error
    if (fs.existsSync(tempSvgPath)) {
      fs.unlinkSync(tempSvgPath);
    }
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    // Try Sharp fallback
    try {
      return await svgToPngSharp(svgContent, width, height);
    } catch (sharpError) {
      console.error('❌ Both Puppeteer and Sharp failed:', sharpError);
      throw new Error(`SVG conversion failed: ${error.message}. Fallback also failed: ${sharpError.message}`);
    }
  } finally {
    if (browser) {
      console.log('🔒 Closing browser...');
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

// Slack command handler
app.command('/ceramic', async ({ command, ack, respond, client }) => {
  await ack();
  
  try {
    const args = command.text.split(' ');
    const pattern = args[0] || 'metaAndLines.svg';
    const bgColor = args[1] || '#ffffff';
    const patternColor = args[2] || '#000000';
    
    // For Slack commands, we need to generate SVG (frontend not available)
    // This is a simplified version for Slack commands only
    const patternPath = path.join(__dirname, 'patterns', pattern);
    if (!fs.existsSync(patternPath)) {
      return respond({ text: `Pattern file not found: ${pattern}` });
    }
    const svgContent = fs.readFileSync(patternPath, 'utf8');
    
    // Convert SVG to PNG
    const pngPath = await svgToPng(svgContent);
    
    // Generate shareable URL (for Slack commands, use env var or default)
    const baseUrl = process.env.BASE_URL || 'https://ceramic-color-picker.vercel.app';
    const shareUrl = `${baseUrl}?pattern=${encodeURIComponent(pattern)}&bgColor=${encodeURIComponent(bgColor)}&patternColor=${encodeURIComponent(patternColor)}`;
    
    // Upload PNG to Slack
    const patternName = pattern.replace('.svg', '');
    const filename = `${bgColor.replace('#', '')}_${patternColor.replace('#', '')}_${patternName}.png`;
    const result = await client.files.uploadV2({
      channel_id: command.channel_id,
      file: fs.createReadStream(pngPath),
      filename: filename,
      title: `Ceramic Pattern: ${pattern}`,
      initial_comment: `🎨 Ceramic pattern generated!\n*Pattern:* ${pattern}\n*Background:* ${bgColor}\n*Pattern Color:* ${patternColor}\n\n🔗 <${shareUrl}|View and edit this design>`
    });
    
    // Clean up PNG file
    fs.unlinkSync(pngPath);
    
    await respond({
      text: `✅ Pattern generated and uploaded!`,
      response_type: 'ephemeral'
    });
    
  } catch (error) {
    console.error('Error in /ceramic command:', error);
    await respond({
      text: `❌ Error generating pattern: ${error.message}`,
      response_type: 'ephemeral'
    });
  }
});

// API endpoint for web app integration
expressApp.post('/api/send-to-slack', async (req, res) => {
  try {
    console.log('📥 Received request to /api/send-to-slack');
    const { pngData, pattern, bgColor, patternColor, bgColorName, patternColorName, channel } = req.body;
    
    console.log('📋 Request data:', { pattern, bgColor, patternColor, bgColorName, patternColorName, channel, hasPngData: !!pngData });
    
    if (!pngData || !pattern || !bgColor || !patternColor) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log('📝 Received PNG data from frontend, size:', pngData.length, 'characters');
    
    // Save PNG data directly to file
    const patternName = pattern.replace('.svg', '');
    const filename = `${bgColorName.replace(/[^a-zA-Z0-9]/g, '_')}_${patternColorName.replace(/[^a-zA-Z0-9]/g, '_')}_${patternName}.png`;
    const pngPath = path.join(__dirname, 'uploads', filename);
    
    // Convert base64 to buffer and save
    const pngBuffer = Buffer.from(pngData, 'base64');
    fs.writeFileSync(pngPath, pngBuffer);
    
    console.log('✅ PNG saved to:', pngPath);
    
    console.log('📤 Uploading PNG to Slack:', {
      channel_id: 'C09FUNUELMV',
      filename: filename,
      file_exists: fs.existsSync(pngPath),
      file_size: fs.statSync(pngPath).size
    });
    
    // Create a new Slack client for this request
    const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Generate shareable URL using the request origin
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    const shareUrl = `${baseUrl}?pattern=${encodeURIComponent(pattern)}&bgColor=${encodeURIComponent(bgColor)}&patternColor=${encodeURIComponent(patternColor)}&bgColorName=${encodeURIComponent(bgColorName)}&patternColorName=${encodeURIComponent(patternColorName)}`;
    
    const result = await slackClient.files.uploadV2({
      channel_id: 'C09FUNUELMV',
      file: fs.createReadStream(pngPath),
      filename: filename,
      title: `Ceramic Pattern: ${pattern}`,
      initial_comment: `🎨 New ceramic pattern design!\n\n*Pattern:* ${pattern.replace('.svg', '')}\n*Background Color:* ${bgColorName} (${bgColor})\n*Pattern Color:* ${patternColorName} (${patternColor})\n\n🔗 <${shareUrl}|View and edit this design>`
    });
    
    console.log('✅ Slack upload result:', result);
    
    // Clean up PNG file
    fs.unlinkSync(pngPath);
    
    res.json({ 
      success: true, 
      message: 'Pattern sent to Slack successfully!',
      file: result.file
    });
    
  } catch (error) {
    console.error('Error in /api/send-to-slack:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      data: error.data,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API endpoint to get available patterns
expressApp.get('/api/patterns', (req, res) => {
  try {
    const patternsDir = path.join(__dirname, 'patterns');
    const patternFiles = fs.readdirSync(patternsDir)
      .filter(file => file.endsWith('.svg'))
      .map(file => ({
        name: file,
        displayName: file.replace('.svg', '').replace(/([A-Z])/g, ' $1').trim()
      }));
    
    res.json({ patterns: patternFiles });
  } catch (error) {
    console.error('Error getting patterns:', error);
    res.status(500).json({ error: 'Failed to get patterns' });
  }
});

// API endpoint to get colors data
expressApp.get('/api/colors', (req, res) => {
  if (colorsData) {
    res.json(colorsData);
  } else {
    res.status(500).json({ error: 'Colors data not available' });
  }
});

// Health check endpoint
expressApp.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    slack: app.client ? 'connected' : 'disconnected'
  });
});

// Serve the main HTML file
expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
expressApp.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start the server
(async () => {
  try {
    // Start Slack app first
    await app.start();
    console.log('⚡️ Slack bot is running!');
    
    // Wait a moment to ensure Slack app is fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start Express server
    const server = expressApp.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📱 Web app available at: http://localhost:${PORT}`);
      console.log(`🔧 API endpoints:`);
      console.log(`   POST /api/send-to-slack - Send pattern to Slack`);
      console.log(`   GET  /api/patterns - Get available patterns`);
      console.log(`   GET  /api/colors - Get colors data`);
      console.log(`   GET  /api/health - Health check`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed.');
        
        try {
          await app.stop();
          console.log('Slack app stopped.');
          process.exit(0);
        } catch (error) {
          console.error('Error during Slack app shutdown:', error);
          process.exit(1);
        }
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
