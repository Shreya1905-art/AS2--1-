const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the user schema
const userSchema = new mongoose.Schema({
    userName: { 
        type: String, 
        unique: true 
    },
    password: String,
    email: String,
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

let User; // to be defined on new connection

module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {
        // Replace with your actual MongoDB Atlas connection string
        let db = mongoose.createConnection("mongodb+srv://sapatel1905:<EOULOKnUgl0sAEpO>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority");

        db.on('error', (err) => {
            reject(err);
        });

        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

module.exports.registerUser = function (userData) {
    return new Promise(function (resolve, reject) {
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
            return;
        }

        bcrypt.genSalt(10) // Generate a salt with 10 rounds
            .then(salt => {
                return bcrypt.hash(userData.password, salt); // Hash the password with the salt
            })
            .then(hash => {
                // Create new user with hashed password
                let newUser = new User({
                    userName: userData.userName,
                    password: hash, // Store the hash instead of plain text
                    email: userData.email,
                    loginHistory: [] // Initialize empty login history
                });

                return newUser.save();
            })
            .then(() => {
                resolve();
            })
            .catch(err => {
                if (err.code === 11000) {
                    reject("User Name already taken");
                } else if (err.message.includes('password')) {
                    reject("There was an error encrypting the password");
                } else {
                    reject("There was an error creating the user: " + err.message);
                }
            });
    });
};

module.exports.checkUser = function (userData) {
    return new Promise(function (resolve, reject) {
        User.findOne({ userName: userData.userName })
            .then(user => {
                if (!user) {
                    reject("Unable to find user: " + userData.userName);
                    return;
                }

                bcrypt.compare(userData.password, user.password)
                    .then(result => {
                        if (!result) {
                            reject("Incorrect Password for user: " + userData.userName);
                            return;
                        }

                        // Update login history (keep only last 10 logins)
                        if (user.loginHistory.length >= 10) {
                            user.loginHistory.shift(); // Remove oldest entry
                        }
                        
                        user.loginHistory.push({
                            dateTime: new Date(),
                            userAgent: userData.userAgent
                        });

                        return User.updateOne(
                            { userName: user.userName },
                            { $set: { loginHistory: user.loginHistory } }
                        );
                    })
                    .then(() => {
                        resolve(user);
                    })
                    .catch(err => {
                        reject("Error verifying user: " + err.message);
                    });
            })
            .catch(err => {
                reject("Unable to find user: " + userData.userName);
            });
    });
};