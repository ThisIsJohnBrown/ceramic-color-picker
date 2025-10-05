const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function scrapeAmacoUnderglazes() {
  const browser = await puppeteer.launch({ 
    headless: "new",
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
    const seenProducts = new Set(); // To avoid duplicates
    let currentPage = 1;
    let hasNextPage = true;
    let maxPages = 10; // Safety limit
    
    console.log('Starting to scrape AMACO Velvet Underglazes...');
    
    while (hasNextPage && currentPage <= maxPages) {
      console.log(`Scraping page ${currentPage}...`);
      
      const url = `https://shop.amaco.com/glazes-underglazes/underglazes/v-velvet-underglaze/?page=${currentPage}`;
      console.log(`Navigating to: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      } catch (error) {
        console.log(`Error loading page ${currentPage}:`, error.message);
        // Try with a simpler wait condition
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
          console.log(`Failed to load page ${currentPage}, stopping...`);
          break;
        }
      }
      
      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);
      
      // Extract product information from current page
      const pageProducts = await page.evaluate(() => {
        const products = [];
        
        // Look for product containers - try multiple selectors
        const productSelectors = [
          '.product-item',
          '.product-tile', 
          '[class*="product"]',
          '.card',
          '.item'
        ];
        
        let productElements = [];
        for (const selector of productSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            productElements = elements;
            console.log(`Found ${elements.length} products using selector: ${selector}`);
            break;
          }
        }
        
        // If no product containers found, look for any elements with product names
        if (productElements.length === 0) {
          const nameElements = document.querySelectorAll('h3, h4, h5, .product-name, .product-title, [class*="name"], [class*="title"]');
          productElements = Array.from(nameElements).map(el => el.closest('div') || el.parentElement).filter(Boolean);
          console.log(`Found ${productElements.length} products using name-based approach`);
        }
        
        productElements.forEach((element, index) => {
          try {
            // Try different selectors for product name
            let name = '';
            const nameSelectors = [
              'h3', 'h4', 'h5', '.product-name', '.product-title', 
              '[class*="name"]', '[class*="title"]', 'a[title]'
            ];
            
            for (const selector of nameSelectors) {
              const nameEl = element.querySelector(selector);
              if (nameEl && nameEl.textContent.trim()) {
                name = nameEl.textContent.trim();
                break;
              }
            }
            
            // If no name found, try getting title attribute
            if (!name) {
              const linkEl = element.querySelector('a[title]');
              if (linkEl && linkEl.getAttribute('title')) {
                name = linkEl.getAttribute('title').trim();
              }
            }
            
            // Skip if no name found
            if (!name) return;
            
            // Try to extract product ID from name
            let id = '';
            const idMatch = name.match(/V-\d+/);
            if (idMatch) {
              id = idMatch[0];
            } else {
              // Generate ID from name if no V-XXX pattern found
              id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            }
            
            // Try different selectors for product image
            let imageUrl = '';
            const imageSelectors = [
              'img', '.product-image img', '[class*="image"] img', 'picture img'
            ];
            
            for (const selector of imageSelectors) {
              const imgEl = element.querySelector(selector);
              if (imgEl) {
                imageUrl = imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy') || imgEl.getAttribute('data-original');
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
            
            products.push({
              id: id,
              name: name,
              imageUrl: imageUrl || ''
            });
          } catch (error) {
            console.log('Error extracting product:', error);
          }
        });
        
        return products;
      });
      
      console.log(`Found ${pageProducts.length} products on page ${currentPage}`);
      
      // Add unique products to our collection
      pageProducts.forEach(product => {
        const key = `${product.id}-${product.name}`;
        if (!seenProducts.has(key)) {
          seenProducts.add(key);
          products.push(product);
        }
      });
      
      // Check if there's a next page
      const nextPageExists = await page.evaluate(() => {
        // Look for pagination controls
        const nextSelectors = [
          'a[rel="next"]',
          '.next',
          '[class*="next"]',
          '.pagination .next',
          '.pager .next'
        ];
        
        for (const selector of nextSelectors) {
          const nextButton = document.querySelector(selector);
          if (nextButton && !nextButton.classList.contains('disabled') && !nextButton.classList.contains('inactive')) {
            return true;
          }
        }
        
        // Also check for page numbers
        const pageNumbers = document.querySelectorAll('.pagination a, .pager a, [class*="page"] a');
        let maxPageNum = 0;
        pageNumbers.forEach(link => {
          const text = link.textContent.trim();
          const pageNum = parseInt(text);
          if (!isNaN(pageNum) && pageNum > maxPageNum) {
            maxPageNum = pageNum;
          }
        });
        
        return maxPageNum > 1;
      });
      
      if (!nextPageExists || pageProducts.length === 0) {
        hasNextPage = false;
        console.log('No more pages found or no products on current page');
      } else {
        currentPage++;
        // Add a small delay between requests
        await page.waitForTimeout(3000);
      }
    }
    
    console.log(`Total unique products scraped: ${products.length}`);
    
    // Write to CSV
    const csvWriter = createCsvWriter({
      path: 'amaco-velvet-underglazes-clean.csv',
      header: [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'imageUrl', title: 'Image URL' }
      ]
    });
    
    await csvWriter.writeRecords(products);
    console.log('CSV file created: amaco-velvet-underglazes-clean.csv');
    
    // Log all products for verification
    console.log('\nAll products found:');
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.id}: ${product.name}`);
    });
    
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeAmacoUnderglazes().catch(console.error);


