/*********************************************************************************
* WEB322 – Assignment 03
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students.
*
* Name: Shreya Patel Student ID: 175918234 Date: 2025-03-05
*
* Cyclic Web App URL: https://replit.com/@sapatel1905/AS2-1-
*
* GitHub Repository URL: https://github.com/Shreya1905-art/AS2--1-
*
********************************************************************************/
const express = require('express');
const path = require('path');
const storeService = require('./store-service');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
const PORT = process.env.PORT || 8080;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'Your_Cloud_Name',
  api_key: 'Your_API_Key',
  api_secret: 'Your_API_Secret',
  secure: true
});

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Multer setup for file uploads
const upload = multer();

// Serve static files from 'public' and 'views' directories
app.use(express.static('public'));
app.use(express.static('views'));

// Routes
app.get('/', (req, res) => {
  res.redirect('/about');
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/shop', async (req, res) => {
  try {
    const items = await storeService.getPublishedItems();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error fetching published items' });
  }
});

// Updated /items route to support filtering
app.get('/items', async (req, res) => {
  try {
    if (req.query.category) {
      const items = await storeService.getItemsByCategory(req.query.category);
      return res.json(items);
    }
    if (req.query.minDate) {
      const items = await storeService.getItemsByMinDate(req.query.minDate);
      return res.json(items);
    }
    const items = await storeService.getAllItems();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error fetching items' });
  }
});

// Fetch a single item by ID
app.get('/item/:id', async (req, res) => {
  try {
    const item = await storeService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching item" });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const categories = await storeService.getCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error fetching categories' });
  }
});

// Route to serve addItem.html
app.get('/items/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'addItem.html'));
});

// Route to handle form submission and image upload
app.post('/items/add', upload.single('featureImage'), async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      const streamUpload = (req) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream((error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          });
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const uploadResult = await streamUpload(req);
      imageUrl = uploadResult.url;
    }

    const newItem = {
      name: req.body.itemName,
      category: req.body.category,
      price: req.body.price,
      description: req.body.description,
      published: req.body.published ? true : false,
      featureImage: imageUrl
    };

    await storeService.addItem(newItem);
    res.redirect('/items');
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error adding item' });
  }
});

// 404 Route - Handles unmatched routes
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

// Initialize store service and start server
storeService.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`❌ Failed to initialize store service: ${err}`);
  });



































































































































































































  


  /*cloud name - dye81gsmz
API Key - 656445142472678
API Secret - LaXqfDuY1BoxpWx8sLahpfa1XBM */