const axios = require('axios');
const cheerio = require('cheerio');

async function debugProductLinks() {
  const axiosInstance = axios.create({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    timeout: 30000
  });
  
  try {
    const url = 'https://shop.amaco.com/glazes-underglazes/underglazes/v-velvet-underglaze/?page=1';
    console.log(`Fetching: ${url}`);
    
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);
    
    console.log('\n=== All links on the page ===');
    const allLinks = $('a[href]');
    console.log(`Found ${allLinks.length} total links`);
    
    allLinks.each((index, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      if (href && (href.includes('product') || text.includes('Underglaze'))) {
        console.log(`${index}: ${href} - "${text}"`);
      }
    });
    
    console.log('\n=== Product-specific selectors ===');
    
    // Try different selectors
    const selectors = [
      'a[href*="/products/"]',
      'a[href*="product"]',
      '.product-item a',
      '.product-tile a',
      '[class*="product"] a',
      'h3 a',
      'h4 a',
      '.product-name a',
      '.product-title a'
    ];
    
    selectors.forEach(selector => {
      const elements = $(selector);
      console.log(`\nSelector "${selector}": ${elements.length} elements`);
      elements.each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        console.log(`  ${index}: ${href} - "${text}"`);
      });
    });
    
    // Look for any elements containing "V-301" or similar
    console.log('\n=== Elements containing product IDs ===');
    const idElements = $('*:contains("V-301"), *:contains("V-303"), *:contains("V-304")');
    console.log(`Found ${idElements.length} elements with product IDs`);
    idElements.each((index, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      const href = $el.attr('href') || $el.find('a').attr('href');
      console.log(`${index}: "${text.substring(0, 50)}..." - href: ${href}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugProductLinks();
