var express = require('express');
var router = express.Router();
var multer  = require('multer');
var fs = require('fs');
var aws = require('aws-sdk');
var path = require('path');
var data={};  //global variable to transfer user info
 
/* GET home page. */
router.get('/lighthouse', function(req, res, next) {
  res.render('lighthouse',{title:data.title, img: data.img, tp: data.tp});
  data={};
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
            var image = Buffer.from(result.file.data.buffer,'binary').toString('base64');
            var type = result.file.mimetype;
            console.log(result.file);
            data={
              'title':result.username,
              'img': image,
              'tp':type
            };
            res.redirect("/lighthouse");
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
          if (/image/.exec(sampleFile.mimetype)==null){
            console.log("MimeType of the file:" , sampleFile.mimetype);
            res.render('signup', {title:'Please upload a image.'})
          }
          else{
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
       }
  });
  console.log("upload file: ",sampleFile); // the uploaded file object 
});
                  

//s3
/* Multer set storage location*/
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/TmpImg/');
  },
  filename: function (req, file, cb) {
      cb(null, file.originalname);
  }
});
 
var upload = multer({ storage: storage });
aws.config.update({ accessKeyId: 'AKIAJBUGQ7FZI3OWXKDA', secretAccessKey: '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' });
aws.config.update({region: 'us-east-1'});
// dev.sociogators.files
 
 
router.get('/upload', function(req, res, next) {
    res.render('upload', {title :'xxx'});
       
});
 
 
router.post('/upload', upload.single('sampleFile'),   function(req, res, next) {
    var s3 = new aws.S3();
    console.log('xxx'+req.files.sampleFile);
    s3.upload({
              "Bucket": "lighthouseuserimg",
               "Key": req.files.sampleFile.originalname,
               "Body": fs.createReadStream('./public/TmpImg/'+req.files.sampleFile.originalname)
            }, function(err, data) {
            if (err) {
                console.log("Error uploading data: ", err);
            } else {
                    //delete local file
                    fs.unlinkSync(req.file.path);
                    console.log(data);
 
                    /*
                    //save image name to database
                    var img = { link: data['Location'], 
                                name: req.file.originalname,
                                diskname: req.file.filename,
                                created:  Date.now()
                    };
                    db.insert(img, function (err, newDoc) {   
                        // Callback is optional
                        // newDoc is the newly inserted document, including its _id
                        // newDoc has no key called notToBeSaved since its value was undefined
                    });
                    */
            }
        });
 
   res.redirect('/upload');
   
});
 
 
router.post('/download', function(req, res, next){
    var s3 = new aws.S3();
    // console.log(req.body.diskname);
 
    var params = {Bucket: 'dev.sociogators.files', Key: req.body.diskname};
 
    // console.log(params);
    // res.attachment(req.body.diskname);
    s3.getObject(params,
      function (error, data) {
        if (error != null) {
          console.log("Failed to retrieve an object: " + error);
        } else {
          console.log("Loaded " + data.ContentLength + " bytes");
          // do something with data.body
        }
      }
    );
     
    // var file = fs.createWriteStream('/public/images/'+req.body.diskname+'');
    // s3.getObject(params).createReadStream().pipe(file);
 
    res.redirect('/upload');
 
});

//
module.exports = router;
