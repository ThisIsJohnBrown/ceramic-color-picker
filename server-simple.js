const { App } = require('@slack/bolt');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// Helper function to save SVG file (no conversion needed for Slack)
function saveSVG(svgContent, filename) {
  const outputPath = path.join(__dirname, 'uploads', filename);
  fs.writeFileSync(outputPath, svgContent);
  return outputPath;
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
    
    // Save SVG file
    const filename = `ceramic-${pattern.replace('.svg', '')}-${Date.now()}.svg`;
    const svgPath = saveSVG(svgContent, filename);
    
    // Upload to Slack
    const result = await client.files.upload({
      channels: command.channel_id,
      file: fs.createReadStream(svgPath),
      filename: filename,
      title: `Ceramic Pattern: ${pattern}`,
      initial_comment: `🎨 Ceramic pattern generated!\n*Pattern:* ${pattern}\n*Background:* ${bgColor}\n*Pattern Color:* ${patternColor}`
    });
    
    // Clean up SVG file
    fs.unlinkSync(svgPath);
    
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
    const { pattern, bgColor, patternColor, bgColorName, patternColorName, channel } = req.body;
    
    if (!pattern || !bgColor || !patternColor) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Generate SVG
    const svgContent = generateSVG(pattern, bgColor, patternColor);
    
    // Save SVG file
    const filename = `ceramic-${pattern.replace('.svg', '')}-${Date.now()}.svg`;
    const svgPath = saveSVG(svgContent, filename);
    
    // Upload to Slack
    const result = await app.client.files.upload({
      channels: channel || '#color-requests',
      file: fs.createReadStream(svgPath),
      filename: filename,
      title: `Ceramic Pattern: ${pattern}`,
      initial_comment: `🎨 New ceramic pattern design!\n\n*Pattern:* ${pattern.replace('.svg', '')}\n*Background Color:* ${bgColorName} (${bgColor})\n*Pattern Color:* ${patternColorName} (${patternColor})`
    });
    
    // Clean up SVG file
    fs.unlinkSync(svgPath);
    
    res.json({ 
      success: true, 
      message: 'Pattern sent to Slack successfully!',
      file: result.file
    });
    
  } catch (error) {
    console.error('Error in /api/send-to-slack:', error);
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
    // Start Slack app
    await app.start();
    console.log('⚡️ Slack bot is running!');
    
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
