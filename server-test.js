const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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

// Helper function to save SVG file
function saveSVG(svgContent, filename) {
  const outputPath = path.join(__dirname, 'uploads', filename);
  fs.writeFileSync(outputPath, svgContent);
  return outputPath;
}

// API endpoint for web app integration (test mode - no Slack)
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
    
    // In test mode, just return the file path instead of uploading to Slack
    res.json({ 
      success: true, 
      message: 'Pattern generated successfully! (Test mode - no Slack upload)',
      file: {
        name: filename,
        path: svgPath,
        url: `/uploads/${filename}`
      },
      note: 'Configure Slack tokens in .env to enable Slack upload'
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
    mode: 'test',
    slack: 'not configured'
  });
});

// Serve the main HTML file
expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve uploaded files
expressApp.use('/uploads', express.static('uploads'));

// Error handling middleware
expressApp.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start the server
const server = expressApp.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server is running on port ${PORT}`);
  console.log(`📱 Web app available at: http://localhost:${PORT}`);
  console.log(`🔧 API endpoints:`);
  console.log(`   POST /api/send-to-slack - Generate pattern (test mode)`);
  console.log(`   GET  /api/patterns - Get available patterns`);
  console.log(`   GET  /api/colors - Get colors data`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚠️  Running in TEST MODE - Slack integration disabled`);
  console.log(`   Configure Slack tokens in .env to enable full functionality`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
