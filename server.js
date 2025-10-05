const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { Pool } = require('pg');
require('dotenv').config();

// Try to load Sharp, but don't fail if it's not available
let sharp = null;
try {
  sharp = require('sharp');
  console.log('✅ Sharp loaded successfully');
} catch (error) {
  console.warn('⚠️ Sharp not available:', error.message);
  console.log('🔄 Image processing will use Puppeteer fallback only');
}

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

// Initialize PostgreSQL database
let db = null;
async function initializeDatabase() {
  try {
    // Use Railway's DATABASE_URL or fallback to local connection
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/ceramic_colors';
    
    console.log('🔗 Attempting database connection...');
    console.log('📊 DATABASE_URL present:', !!process.env.DATABASE_URL);
    
    db = new Pool({
      connectionString: connectionString,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });

    // Test connection with timeout
    const client = await Promise.race([
      db.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
    
    console.log('📊 Connected to PostgreSQL database');
    
    // Create toggle_states table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS toggle_states (
        id SERIAL PRIMARY KEY,
        cell_key VARCHAR(255) UNIQUE NOT NULL,
        is_disabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cell_key ON toggle_states(cell_key)
    `);
    
    console.log('✅ Database table and index created successfully');
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️ Toggle states will not be persistent. Using file-based fallback.');
    db = null;
  }
}


// Fallback function to convert SVG to PNG using Sharp (simpler, more reliable)
async function svgToPngSharp(svgContent, width = 800, height = 600) {
  if (!sharp) {
    throw new Error('Sharp is not available');
  }
  
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
    
    // Try Sharp fallback if available
    if (sharp) {
      try {
        return await svgToPngSharp(svgContent, width, height);
      } catch (sharpError) {
        console.error('❌ Both Puppeteer and Sharp failed:', sharpError);
        throw new Error(`SVG conversion failed: ${error.message}. Fallback also failed: ${sharpError.message}`);
      }
    } else {
      console.error('❌ Puppeteer failed and Sharp is not available');
      throw new Error(`SVG conversion failed: ${error.message}. No fallback available.`);
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
    
    // First upload the file
    const fileResult = await client.files.uploadV2({
      channel_id: command.channel_id,
      file: fs.createReadStream(pngPath),
      filename: filename,
      title: `Ceramic Pattern: ${pattern}`
    });

    // Then send a message with interactive buttons
    const messageResult = await client.chat.postMessage({
      channel: command.channel_id,
      text: `🎨 Ceramic pattern generated!`,
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `🎨 Ceramic pattern generated!\n*Pattern:* ${pattern}\n*Background:* ${bgColor}\n*Pattern Color:* ${patternColor}\n\n🔗 <${shareUrl}|View and edit this design>`
          },
          "accessory": {
            "type": "image",
            "image_url": fileResult.file.permalink_public,
            "alt_text": `Ceramic Pattern: ${pattern}`
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": "Catalogue"
              },
              "style": "primary",
              "action_id": "catalogue_pattern",
              "value": fileResult.file.id
            }
          ]
        }
      ]
    });

    const result = { file: fileResult.file, message: messageResult };
    
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

// Handle button clicks
app.action('catalogue_pattern', async ({ ack, body, client }) => {
  await ack();
  
  try {
    console.log('📝 Catalogue button clicked by user:', body.user.username);
    
    // Get the original message
    const messageTs = body.message.ts;
    const channelId = body.channel.id;
    
    // Extract the original message content
    const originalText = body.message.blocks[0].text.text;
    const originalAccessory = body.message.blocks[0].accessory;
    
    // Create updated message with CATALOGUED status
    let updatedText = originalText;
    if (originalText.includes('🎨 New ceramic pattern design!')) {
      updatedText = originalText.replace(
        '🎨 New ceramic pattern design!',
        '🎨 New ceramic pattern design! *CATALOGUED*'
      );
    } else if (originalText.includes('🎨 Ceramic pattern generated!')) {
      updatedText = originalText.replace(
        '🎨 Ceramic pattern generated!',
        '🎨 Ceramic pattern generated! *CATALOGUED*'
      );
    }
    
    // Update the message to remove the button and add CATALOGUED text
    const fallbackText = originalText.includes('🎨 New ceramic pattern design!') 
      ? '🎨 New ceramic pattern design! CATALOGUED'
      : '🎨 Ceramic pattern generated! CATALOGUED';
    
    await client.chat.update({
      channel: channelId,
      ts: messageTs,
      text: fallbackText,
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": updatedText
          },
          "accessory": originalAccessory
        }
      ]
    });
    
    console.log('✅ Message updated with CATALOGUED status');
    
  } catch (error) {
    console.error('❌ Error handling catalogue button click:', error);
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
    
    // Test Slack connection and permissions
    try {
      console.log('🔍 Testing Slack connection...');
      const authTest = await slackClient.auth.test();
      console.log('✅ Slack auth test successful:', {
        ok: authTest.ok,
        url: authTest.url,
        team: authTest.team,
        user: authTest.user,
        bot_id: authTest.bot_id
      });
    } catch (authError) {
      console.error('❌ Slack auth test failed:', authError);
      throw new Error(`Slack authentication failed: ${authError.message}`);
    }
    
    // Generate shareable URL using the request origin
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    const shareUrl = `${baseUrl}?pattern=${encodeURIComponent(pattern)}&bgColor=${encodeURIComponent(bgColor)}&patternColor=${encodeURIComponent(patternColor)}&bgColorName=${encodeURIComponent(bgColorName)}&patternColorName=${encodeURIComponent(patternColorName)}`;
    
    // First upload the file
    let fileResult;
    try {
      console.log('📤 Starting file upload to Slack...');
      console.log('📤 File details:', {
        path: pngPath,
        filename: filename,
        exists: fs.existsSync(pngPath),
        size: fs.existsSync(pngPath) ? fs.statSync(pngPath).size : 'N/A',
        channel: 'C09FUNUELMV'
      });

      // Check if file exists and is readable
      if (!fs.existsSync(pngPath)) {
        throw new Error(`File does not exist: ${pngPath}`);
      }

      const fileStats = fs.statSync(pngPath);
      if (fileStats.size === 0) {
        throw new Error(`File is empty: ${pngPath}`);
      }

      console.log('📤 File is valid, proceeding with upload...');

      fileResult = await slackClient.files.uploadV2({
        channel_id: 'C09FUNUELMV',
        file: fs.createReadStream(pngPath),
        filename: filename,
        title: `Ceramic Pattern: ${pattern}`
      });

      console.log('📤 Slack file upload result:', JSON.stringify(fileResult, null, 2));
      console.log('📤 File result type:', typeof fileResult);
      console.log('📤 File result keys:', fileResult ? Object.keys(fileResult) : 'null');
      
      if (fileResult && fileResult.file) {
        console.log('📤 File object keys:', Object.keys(fileResult.file));
      } else {
        console.log('⚠️ No file object in response, checking for alternative structure...');
        console.log('📤 Full response structure:', fileResult);
      }

    } catch (uploadError) {
      console.error('❌ Slack file upload failed:', uploadError);
      console.error('❌ Upload error details:', {
        message: uploadError.message,
        code: uploadError.code,
        data: uploadError.data,
        status: uploadError.status,
        stack: uploadError.stack
      });
      
      // Try to get more details about the error
      if (uploadError.data) {
        console.error('❌ Error data:', JSON.stringify(uploadError.data, null, 2));
      }
      
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    // Check if file upload was successful and has the expected structure
    if (!fileResult || !fileResult.file) {
      console.error('❌ File upload response structure issue:', {
        hasFileResult: !!fileResult,
        fileResultType: typeof fileResult,
        fileResultKeys: fileResult ? Object.keys(fileResult) : 'null',
        hasFile: fileResult && !!fileResult.file,
        fileKeys: fileResult && fileResult.file ? Object.keys(fileResult.file) : 'null'
      });
      
      // Try alternative upload method
      console.log('🔄 Trying alternative upload method...');
      try {
        const alternativeResult = await slackClient.files.upload({
          channels: 'C09FUNUELMV',
          file: fs.createReadStream(pngPath),
          filename: filename,
          title: `Ceramic Pattern: ${pattern}`
        });
        
        console.log('📤 Alternative upload result:', JSON.stringify(alternativeResult, null, 2));
        
        if (alternativeResult && alternativeResult.file) {
          console.log('✅ Alternative upload successful');
          fileResult = alternativeResult;
        } else {
          throw new Error('Alternative upload also failed');
        }
      } catch (altError) {
        console.error('❌ Alternative upload also failed:', altError);
        
        // Send message without file as final fallback
        console.log('🔄 Sending message without file as fallback...');
        try {
          const fallbackMessage = await slackClient.chat.postMessage({
            channel: 'C09FUNUELMV',
            text: `🎨 New ceramic pattern design!\n\n*Pattern:* ${pattern.replace('.svg', '')}\n*Background Color:* ${bgColorName} (${bgColor})\n*Pattern Color:* ${patternColorName} (${patternColor})\n\n🔗 <${shareUrl}|View and edit this design>\n\n⚠️ Image upload failed, but you can view the design at the link above.`
          });
          
          console.log('✅ Fallback message sent successfully');
          
          // Clean up PNG file
          fs.unlinkSync(pngPath);
          
          return res.json({ 
            success: true, 
            message: 'Pattern sent to Slack successfully (without image due to upload failure)!',
            fallback: true
          });
          
        } catch (fallbackError) {
          console.error('❌ Even fallback message failed:', fallbackError);
          throw new Error('File upload failed - no file object in response and alternative method failed');
        }
      }
    }

    // Get the public URL for the image - try different possible structures
    let imageUrl = null;
    let fileId = null;
    
    try {
      if (fileResult.file.permalink_public) {
        imageUrl = fileResult.file.permalink_public;
      } else if (fileResult.file.url_private) {
        imageUrl = fileResult.file.url_private;
      } else if (fileResult.file.permalink) {
        imageUrl = fileResult.file.permalink;
      } else {
        console.warn('⚠️ No public URL found in file result:', fileResult.file);
        // Continue without image in the message
      }
      
      fileId = fileResult.file.id;
      console.log('🖼️ Using image URL:', imageUrl);
      console.log('📁 File ID:', fileId);
      
    } catch (urlError) {
      console.error('❌ Error accessing file properties:', urlError);
      console.error('❌ File result structure:', fileResult);
      // Continue without image and file ID
    }

    // Build the message blocks
    const messageBlocks = [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `🎨 New ceramic pattern design!\n\n*Pattern:* ${pattern.replace('.svg', '')}\n*Background Color:* ${bgColorName} (${bgColor})\n*Pattern Color:* ${patternColorName} (${patternColor})\n\n🔗 <${shareUrl}|View and edit this design>`
        }
      }
    ];

    // Add image accessory if we have a URL
    if (imageUrl) {
      messageBlocks[0].accessory = {
        "type": "image",
        "image_url": imageUrl,
        "alt_text": `Ceramic Pattern: ${pattern}`
      };
    }

    // Add action buttons only if we have a file ID
    if (fileId) {
      messageBlocks.push({
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Catalogue"
            },
            "style": "primary",
            "action_id": "catalogue_pattern",
            "value": fileId
          }
        ]
      });
    }

    // Then send a message with interactive buttons
    const messageResult = await slackClient.chat.postMessage({
      channel: 'C09FUNUELMV',
      text: `🎨 New ceramic pattern design!`,
      blocks: messageBlocks
    });

    const result = { file: fileResult.file, message: messageResult };
    
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

// API endpoint to save toggle states
expressApp.post('/api/save-toggle-states', async (req, res) => {
  try {
    const { disabledCells } = req.body;
    
    if (!Array.isArray(disabledCells)) {
      return res.status(400).json({ error: 'disabledCells must be an array' });
    }
    
    if (db) {
      // Use database
      const client = await db.connect();
      try {
        // Clear existing states
        await client.query('DELETE FROM toggle_states');
        
        // Insert new states
        if (disabledCells.length > 0) {
          const values = disabledCells.map(cellKey => `('${cellKey}', true)`).join(',');
          await client.query(`INSERT INTO toggle_states (cell_key, is_disabled) VALUES ${values}`);
        }
        
        console.log('💾 Toggle states saved to database:', {
          count: disabledCells.length,
          timestamp: new Date().toISOString()
        });
        
        res.json({ 
          success: true, 
          message: 'Toggle states saved successfully',
          count: disabledCells.length
        });
        
      } finally {
        client.release();
      }
    } else {
      // Fallback to file-based storage
      const statesPath = path.join(__dirname, 'toggle-states.json');
      const statesData = {
        disabledCells,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(statesPath, JSON.stringify(statesData, null, 2));
      
      console.log('💾 Toggle states saved to file (database unavailable):', {
        count: disabledCells.length,
        timestamp: statesData.lastUpdated
      });
      
      res.json({ 
        success: true, 
        message: 'Toggle states saved successfully (file fallback)',
        count: disabledCells.length
      });
    }
    
  } catch (error) {
    console.error('Error saving toggle states:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save toggle states' 
    });
  }
});

// API endpoint to load toggle states
expressApp.get('/api/load-toggle-states', async (req, res) => {
  try {
    if (db) {
      // Use database
      const client = await db.connect();
      try {
        const result = await client.query('SELECT cell_key FROM toggle_states WHERE is_disabled = true');
        const disabledCells = result.rows.map(row => row.cell_key);
        
        console.log('📂 Toggle states loaded from database:', {
          count: disabledCells.length
        });
        
        res.json({ 
          success: true, 
          disabledCells: disabledCells,
          source: 'database'
        });
        
      } finally {
        client.release();
      }
    } else {
      // Fallback to file-based storage
      const statesPath = path.join(__dirname, 'toggle-states.json');
      
      if (!fs.existsSync(statesPath)) {
        return res.json({ 
          success: true, 
          disabledCells: [],
          message: 'No saved states found',
          source: 'file'
        });
      }
      
      const statesData = JSON.parse(fs.readFileSync(statesPath, 'utf8'));
      
      console.log('📂 Toggle states loaded from file:', {
        count: statesData.disabledCells.length,
        lastUpdated: statesData.lastUpdated
      });
      
      res.json({ 
        success: true, 
        disabledCells: statesData.disabledCells || [],
        lastUpdated: statesData.lastUpdated,
        source: 'file'
      });
    }
    
  } catch (error) {
    console.error('Error loading toggle states:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load toggle states' 
    });
  }
});

// API endpoint to send matrix data to Slack
expressApp.post('/api/send-matrix-to-slack', async (req, res) => {
  try {
    const { disabledCells, totalCombinations, enabledCombinations, disabledCombinations, timestamp, underglazeCount, glazeCount, channel, underglazes, glazes } = req.body;
    
    console.log('📥 Received matrix data for Slack:', {
      disabledCells: disabledCells?.length || 0,
      totalCombinations,
      enabledCombinations,
      disabledCombinations,
      underglazeCount,
      glazeCount,
      channel
    });
    
    if (!disabledCells || !Array.isArray(disabledCells)) {
      return res.status(400).json({ error: 'disabledCells must be an array' });
    }
    
    // Create a new Slack client for this request
    const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Generate CSV data
    const csvData = generateMatrixCSV(underglazes || [], glazes || [], disabledCells);
    
    // Save CSV to file
    const csvFilename = `matrix-toggle-states-${Date.now()}.csv`;
    const csvPath = path.join(__dirname, 'uploads', csvFilename);
    
    // Ensure uploads directory exists
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    
    fs.writeFileSync(csvPath, csvData);
    console.log('📄 CSV file created:', csvPath);
    
    // Create a summary message
    const message = `🎨 Ceramic Color Matrix Update!\n\n` +
      `📊 *Matrix Statistics:*\n` +
      `• Total Combinations: ${totalCombinations}\n` +
      `• Enabled: ${enabledCombinations}\n` +
      `• Disabled: ${disabledCombinations}\n` +
      `• Underglazes: ${underglazeCount}\n` +
      `• Glazes: ${glazeCount}\n\n` +
      `🕒 *Last Updated:* ${new Date(timestamp).toLocaleString()}\n\n` +
      `📋 *CSV Export:* Complete toggle states exported to CSV file`;
    
    // Upload CSV file to Slack using the newer uploadV2 method
    const fileResult = await slackClient.files.uploadV2({
      channel_id: 'C09FUNUELMV', // Use channel ID instead of name
      file: fs.createReadStream(csvPath),
      filename: csvFilename,
      title: `Ceramic Matrix Toggle States - ${new Date().toLocaleDateString()}`
    });
    
    // Send the message separately
    const messageResult = await slackClient.chat.postMessage({
      channel: channel || '#color-requests',
      text: message,
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": message
          }
        }
      ]
    });
    
    // Clean up CSV file
    fs.unlinkSync(csvPath);
    
    console.log('✅ Matrix data and CSV sent to Slack successfully');
    
    res.json({ 
      success: true, 
      message: 'Matrix data and CSV sent to Slack successfully!',
      file: fileResult.file,
      message: messageResult
    });
    
  } catch (error) {
    console.error('Error sending matrix data to Slack:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper function to generate CSV data
function generateMatrixCSV(underglazes, glazes, disabledCells) {
  const disabledSet = new Set(disabledCells);
  
  // CSV header
  let csv = 'Underglaze ID,Underglaze Name,Underglaze Color,Pattern ID,Pattern Name,Pattern Color,Cell Key,Is Disabled,Status,Type\n';
  
  // Generate rows for underglaze × glaze combinations
  for (const underglaze of underglazes) {
    for (const glaze of glazes) {
      const cellKey = `${underglaze.id}-${glaze.id}`;
      const isDisabled = disabledSet.has(cellKey);
      const status = isDisabled ? 'Disabled' : 'Enabled';
      
      csv += `"${underglaze.id}","${underglaze.name}","${underglaze.left || underglaze.color}","${glaze.id}","${glaze.name}","${glaze.color}","${cellKey}","${isDisabled}","${status}","UG×Glaze"\n`;
    }
  }
  
  // Generate rows for underglaze × underglaze combinations
  for (const underglaze of underglazes) {
    for (const underglazePattern of underglazes) {
      const cellKey = `${underglaze.id}-${underglazePattern.id}`;
      const isDisabled = disabledSet.has(cellKey);
      const status = isDisabled ? 'Disabled' : 'Enabled';
      
      csv += `"${underglaze.id}","${underglaze.name}","${underglaze.left || underglaze.color}","${underglazePattern.id}","${underglazePattern.name}","${underglazePattern.left || underglazePattern.color}","${cellKey}","${isDisabled}","${status}","UG×UG"\n`;
    }
  }
  
  return csv;
}

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
    console.log('🚀 Starting server...');
    console.log('🔧 Environment variables:');
    console.log('  - SLACK_BOT_TOKEN:', !!process.env.SLACK_BOT_TOKEN);
    console.log('  - SLACK_SIGNING_SECRET:', !!process.env.SLACK_SIGNING_SECRET);
    console.log('  - SLACK_APP_TOKEN:', !!process.env.SLACK_APP_TOKEN);
    console.log('  - DATABASE_URL:', !!process.env.DATABASE_URL);
    
    // Initialize database first
    await initializeDatabase();
    
    // Start Slack app
    try {
      await app.start();
      console.log('⚡️ Slack bot is running!');
    } catch (slackError) {
      console.error('❌ Slack app failed to start:', slackError.message);
      console.log('⚠️ Slack features will not be available');
    }
    
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
