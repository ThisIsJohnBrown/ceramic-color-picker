const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function scrapeAmacoUnderglazes() {
  const browser = await puppeteer.launch({ 
    headless: true, // Set to true for production
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const products = [];
    let currentPage = 1;
    let hasNextPage = true;
    
    console.log('Starting to scrape AMACO Velvet Underglazes...');
    
    while (hasNextPage) {
      console.log(`Scraping page ${currentPage}...`);
      
      const url = `https://shop.amaco.com/glazes-underglazes/underglazes/v-velvet-underglaze/?page=${currentPage}`;
      console.log(`Navigating to: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      } catch (error) {
        console.log(`Error loading page ${currentPage}:`, error.message);
        // Try with a simpler wait condition
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }
      
      // Wait for products to load
      try {
        await page.waitForSelector('.product-item, .product-tile, [class*="product"]', { timeout: 10000 });
      } catch (error) {
        console.log(`No product selector found on page ${currentPage}, trying alternative selectors...`);
        // Try alternative selectors
        try {
          await page.waitForSelector('h3, h4, .product-name, .product-title', { timeout: 5000 });
        } catch (e) {
          console.log(`No products found on page ${currentPage}, skipping...`);
          currentPage++;
          continue;
        }
      }
      
      // Extract product information from current page
      const pageProducts = await page.evaluate(() => {
        const productElements = document.querySelectorAll('.product-item, .product-tile, [class*="product"]');
        const products = [];
        
        productElements.forEach((element, index) => {
          try {
            // Try different selectors for product name
            let name = '';
            const nameSelectors = [
              'h3', 'h4', '.product-name', '.product-title', 
              '[class*="name"]', '[class*="title"]'
            ];
            
            for (const selector of nameSelectors) {
              const nameEl = element.querySelector(selector);
              if (nameEl && nameEl.textContent.trim()) {
                name = nameEl.textContent.trim();
                break;
              }
            }
            
            // Try to extract product ID from name or other attributes
            let id = '';
            if (name) {
              // Extract V-XXX pattern from name
              const idMatch = name.match(/V-\d+/);
              if (idMatch) {
                id = idMatch[0];
              }
            }
            
            // Try different selectors for product image
            let imageUrl = '';
            const imageSelectors = [
              'img', '.product-image img', '[class*="image"] img'
            ];
            
            for (const selector of imageSelectors) {
              const imgEl = element.querySelector(selector);
              if (imgEl) {
                imageUrl = imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy');
                if (imageUrl) {
                  // Convert relative URLs to absolute
                  if (imageUrl.startsWith('//')) {
                    imageUrl = 'https:' + imageUrl;
                  } else if (imageUrl.startsWith('/')) {
                    imageUrl = 'https://shop.amaco.com' + imageUrl;
                  }
                  break;
                }
              }
            }
            
            if (name) {
              products.push({
                id: id || `product-${index}`,
                name: name,
                imageUrl: imageUrl || ''
              });
            }
          } catch (error) {
            console.log('Error extracting product:', error);
          }
        });
        
        return products;
      });
      
      console.log(`Found ${pageProducts.length} products on page ${currentPage}`);
      products.push(...pageProducts);
      
      // Check if there's a next page
      const nextPageExists = await page.evaluate(() => {
        const nextButton = document.querySelector('a[rel="next"], .next, [class*="next"]');
        return nextButton && !nextButton.classList.contains('disabled');
      });
      
      if (!nextPageExists) {
        hasNextPage = false;
        console.log('No more pages found');
      } else {
        currentPage++;
        // Add a small delay between requests
        await page.waitForTimeout(2000);
      }
    }
    
    console.log(`Total products scraped: ${products.length}`);
    
    // Write to CSV
    const csvWriter = createCsvWriter({
      path: 'amaco-velvet-underglazes.csv',
      header: [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'imageUrl', title: 'Image URL' }
      ]
    });
    
    await csvWriter.writeRecords(products);
    console.log('CSV file created: amaco-velvet-underglazes.csv');
    
    // Also log first few products for verification
    console.log('\nFirst 5 products:');
    products.slice(0, 5).forEach(product => {
      console.log(`- ${product.id}: ${product.name}`);
    });
    
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeAmacoUnderglazes().catch(console.error);
