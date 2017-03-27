var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/lighthouse', function(req, res, next) {
  res.render('lighthouse', { title: 'LightHouse' });
});
           
/* Get Userlist page */
router.get('/userlist', function(req,res){
  var db = req.db;
  var collection = db.get('usercollection');
  collection.find({},{},function(e,docs){
      res.render('userlist',{
          "userlist" : docs
      });
  });
});           

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
            res.redirect("lighthouse");
            //deferred.resolve(result);
          } else {
            console.log("AUTHENTICATION FAILED");
            res.render("signin", { title: 'Wrong username or password. please Sign in again, LH.' });
            //deferred.resolve(false);
          }
        }

        db.close();
      });
    });

  
  
  //Submit to the DB
  //collection.insert({
  //    "username" : userName,
  //    "email" : userEmail
  //}, function(err,doc){
  //    if (err){
          //If it failed, return error
 //         res.send("There was a problem adding the information to the database.");
 //     }
 //     else {
          //And forward to success page
 //         res.redirect("signin");
 //     }
  //}); 
//});
                     
           
/* GET New User page. */
router.get('/signup', function(req, res) {
    res.render('signup', { title: 'Sign up for LightHouse!' });
});


/* POST to Add User Service */
router.post('/signu', function (req, res, next) {
    var user = {
       Name: req.body.username,
       Email: req.body.email,
       Pass: req.body.password,
       Num: req.body.number
   };
   var UserReg = mongoose.model('UserReg', RegSchema);
   UserReg.create(user, function(err, newUser) {
      if(err) return next(err);
      req.session.user = email;
      return res.send('Logged In!');
   });
});
                  
router.post('/signup', function(req, res){
  //Set our internal DB variable
  var db = req.db;
  
  //Get our form values. These rely on the "name" attibutes
  var userName = req.body.username;
  var userEmail = req.body.email;
  var userpw = req.body.password;
  var usernum = req.body.number;
  
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
                      "number" : usernum
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
              res.redirect("signin");
          }
        });
      }
  });
});
                  
  //Submit to the DB
  //collection.insert({
 //     "username" : userName,
 //     "email" : userEmail,
 //     "password" : userpw,
 //     "number" : usernum
  //}, function(err,doc){
  //    if (err){
          //If it failed, return error
 //         res.send("There was a problem adding the information to the database.");
 //     }
 //     else {
          //And forward to success page
 //         res.redirect("signin");
 //     }
 // });
//});
                     
module.exports = router;
