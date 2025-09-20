const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Helper function to generate SVG with colors (copied from server.js)
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
    // For metaAndLines.svg, add fill to the style attribute of the path with id="path1514"
    svgContent = svgContent.replace(/id="path1514"[^>]*style="[^"]*"/, (match) => {
      return match.replace(/style="([^"]*)"/, `style="$1; fill: ${patternColor};"`);
    });
  } else {
    // For other patterns, update the first path element
    svgContent = svgContent.replace(/<path[^>]*fill="[^"]*"/, (match) => {
      return match.replace(/fill="[^"]*"/, `fill="${patternColor}"`);
    });
  }
  
  return svgContent;
}

// Helper function to convert SVG to PNG using Puppeteer
async function svgToPng(svgContent, width = 800, height = 600) {
  const tempSvgPath = path.join(__dirname, 'uploads', `test_${Date.now()}.svg`);
  const outputPngPath = path.join(__dirname, 'uploads', `test_output_${Date.now()}.png`);
  
  let browser;
  
  try {
    console.log('📝 Writing SVG to temp file:', tempSvgPath);
    // Write SVG to temporary file
    fs.writeFileSync(tempSvgPath, svgContent);
    
    console.log('🚀 Launching Puppeteer browser...');
    // Launch Puppeteer browser with simpler configuration
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      ],
      timeout: 10000
    });
    
    console.log('📄 Creating new page...');
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width, height });
    
    console.log('🌐 Loading SVG file...');
    // Load the SVG file
    const fileUrl = `file://${tempSvgPath}`;
    await page.goto(fileUrl, { 
      waitUntil: 'load',
      timeout: 10000
    });
    
    console.log('📸 Taking screenshot...');
    // Take full page screenshot
    await page.screenshot({
      path: outputPngPath,
      type: 'png',
      fullPage: true
    });
    
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

// Test function
async function testFullPipeline() {
  try {
    console.log('🧪 Testing full SVG to PNG pipeline...');
    
    // Ensure uploads directory exists
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    
    // Generate a test SVG with very distinct colors
    console.log('🎨 Generating test SVG with red background and bright blue pattern...');
    const svgContent = generateSVG('metaAndLines.svg', '#ff0000', '#00ff00'); // Red bg, bright green pattern
    
    console.log('✅ SVG generated, length:', svgContent.length);
    
    // Check if colors were applied in the SVG
    if (svgContent.includes('background-color: #ff0000')) {
      console.log('✅ Background color found in SVG');
    } else {
      console.log('❌ Background color NOT found in SVG');
    }
    
    if (svgContent.includes('fill="#00ff00"')) {
      console.log('✅ Pattern color found in SVG');
    } else {
      console.log('❌ Pattern color NOT found in SVG');
      // Let's see what the path element looks like
      const pathMatch = svgContent.match(/id="path1514"[^>]*/);
      if (pathMatch) {
        console.log('Path element:', pathMatch[0]);
      }
    }
    
    // Save the SVG for inspection
    fs.writeFileSync('debug-test.svg', svgContent);
    console.log('📁 Debug SVG saved as debug-test.svg');
    
    // Convert to PNG
    console.log('🖼️ Converting SVG to PNG...');
    const pngPath = await svgToPng(svgContent, 800, 600);
    console.log('✅ PNG conversion successful!');
    
    // Check if PNG file exists and has content
    if (fs.existsSync(pngPath)) {
      const stats = fs.statSync(pngPath);
      console.log('📊 PNG file stats:', {
        size: stats.size,
        path: pngPath
      });
      
      if (stats.size > 0) {
        console.log('🎉 Full pipeline test completed! Check the PNG file to see if colors are correct.');
        console.log('🔍 PNG file location:', pngPath);
        console.log('🔍 SVG file location: debug-test.svg');
      } else {
        console.log('❌ PNG file is empty');
      }
    } else {
      console.log('❌ PNG file was not created');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFullPipeline();
