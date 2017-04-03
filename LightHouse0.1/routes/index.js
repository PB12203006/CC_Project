var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/lighthouse', function(req, res, next) {
  res.render('lighthouse',{title: req.body.username});
});
   
//router.post('/lighthouse', function)                

/* Sign in*/                             
router.get('/signin', function(req, res) {
    res.render('signin', { title: 'Sign in for LightHouse!' });
});

/* POST to DashBoard*/
router.post('/signin', function(req, res){
  //Set our internal DB variable
  var db = req.db;
  
  //Get our form values. These rely on the "name" attibutes
  var userName = req.body.username;
  var userpw = req.body.password;
  
  //Set our collection
  var collection = db.get('usercollection');
  
  collection.findOne({'username' : userName})
      .then(function (result) {
        if (null == result) {
          console.log("USERNAME NOT FOUND:", userName);
          res.render("signin", { title: 'Username not found. please Sign in again, LH.' });
          //deferred.resolve(false);
        }
        else {
          //var hash = result.password;

          console.log("FOUND USER: " + result.username);
          //bcrypt.compareSync(userpw, hash)
          if (userpw == result.password) {
            var image = Buffer.from(result.file.data.buffer,'binary').toString('base64');
            var type = result.file.mimetype;
            console.log(result.file);
            res.render("lighthouse",{title:result.username, img: image, tp: type});
          
            //deferred.resolve(result);
          } else {
            console.log("AUTHENTICATION FAILED");
            res.render("signin", { title: 'Wrong username or password. please Sign in again.'});
            //deferred.resolve(false);
          }
        }

        db.close();
      });
    });

           
           
/* GET New User page. */
router.get('/signup', function(req, res) {
    res.render('signup', { title: 'Sign up for LightHouse!' });
});


/* POST to Add User Service */              
router.post('/signup', function(req, res){
  //Set our internal DB variable
  var db = req.db;
  
  //Get our form values. These rely on the "name" attibutes
  var userName = req.body.username;
  var userEmail = req.body.email;
  var userpw = req.body.password;
  var usernum = req.body.number;
  var sampleFile = req.files.sampleFile;
  
  //Set our collection
  var collection = db.get('usercollection');
  
  
  //check if username is already assigned in our database
    collection.findOne({'username' : userName})
      .then(function (result) {
        if (null != result) {
          console.log("USERNAME ALREADY EXISTS:", result.username);
          res.render('signup', { title: 'Username already exists, please try another one.' });
          //deferred.resolve(false); // username exists
        }
        else  {
          //var hash = bcrypt.hashSync(userpw, 8);
          var user = {
                     "username" : userName,
                      "email" : userEmail,
                      "password" : userpw,
                      "number" : usernum,
                      "file": sampleFile
            //"avatar": "http://placepuppy.it/images/homepage/Beagle_puppy_6_weeks.JPG"
          }
          console.log("REQ.BODY", req.body)
          console.log("CREATING USER:", userName);
        
          collection.insert(user,
          function(err,doc){
          if (err){
              //If it failed, return error
              res.send("There was a problem adding the information to the database.");
          }
          else {
              //And forward to success page
              console.log('File uploaded!');
              res.redirect("signin");
          }
        });
      }
  });
  console.log("upload file: ",sampleFile); // the uploaded file object 
});
                  
/* Test web for upload files to MongoDB*/                            
router.get('/upload', function(req, res) {
    res.render('upload', { title: 'Upload file to LightHouse!' });
});
           
router.post('/upload', function(req, res) {
    if (!req.files)
      return res.status(400).send('No files were uploaded.');

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file 
    let sampleFile = req.files.sampleFile;

    // Use the mv() method to place the file somewhere on your server
    var db = req.db;
    var collection = db.get('usercollection');
    collection.insert({"file":sampleFile},
          function(err,doc){
          if (err){
              //If it failed, return error
              console.log("There was a problem adding the samplefile to the database.");
          }
          else {
              //And forward to success page
              console.log('File uploaded!');
              res.redirect("lighthouse");
          }
    });
    console.log("upload file: ",sampleFile); // the uploaded file object 
});
         
module.exports = router;
