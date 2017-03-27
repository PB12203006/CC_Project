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
  var userEmail = req.body.useremail;
  
  //Set our collection
  var collection = db.get('usercollection');
  
  res.redirect("/lighthouse");
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
});
                     
           
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
  
  //Submit to the DB
  collection.insert({
      "username" : userName,
      "email" : userEmail,
      "password" : userpw,
      "number" : usernum
  }, function(err,doc){
      if (err){
          //If it failed, return error
          res.send("There was a problem adding the information to the database.");
      }
      else {
          //And forward to success page
          res.redirect("signin");
      }
  });
});
                     
module.exports = router;
