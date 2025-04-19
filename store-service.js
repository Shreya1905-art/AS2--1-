const Sequelize = require('sequelize');

// Database connection setup
const sequelize = new Sequelize('SenecaDB', 'neondb_owner', 'npg_NwWmUg15Obnl', {
  host: 'ep-quiet-snowflake-a5xogz25-pooler.us-east-2.aws.neon.tech',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: { 
      require: true,
      rejectUnauthorized: false 
    }
  },
  logging: false,
  query: { raw: true },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 1. First define Category model
const Category = sequelize.define('Category', {
  category: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  }
}, {
  timestamps: false
});

// 2. Then define Item model without the circular reference
const Item = sequelize.define('Item', {
  body: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  postDate: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  },
  featureImage: {
    type: Sequelize.STRING,
    allowNull: true
  },
  published: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  price: {
    type: Sequelize.DOUBLE,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  category: {
    type: Sequelize.INTEGER,
    allowNull: false
  }
}, {
  timestamps: false,
  underscored: true
});

// 3. Now establish relationships AFTER both models are defined
Item.belongsTo(Category, {
  foreignKey: 'category',
  targetKey: 'id'
});

Category.hasMany(Item, {
  foreignKey: 'category'
});

// Initialize function with better error handling
function initialize() {
  return new Promise((resolve, reject) => {
    sequelize.sync()
      .then(() => resolve())
      .catch((err) => reject("unable to sync the database: " + err.message));
  });
}

// All other functions with improved error handling
// Update getAllItems function
function getAllItems() {
  return new Promise(async (resolve, reject) => {
    try {
      const items = await Item.findAll({
        include: [Category],
        raw: false, // Ensure we get full model instances
        nest: true  // Properly nest included models
      });

      if (!items) {
        console.log("Query returned null");
        return resolve([]);
      }

      // Convert to plain objects if needed
      const plainItems = items.map(item => item.get({ plain: true }));
      resolve(plainItems);
    } catch (err) {
      console.error("Database Error Details:", {
        message: err.message,
        stack: err.stack,
        original: err.original
      });
      reject("No items found: " + (err.original?.message || err.message));
    }
  });
}

function getPublishedItems() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Querying for published items...');
      
      const items = await Item.findAll({
        where: { 
          published: true 
        },
        include: [{
          model: Category,
          required: false // Change to true if you want only items with categories
        }],
        order: [['postDate', 'DESC']],
        raw: true,
        nest: true
      });

      console.log(`Found ${items.length} published items`);
      
      if (items.length === 0) {
        console.log('No published items found - empty array returned');
      }
      
      resolve(items);
    } catch (err) {
      console.error('Detailed error in getPublishedItems:', {
        message: err.message,
        stack: err.stack,
        original: err.original
      });
      reject('Database error: ' + (err.original?.message || err.message));
    }
  });
}


function getPublishedItemsByCategory(category) {
  return new Promise((resolve, reject) => {
    Item.findAll({ 
      where: { published: true, category },
      include: [Category]
    })
      .then(data => resolve(data))
      .catch((err) => reject("no results returned: " + err.message));
  });
}

function getCategories() {
  return new Promise(async (resolve, reject) => {
    try {
      const categories = await Category.findAll({
        order: [['category', 'ASC']] // Alphabetical order
      });
      
      if (!categories || categories.length === 0) {
        console.log("No categories found");
        resolve([]); // Return empty array instead of error
      } else {
        resolve(categories);
      }
    } catch (err) {
      console.error("Error in getCategories:", err);
      reject("Error fetching categories: " + err.message);
    }
  });
}

function addItem(itemData) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Attempting to add item:', itemData);
      
      // Validate required fields
      if (!itemData.title || !itemData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!itemData.category || isNaN(itemData.category)) {
        throw new Error('Valid category is required');
      }
      if (isNaN(itemData.price) || itemData.price < 0) {
        throw new Error('Valid price is required');
      }

      // Prepare clean data
      const cleanData = {
        title: itemData.title.trim(),
        body: itemData.body ? itemData.body.trim() : null,
        category: parseInt(itemData.category),
        price: parseFloat(itemData.price),
        published: !!itemData.published,
        featureImage: itemData.featureImage || null,
        postDate: itemData.postDate || new Date()
      };

      // Verify category exists
      const categoryExists = await Category.findByPk(cleanData.category);
      if (!categoryExists) {
        throw new Error('Selected category does not exist');
      }

      // Create item
      const item = await Item.create(cleanData);
      console.log('Item created with ID:', item.id);
      
      resolve(item);
    } catch (err) {
      console.error('Detailed error creating item:', {
        error: err.message,
        stack: err.stack,
        originalError: err.original,
        itemData: itemData
      });
      reject('Failed to create item: ' + (err.original?.message || err.message));
    }
  });
}

// Similarly update getItemsByCategory
function getItemsByCategory(category) {
  return new Promise(async (resolve, reject) => {
    try {
      const items = await Item.findAll({
        where: { category },
        include: [Category],
        raw: false,
        nest: true
      });

      const plainItems = items.map(item => item.get({ plain: true }));
      resolve(plainItems.length ? plainItems : []);
    } catch (err) {
      console.error("Category Query Error:", err);
      reject("No items in category: " + (err.original?.message || err.message));
    }
  });
}

function getItemsByMinDate(minDateStr) {
  return new Promise((resolve, reject) => {
    try {
      const { gte } = Sequelize.Op;
      Item.findAll({
        where: {
          postDate: {
            [gte]: new Date(minDateStr)
          }
        },
        include: [Category]
      })
        .then(data => resolve(data))
        .catch((err) => reject("no results returned: " + err.message));
    } catch (err) {
      reject("invalid date format: " + err.message);
    }
  });
}

function getItemById(id) {
  return new Promise((resolve, reject) => {
    Item.findOne({ 
      where: { id },
      include: [Category]
    })
      .then(data => {
        if (data) {
          resolve(data);
        } else {
          reject("no result returned");
        }
      })
      .catch((err) => reject("no result returned: " + err.message));
  });
}

function addCategory(categoryData) {
  return new Promise((resolve, reject) => {
    try {
      if (!categoryData.category || categoryData.category.trim() === "") {
        return reject("category name cannot be empty");
      }
      
      Category.create(categoryData)
        .then(() => resolve())
        .catch((err) => reject("unable to create category: " + err.message));
    } catch (err) {
      reject("unable to create category: " + err.message);
    }
  });
}

function deleteCategoryById(id) {
  return new Promise((resolve, reject) => {
    Category.destroy({ where: { id } })
      .then((rowsDeleted) => {
        if (rowsDeleted > 0) {
          resolve();
        } else {
          reject("category not found");
        }
      })
      .catch((err) => reject("unable to delete category: " + err.message));
  });
}

function deletePostById(id) {
  return new Promise((resolve, reject) => {
    Item.destroy({ where: { id } })
      .then((rowsDeleted) => {
        if (rowsDeleted > 0) {
          resolve();
        } else {
          reject("item not found");
        }
      })
      .catch((err) => reject("unable to delete item: " + err.message));
  });
}

module.exports = {
  initialize,
  getAllItems,
  getPublishedItems,
  getPublishedItemsByCategory,
  getCategories,
  addItem,
  getItemsByCategory,
  getItemsByMinDate,
  getItemById,
  addCategory,
  deleteCategoryById,
  deletePostById
};
