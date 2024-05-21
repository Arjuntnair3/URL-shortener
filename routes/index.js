const express = require('express');
const router = express.Router();
const user = require("../config/userconfig");
const bcrypt = require("bcrypt");
const ShortURL = require('../models/urlSchema');
const shortid = require('shortid');




// Register page
router.get('/', (req, res) => {
  let user = req.session.user;
  res.render('signup', { user });
});

// Create user
router.post('/', async (req, res) => {
  let usersData = await user.findOne({ email: req.body.email });
  if (usersData)
    return res.redirect("/")
  usersData = new user({
    email: req.body.email,
    password: await bcrypt.hash(req.body.password, 10),
  });
  usersData
    .save()
    .then((data) => {
      console.log(data);
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
    });
});

// Login page
router.get('/login', (req, res) => {
  let user = req.session.user;
  if (req.session.loggedIn) {
    return res.redirect("/")
  } else {
    res.render('login', { user, logginErr: req.session.logginErr })
    req.session.logginErr = false
  }
});

// Login
router.post('/login', async (req, res) => {
  const userData = {
    email: req.body.email,
    password: req.body.password
  }
  const signupuser = await user.findOne({ email: req.body.email });
  console.log(signupuser)
  if (signupuser) {
    bcrypt.compare(userData.password, signupuser.password)
      .then((status) => {
        if (status) {
          console.log('login succes')
          req.session.user = signupuser
          req.session.loggedIn = true
          res.redirect('/home')
        } else {
          req.session.logginErr = "Invalid Password!"
          console.log('login failed')
          res.redirect('/login')
        }
      })
  } else {
    req.session.logginErr = 'login  failed no such user!'
    console.log('login  failed no such user');
    res.redirect('/')
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
});


// Home page
router.get('/home', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const currentPage = parseInt(req.query.page) || 1; 
    const itemsPerPage = 3; 

    const options = {
      page: currentPage,
      limit: itemsPerPage,
      sort: { createdAt: -1 }
    };

    const result = await ShortURL.paginate({ user: req.session.user._id }, options);

    const canAddMoreURLs = result.totalDocs < 5;
    
    res.render('home', {
      user: req.session.user,
      shorturls: result.docs, 
      canAddMoreURLs: canAddMoreURLs,
      currentPage: currentPage,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('Error fetching user URLs:', error);
    res.status(500).send('Internal Server Error');
  }
});


// intro page
router.get('/intro', async (req, res) => {
  const shorturls = await ShortURL.find();
  const user = req.session.user; // Assuming user is stored in session
  res.render('intro', { user: user, shorturls: shorturls });
});


// Handle URL submission
router.post('/home', async (req, res) => {
  try {
    const { title, url } = req.body;

    // Check if title and URL are provided
    if (!title || !url) {
      return res.status(400).send('Title or URL is missing');
    }

    // Check if the user is logged in
    if (!req.session.user) {
      return res.status(401).send('User not logged in');
    }

    // Count the number of URLs created by the user
    const userShortURLsCount = await ShortURL.countDocuments({ user: req.session.user._id });

    // Check if the user has reached the maximum limit of 5 URLs
    if (userShortURLsCount >= 5) {
      return res.status(400).send('Maximum number of URLs reached');
    }

    // Create a new short URL
    const newShortURL = new ShortURL({
      title: title,
      full: url,
      short: shortid.generate(),
      createdAt: new Date(), 
      user: req.session.user._id 
    });

    // Save the new short URL
    await newShortURL.save();

    // Redirect to the home page
    res.redirect('/home');
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).send('Internal Server Error');
  }
});


// View data
router.get('/:shortUrl', async (req, res) => {
  const shortUrl = await ShortURL.findOne({ short: req.params.shortUrl })
  if (shortUrl == null) {
    return res.sendStatus(404)
  }
  await shortUrl.clicks++;
  shortUrl.save()
  res.redirect(shortUrl.full)
});




// Example of passing the user variable to your EJS template
router.get('/edit/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const shortURL = await ShortURL.findById(id);
    
    if (!shortURL) {
      return res.status(404).send('URL not found');
    }

    // Assuming user data is available in req.session.user
    const user = req.session.user;

    res.render('edit', { user, shortURL }); 
  } catch (error) {
    console.error('Error fetching URL for editing:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update URL
router.post('/edit/:id', async (req, res) => {
  const id = req.params.id;
  const { title, full } = req.body;

  try {
    // Find the URL by ID
    const shortURL = await ShortURL.findById(id);
    
    if (!shortURL) {
      return res.status(404).send('URL not found');
    }

    // Update the URL with new data
    shortURL.title = title;
    shortURL.full = full;

    await shortURL.save();

    res.redirect('/home'); 
  } catch (error) {
    console.error('Error updating URL:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Delete URL (GET)
router.get('/delete/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const shortURL = await ShortURL.findById(id);
    if (!shortURL) {
      return res.status(404).send('URL not found');
    }
    const user = req.session.user;
    res.render('delete', { user, shortURL }); 
  } catch (error) {
    console.error('Error fetching URL for deletion:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete URL (POST)
router.post('/delete/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await ShortURL.deleteOne({ _id: id });
    console.log('Deleted');
    res.redirect('/home'); 
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});




router.post('/search', async (req, res) => {
  try {
      const searchTerm = req.body.search.value; // Access search term from DataTables request
      const user = req.session.user;

      // Create a regular expression to perform a case-insensitive search
      const searchRegex = new RegExp(searchTerm, 'i');

      // Find matching URLs by title or full URL
      const matchingData = await ShortURL.find({
          $or: [
              { title: searchRegex },
              { full: searchRegex }
          ],
          user: req.session.user._id 
      });

      // Construct response object as per DataTables requirements
      const response = {
          draw: req.body.draw,
          recordsTotal: matchingData.length, 
          recordsFiltered: matchingData.length, 
          data: matchingData 
      };

      // Send the response to DataTables
      res.json(response);

  } catch (error) {
      console.error('Error searching data:', error);
      res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
