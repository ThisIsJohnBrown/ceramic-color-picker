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
    
    console.log('🚀 Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: width, height: height });
    
    console.log('📄 Loading SVG page...');
    await page.goto(`file://${tempSvgPath}`, { 
      waitUntil: 'load',
      timeout: 10000
    });
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: outputPngPath,
      type: 'png',
      clip: { x: 0, y: 0, width: width, height: height }
    });
    
    console.log('✅ PNG saved to:', outputPngPath);
    return outputPngPath;
    
  } catch (error) {
    console.error('❌ Error in svgToPng:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    // Clean up temp SVG file
    if (fs.existsSync(tempSvgPath)) {
      fs.unlinkSync(tempSvgPath);
    }
  }
}

// Test the new pipeline
async function testNewPipeline() {
  try {
    console.log('🧪 Testing new SVG-to-PNG pipeline...');
    
    // Generate SVG with colors (simulating what the frontend would do)
    const pattern = 'metaAndLines.svg';
    const bgColor = '#ff0000';
    const patternColor = '#00ff00';
    
    console.log('🎨 Generating SVG with colors...');
    const svgContent = generateSVG(pattern, bgColor, patternColor);
    console.log('✅ SVG generated, length:', svgContent.length);
    
    // Save the SVG for inspection
    const debugSvgPath = path.join(__dirname, 'debug-new-pipeline.svg');
    fs.writeFileSync(debugSvgPath, svgContent);
    console.log('📝 Debug SVG saved to:', debugSvgPath);
    
    // Convert SVG to PNG
    console.log('🖼️ Converting SVG to PNG...');
    const pngPath = await svgToPng(svgContent, 800, 600);
    console.log('✅ PNG created:', pngPath);
    
    // Check file size
    const stats = fs.statSync(pngPath);
    console.log('📊 PNG file size:', stats.size, 'bytes');
    
    console.log('🎉 New pipeline test completed successfully!');
    
    // Clean up
    fs.unlinkSync(pngPath);
    fs.unlinkSync(debugSvgPath);
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testNewPipeline();
