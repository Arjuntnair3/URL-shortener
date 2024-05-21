const mongoose = require('mongoose');
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('Connected to MongoDB database');
})
.catch((err) => {
    console.error('Database connection failed:', err);
});

const usersSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true }
});

module.exports = mongoose.model('User', usersSchema);
