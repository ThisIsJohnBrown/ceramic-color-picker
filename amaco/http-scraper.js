const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function scrapeAmacoUnderglazes() {
  const products = [];
  const seenProducts = new Set();
  let currentPage = 1;
  let hasNextPage = true;
  let maxPages = 10; // Safety limit
  
  console.log('Starting to scrape AMACO Velvet Underglazes...');
  
  // Set up axios with proper headers
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
  
  while (hasNextPage && currentPage <= maxPages) {
    console.log(`Scraping page ${currentPage}...`);
    
    const url = `https://shop.amaco.com/glazes-underglazes/underglazes/v-velvet-underglaze/?page=${currentPage}`;
    console.log(`Fetching: ${url}`);
    
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      
      // Look for product containers
      const productElements = $('.product-item, .product-tile, [class*="product"], .card, .item');
      
      console.log(`Found ${productElements.length} product elements on page ${currentPage}`);
      
      if (productElements.length === 0) {
        // Try alternative approach - look for any elements with product names
        const nameElements = $('h3, h4, h5, .product-name, .product-title, [class*="name"], [class*="title"]');
        console.log(`Found ${nameElements.length} name elements, trying alternative approach...`);
        
        nameElements.each((index, element) => {
          const $el = $(element);
          const name = $el.text().trim();
          
          if (name && name.includes('Underglaze')) {
            const idMatch = name.match(/V-\d+/);
            const id = idMatch ? idMatch[0] : `product-${index}`;
            
            // Look for image in parent or nearby elements
            let imageUrl = '';
            const $parent = $el.closest('div');
            const $img = $parent.find('img').first();
            if ($img.length) {
              imageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy');
              if (imageUrl && imageUrl.startsWith('/')) {
                imageUrl = 'https://shop.amaco.com' + imageUrl;
              }
            }
            
            const key = `${id}-${name}`;
            if (!seenProducts.has(key)) {
              seenProducts.add(key);
              products.push({
                id: id,
                name: name,
                imageUrl: imageUrl || ''
              });
            }
          }
        });
      } else {
        // Process product elements
        productElements.each((index, element) => {
          const $el = $(element);
          
          // Try different selectors for product name
          let name = '';
          const nameSelectors = ['h3', 'h4', 'h5', '.product-name', '.product-title', '[class*="name"]', '[class*="title"]', 'a[title]'];
          
          for (const selector of nameSelectors) {
            const nameEl = $el.find(selector).first();
            if (nameEl.length && nameEl.text().trim()) {
              name = nameEl.text().trim();
              break;
            }
          }
          
          // If no name found, try getting title attribute
          if (!name) {
            const linkEl = $el.find('a[title]').first();
            if (linkEl.length) {
              name = linkEl.attr('title');
            }
          }
          
          if (!name) return;
          
          // Extract product ID from name
          let id = '';
          const idMatch = name.match(/V-\d+/);
          if (idMatch) {
            id = idMatch[0];
          } else {
            id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          }
          
          // Try different selectors for product image
          let imageUrl = '';
          const imageSelectors = ['img', '.product-image img', '[class*="image"] img', 'picture img'];
          
          for (const selector of imageSelectors) {
            const imgEl = $el.find(selector).first();
            if (imgEl.length) {
              imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy') || imgEl.attr('data-original');
              if (imageUrl) {
                if (imageUrl.startsWith('//')) {
                  imageUrl = 'https:' + imageUrl;
                } else if (imageUrl.startsWith('/')) {
                  imageUrl = 'https://shop.amaco.com' + imageUrl;
                }
                break;
              }
            }
          }
          
          const key = `${id}-${name}`;
          if (!seenProducts.has(key)) {
            seenProducts.add(key);
            products.push({
              id: id,
              name: name,
              imageUrl: imageUrl || ''
            });
          }
        });
      }
      
      console.log(`Found ${products.length - seenProducts.size + productElements.length} new products on page ${currentPage}`);
      
      // Check for pagination
      const nextPageExists = $('a[rel="next"], .next, [class*="next"], .pagination .next, .pager .next').length > 0;
      
      // Also check for page numbers
      const pageNumbers = $('.pagination a, .pager a, [class*="page"] a');
      let maxPageNum = 0;
      pageNumbers.each((index, element) => {
        const text = $(element).text().trim();
        const pageNum = parseInt(text);
        if (!isNaN(pageNum) && pageNum > maxPageNum) {
          maxPageNum = pageNum;
        }
      });
      
      if (!nextPageExists && maxPageNum <= currentPage) {
        hasNextPage = false;
        console.log('No more pages found');
      } else if (productElements.length === 0) {
        hasNextPage = false;
        console.log('No products found on current page, stopping');
      } else {
        currentPage++;
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`Error fetching page ${currentPage}:`, error.message);
      hasNextPage = false;
    }
  }
  
  console.log(`Total unique products scraped: ${products.length}`);
  
  // Write to CSV
  const csvWriter = createCsvWriter({
    path: 'amaco-velvet-underglazes-final.csv',
    header: [
      { id: 'id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'imageUrl', title: 'Image URL' }
    ]
  });
  
  await csvWriter.writeRecords(products);
  console.log('CSV file created: amaco-velvet-underglazes-final.csv');
  
  // Log all products for verification
  console.log('\nAll products found:');
  products.forEach((product, index) => {
    console.log(`${index + 1}. ${product.id}: ${product.name}`);
  });
}

// Run the scraper
scrapeAmacoUnderglazes().catch(console.error);
