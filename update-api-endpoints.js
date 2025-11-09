// This script helps update API endpoints in your frontend code
// Run this script with Node.js to update your JavaScript files

const fs = require('fs');
const path = require('path');

// Define the endpoint mappings
const endpointMappings = [
  {
    old: '/api/auth/login',
    new: '/api/auth-consolidated/login'
  },
  {
    old: '/api/auth/verify',
    new: '/api/auth-consolidated/verify'
  },
  {
    old: '/api/routes/products',
    new: '/api/routes-consolidated/products'
  },
  {
    old: '/api/routes/categories',
    new: '/api/routes-consolidated/categories'
  },
  {
    old: '/api/routes/orders',
    new: '/api/routes-consolidated/orders'
  }
];

// Function to update a file
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Apply each endpoint mapping
    endpointMappings.forEach(mapping => {
      const regex = new RegExp(mapping.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.match(regex)) {
        content = content.replace(regex, mapping.new);
        changed = true;
        console.log(`Updated ${mapping.old} to ${mapping.new} in ${filePath}`);
      }
    });

    // Write the file back if changes were made
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Function to recursively find and update all JavaScript files
function updateDirectory(dirPath) {
  let filesUpdated = 0;

  try {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and api directories
        if (file !== 'node_modules' && file !== 'api') {
          filesUpdated += updateDirectory(filePath);
        }
      } else if (file.endsWith('.js') || file.endsWith('.html')) {
        if (updateFile(filePath)) {
          filesUpdated++;
        }
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}: ${error.message}`);
  }

  return filesUpdated;
}

// Main execution
console.log('Starting API endpoint update...');
const rootDir = process.cwd();
const totalFilesUpdated = updateDirectory(rootDir);

console.log(`\nUpdate complete. ${totalFilesUpdated} files were modified.`);
console.log('\nPlease review the changes and commit them to your repository.');
