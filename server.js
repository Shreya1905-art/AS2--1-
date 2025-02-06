const express = require('express');
const path = require('path');
const storeService = require('./store-service');

const app = express();
const PORT = process.env.PORT || 8080; // Set the port from environment variable or default to 8080

// Serve static files from the 'public' and 'views' directories
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files (e.g., images, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'views')));   // Serve static files from the 'views' folder

// Route for the homepage (redirects to '/about')
app.get('/', (req, res) => {
  res.redirect('/about');  // Automatically redirect to the 'about' page
});

// Route for '/about' page
app.get('/about', (req, res) => {
  // Send the 'about.html' file located in the 'views' directory
  res.sendFile(path.resolve(__dirname, 'views', 'about.html'));
});

// Route to get published items for the shop
app.get('/shop', async (req, res) => {
  try {
    // Fetch published items from the storeService
    const items = await storeService.getPublishedItems();
    res.json(items);  // Respond with the list of published items in JSON format
  } catch (err) {
    // In case of error, return a 500 status code and the error message
    res.status(500).json({ message: err.message || 'Error fetching published items' });
  }
});

// Route to get all items in the store
app.get('/items', async (req, res) => {
  try {
    // Fetch all items from the storeService
    const items = await storeService.getAllItems();
    res.json(items);  // Respond with the list of all items in JSON format
  } catch (err) {
    // In case of error, return a 500 status code and the error message
    res.status(500).json({ message: err.message || 'Error fetching items' });
  }
});

// Route to get categories of items in the store
app.get('/categories', async (req, res) => {
  try {
    // Fetch categories from the storeService
    const categories = await storeService.getCategories();
    res.json(categories);  // Respond with the list of categories in JSON format
  } catch (err) {
    // In case of error, return a 500 status code and the error message
    res.status(500).json({ message: err.message || 'Error fetching categories' });
  }
});

// 404 Route - Handles unmatched routes
app.use((req, res) => {
  res.status(404).send('Page Not Found');  // Respond with a 404 status for any unmatched route
});

// Initialize store service and start the server
storeService.initialize()
  .then(() => {
    // If initialization is successful, start the server on the specified port
    app.listen(PORT, () => {
      console.log('✅ Server running on port ${PORT}');
    });
  })
  .catch((err) => {
    // If initialization fails, log the error
    console.error('❌ Failed to initialize store service: ${err}');
  });