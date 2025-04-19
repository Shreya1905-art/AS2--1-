const fs = require('fs').promises;
const path = require('path');

let items = [];
let categories = [];

async function initialize() {
  try {
    const itemsData = await fs.readFile(path.join(__dirname, 'data', 'items.json'), 'utf8');
    const categoriesData = await fs.readFile(path.join(__dirname, 'data', 'categories.json'), 'utf8');
    
    items = JSON.parse(itemsData);
    categories = JSON.parse(categoriesData);
    
    return "Initialization successful";
  } catch (error) {
    throw 'Error initializing store service: ${error.message}';
  }
}

function getAllItems() {
  return new Promise((resolve, reject) => {
    items.length > 0 
      ? resolve(items) 
      : reject("No items found");
  });
}

function getPublishedItems() {
  return new Promise((resolve, reject) => {
    const publishedItems = items.filter(item => item.published);
    publishedItems.length > 0
      ? resolve(publishedItems)
      : reject("No published items found");
  });
}

function getCategories() {
  return new Promise((resolve, reject) => {
    categories.length > 0
      ? resolve(categories)
      : reject("No categories found");
  });
}

module.exports = {
  initialize,
  getAllItems,
  getPublishedItems,
  getCategories
};