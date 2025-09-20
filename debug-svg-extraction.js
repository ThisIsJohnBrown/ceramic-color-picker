const fs = require('fs');
const path = require('path');

// Test what the SVG extraction would look like
function testSVGExtraction() {
    console.log('🔍 Testing SVG extraction logic...');
    
    // Read the original SVG file
    const svgPath = path.join(__dirname, 'patterns', 'metaAndLines.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    console.log('📄 Original SVG content:');
    console.log('Length:', svgContent.length);
    
    // Check if the path has a fill attribute
    const pathMatch = svgContent.match(/id="path1514"[^>]*/);
    if (pathMatch) {
        console.log('🎯 Path element:', pathMatch[0]);
    }
    
    // Check if there are any style attributes
    const styleMatches = svgContent.match(/style="[^"]*"/g);
    if (styleMatches) {
        console.log('🎨 Style attributes:', styleMatches);
    }
    
    // Simulate what happens when we apply colors via JavaScript
    console.log('\n🔧 Simulating color application...');
    
    // This is what the updateColors() function does
    let modifiedSvg = svgContent;
    
    // Add background color to SVG
    modifiedSvg = modifiedSvg.replace(/<svg[^>]*>/, (match) => {
        if (match.includes('style=')) {
            return match.replace(/style="[^"]*"/, `style="background-color: #ff0000"`);
        } else {
            return match.replace('>', ` style="background-color: #ff0000">`);
        }
    });
    
    // Add fill color to path
    modifiedSvg = modifiedSvg.replace(/id="path1514"[^>]*style="[^"]*"/, (match) => {
        return match.replace(/style="([^"]*)"/, `style="$1; fill: #00ff00;"`);
    });
    
    console.log('✅ Modified SVG:');
    console.log('Length:', modifiedSvg.length);
    
    // Check the path element after modification
    const modifiedPathMatch = modifiedSvg.match(/id="path1514"[^>]*/);
    if (modifiedPathMatch) {
        console.log('🎯 Modified path element:', modifiedPathMatch[0]);
    }
    
    // Check style attributes after modification
    const modifiedStyleMatches = modifiedSvg.match(/style="[^"]*"/g);
    if (modifiedStyleMatches) {
        console.log('🎨 Modified style attributes:', modifiedStyleMatches);
    }
    
    // Save the modified SVG for inspection
    const debugPath = path.join(__dirname, 'debug-modified-svg.svg');
    fs.writeFileSync(debugPath, modifiedSvg);
    console.log('💾 Saved modified SVG to:', debugPath);
}

testSVGExtraction();
