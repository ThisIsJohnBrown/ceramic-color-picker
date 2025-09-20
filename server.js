const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
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
expressApp.use(express.json());
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

// Helper function to generate SVG with colors
function generateSVG(pattern, bgColor, patternColor) {
  const patternPath = path.join(__dirname, 'patterns', pattern);
  
  if (!fs.existsSync(patternPath)) {
    throw new Error(`Pattern file not found: ${pattern}`);
  }
  
  let svgContent = fs.readFileSync(patternPath, 'utf8');
  
  // Update background color
  svgContent = svgContent.replace(/<svg[^>]*>/, (match) => {
    if (match.includes('style=')) {
      return match.replace(/style="[^"]*"/, `style="background-color: ${bgColor}"`);
    } else {
      return match.replace('>', ` style="background-color: ${bgColor}">`);
    }
  });
  
  // Update pattern color based on pattern type
  if (pattern === 'metaAndLines.svg') {
    svgContent = svgContent.replace(/id="path1514"[^>]*fill="[^"]*"/, `id="path1514" fill="${patternColor}"`);
  } else {
    // For other patterns, update the first path element
    svgContent = svgContent.replace(/<path[^>]*fill="[^"]*"/, (match) => {
      return match.replace(/fill="[^"]*"/, `fill="${patternColor}"`);
    });
  }
  
  return svgContent;
}

// Helper function to convert SVG to PNG using Puppeteer with tight cropping
async function svgToPng(svgContent, width = 800, height = 600) {
  const tempSvgPath = path.join(__dirname, 'uploads', `temp_${Date.now()}.svg`);
  const outputPngPath = path.join(__dirname, 'uploads', `output_${Date.now()}.png`);
  
  let browser;
  
  try {
    console.log('📝 Writing SVG to temp file:', tempSvgPath);
    // Write SVG to temporary file
    fs.writeFileSync(tempSvgPath, svgContent);
    
    console.log('🚀 Launching Puppeteer browser...');
    // Launch Puppeteer browser with more robust configuration
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      timeout: 30000, // 30 second timeout
      protocolTimeout: 30000
    });
    
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
    
    console.log('📐 Getting bounding box...');
    // Get the bounding box of the SVG content to crop tightly
    const boundingBox = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return null;
      
      // Get the viewBox or calculate bounds
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const [x, y, w, h] = viewBox.split(' ').map(Number);
        return { x, y, width: w, height: h };
      }
      
      // Fallback: get bounding box of all elements
      const bbox = svg.getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    });
    
    console.log('📸 Taking screenshot...');
    if (boundingBox) {
      // Add some padding around the pattern
      const padding = 20;
      const clip = {
        x: Math.max(0, boundingBox.x - padding),
        y: Math.max(0, boundingBox.y - padding),
        width: boundingBox.width + (padding * 2),
        height: boundingBox.height + (padding * 2)
      };
      
      // Take screenshot with clipping
      await page.screenshot({
        path: outputPngPath,
        type: 'png',
        clip: clip
      });
    } else {
      // Fallback: take full page screenshot
      await page.screenshot({
        path: outputPngPath,
        type: 'png',
        fullPage: true
      });
    }
    
    console.log('✅ Screenshot saved to:', outputPngPath);
    
    // Clean up temporary SVG file
    fs.unlinkSync(tempSvgPath);
    
    return outputPngPath;
  } catch (error) {
    console.error('❌ Error in svgToPng:', error);
    // Clean up on error
    if (fs.existsSync(tempSvgPath)) {
      fs.unlinkSync(tempSvgPath);
    }
    throw error;
  } finally {
    if (browser) {
      console.log('🔒 Closing browser...');
      await browser.close();
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
    
    // Generate SVG
    const svgContent = generateSVG(pattern, bgColor, patternColor);
    
    // Convert SVG to PNG
    const pngPath = await svgToPng(svgContent);
    
    // Upload PNG to Slack
    const filename = `ceramic-${pattern.replace('.svg', '')}-${Date.now()}.png`;
    const result = await client.files.uploadV2({
      channel_id: command.channel_id,
      file: fs.createReadStream(pngPath),
      filename: filename,
      title: `Ceramic Pattern: ${pattern}`,
      initial_comment: `🎨 Ceramic pattern generated!\n*Pattern:* ${pattern}\n*Background:* ${bgColor}\n*Pattern Color:* ${patternColor}`
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
expressApp.post('/api/send-to-slack', upload.single('image'), async (req, res) => {
  try {
    console.log('📥 Received request to /api/send-to-slack');
    const { pattern, bgColor, patternColor, bgColorName, patternColorName, channel } = req.body;
    
    console.log('📋 Request data:', { pattern, bgColor, patternColor, bgColorName, patternColorName, channel });
    
    if (!pattern || !bgColor || !patternColor) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log('🎨 Generating SVG...');
    // Generate SVG
    const svgContent = generateSVG(pattern, bgColor, patternColor);
    console.log('✅ SVG generated, length:', svgContent.length);
    
    console.log('📁 Saving SVG file...');
    // Save SVG directly instead of converting to PNG
    const filename = `ceramic-${pattern.replace('.svg', '')}-${Date.now()}.svg`;
    const svgPath = path.join(__dirname, 'uploads', filename);
    fs.writeFileSync(svgPath, svgContent);
    
    console.log('📤 Uploading SVG to Slack:', {
      channel_id: 'C09FUNUELMV',
      filename: filename,
      file_exists: fs.existsSync(svgPath),
      file_size: fs.statSync(svgPath).size
    });
    
    // Create a new Slack client for this request
    const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    const result = await slackClient.files.uploadV2({
      channel_id: 'C09FUNUELMV',
      file: fs.createReadStream(svgPath),
      filename: filename,
      title: `Ceramic Pattern: ${pattern}`,
      initial_comment: `🎨 New ceramic pattern design!\n\n*Pattern:* ${pattern.replace('.svg', '')}\n*Background Color:* ${bgColorName} (${bgColor})\n*Pattern Color:* ${patternColorName} (${patternColor})`
    });
    
    console.log('✅ Slack upload result:', result);
    
    // Clean up SVG file
    fs.unlinkSync(svgPath);
    
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
