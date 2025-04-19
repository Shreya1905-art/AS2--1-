/*********************************************************************************
* WEB322 – Assignment 03
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students.
*
* Name:patel shreya A  Student ID:175918234  Date: 4/18/2025
*
* Cyclic Web App URL: ( https://cloud.mongodb.com/v2/6802a54f8958c0496aa2d12a#/clusters)
*
* GitHub Repository URL:https://github.com/Shreya1905-art/AS2--1- 
*
********************************************************************************/

const express = require('express');
const path = require('path');
const storeService = require('./store-service');
const authData = require('./auth-service');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const exphbs = require('express-handlebars');
const clientSessions = require('client-sessions');

const app = express();
const PORT = process.env.PORT || 8080;

const hbs = exphbs.create({
  helpers: {
    navLink: function(url, options) {
      return '<li' + ((url == app.locals.activeRoute) ? ' class="active"' : '') + '><a href="' + url + '">' + options.fn(this) + '</a></li>';
    },
    eq: function(v1, v2) {
      return v1 === v2;
    },
    safeHTML: function(html) {
      return new hbs.handlebars.SafeString(html);
    },
    formatDate: function(dateObj) {
      let year = dateObj.getFullYear();
      let month = (dateObj.getMonth() + 1).toString();
      let day = dateObj.getDate().toString();
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
    },
    json: function(context) {
      return JSON.stringify(context);
    }
  },
  extname: '.hbs'
});
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

cloudinary.config({
  cloud_name: 'dye81gsmz',
  api_key: '656445142472678',
  api_secret: 'LaXqfDuY1BoxpWx8sLahpfa1XBM',
  secure: true
});

app.use(clientSessions({
  cookieName: 'session',
  secret: 'your_secret_key_here', 
  duration: 24 * 60 * 60 * 1000, 
  activeDuration: 1000 * 60 * 5 
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
app.use(express.static('public'));

// Middleware to make session available to templates
app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

// Middleware to set activeRoute
app.use(function(req, res, next) {
  let route = req.path.substring(1);
  app.locals.activeRoute = '/' + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, '') : route.replace(/\/(.*)/, ''));
  app.locals.viewingCategory = req.query.category;
  next();
});

// Authentication middleware to protect routes
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

// Public routes
app.get('/', (req, res) => {
  res.redirect('/shop');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/shop', async (req, res) => {
  try {
    const [publishedItems, categories] = await Promise.all([
      storeService.getPublishedItems().catch(err => []),
      storeService.getCategories().catch(err => [])
    ]);

    res.render('shop', {
      data: {
        post: publishedItems[0] || null,
        posts: publishedItems,
        categories: categories,
        viewingCategory: req.query.category,
        message: publishedItems.length === 0 ? 'No published items found' : null
      }
    });
  } catch (err) {
    res.status(500).render('shop', {
      data: {
        post: null,
        posts: [],
        categories: [],
        message: 'We encountered an error. Please try again later.'
      }
    });
  }
});

app.get('/shop/:id', async (req, res) => {
  try {
    const [item, publishedItems, categories] = await Promise.all([
      storeService.getItemById(req.params.id),
      storeService.getPublishedItems().catch(() => []),
      storeService.getCategories().catch(() => [])
    ]);

    if (!item) {
      return res.status(404).render('shop', { 
        data: {
          message: 'Item not found'
        }
      });
    }

    res.render('shop', {
      data: {
        post: item,
        posts: publishedItems,
        categories: categories,
        viewingCategory: req.query.category
      }
    });
  } catch (err) {
    res.status(500).render('shop', { 
      data: {
        message: 'Error fetching item: ' + err.message
      }
    });
  }
});

// Authentication routes
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  authData.registerUser(req.body)
    .then(() => {
      res.render('register', { successMessage: "User created" });
    })
    .catch((err) => {
      res.render('register', { 
        errorMessage: err, 
        userName: req.body.userName 
      });
    });
});

app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  
  authData.checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory
      };
      res.redirect('/items');
    })
    .catch((err) => {
      res.render('login', { 
        errorMessage: err, 
        userName: req.body.userName 
      });
    });
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

// Protected routes (require login)
app.get('/items', ensureLogin, async (req, res) => {
  try {
    let items = [];
    if (req.query.category) {
      items = await storeService.getItemsByCategory(req.query.category).catch(() => []);
    } else if (req.query.minDate) {
      items = await storeService.getItemsByMinDate(req.query.minDate).catch(() => []);
    } else {
      items = await storeService.getAllItems().catch(() => []);
    }

    const categories = await storeService.getCategories().catch(() => []);

    res.render('items', {
      items: items,
      categories: categories,
      message: items.length === 0 ? 'No items found' : null,
      query: req.query
    });
  } catch (err) {
    res.status(500).render('items', {
      items: [],
      categories: [],
      message: 'Error loading items: ' + (err.message || 'Unknown error')
    });
  }
});

app.get('/items/add', ensureLogin, async (req, res) => {
  try {
    const categories = await storeService.getCategories();
    res.render('addItem', { 
      categories: categories,
      message: categories.length === 0 ? 'No categories available' : null,
      formData: null
    });
  } catch (err) {
    res.status(500).render('addItem', { 
      categories: [],
      message: 'Error loading categories: ' + err.message,
      formData: null
    });
  }
});

app.post('/items/add', ensureLogin, upload.single('featureImage'), async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            folder: 'items',
            allowed_formats: ['jpg', 'jpeg', 'png'],
            transformation: [{ width: 800, height: 600, crop: 'limit' }]
          },
          (error, result) => error ? reject(error) : resolve(result)
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      imageUrl = uploadResult.secure_url;
    }

    const newItem = {
      title: req.body.title,
      category: req.body.category,
      price: req.body.price,
      body: req.body.body,
      published: req.body.published === 'on',
      featureImage: imageUrl
    };

    await storeService.addItem(newItem);
    res.redirect('/items');
  } catch (err) {
    const categories = await storeService.getCategories().catch(() => []);
    res.status(400).render('addItem', {
      categories: categories,
      message: 'Error: ' + (err.message || 'Failed to add item'),
      formData: req.body
    });
  }
});

app.get('/categories', ensureLogin, async (req, res) => {
  try {
    const categories = await storeService.getCategories();
    res.render('categories', { 
      categories: categories,
      message: categories.length === 0 ? 'No categories found' : null
    });
  } catch (err) {
    res.status(500).render('categories', { 
      message: 'Error fetching categories: ' + err.message
    });
  }
});

app.get('/categories/add', ensureLogin, (req, res) => {
  res.render('addCategory');
});

app.post('/categories/add', ensureLogin, async (req, res) => {
  try {
    await storeService.addCategory(req.body);
    res.redirect('/categories');
  } catch (err) {
    res.status(500).render('addCategory', { 
      message: 'Unable to create category: ' + err.message
    });
  }
});

app.get('/categories/delete/:id', ensureLogin, async (req, res) => {
  try {
    await storeService.deleteCategoryById(req.params.id);
    res.redirect('/categories');
  } catch (err) {
    res.status(500).render('categories', {
      message: 'Unable to remove category: ' + err.message
    });
  }
});

app.get('/items/delete/:id', ensureLogin, async (req, res) => {
  try {
    await storeService.deletePostById(req.params.id);
    res.redirect('/items');
  } catch (err) {
    res.status(500).render('items', {
      message: 'Unable to remove item: ' + err.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Initialize and start server
storeService.initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`❌ Failed to initialize services: ${err}`);
    process.exit(1);
  });
