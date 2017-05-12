var express = require('express');
var router = express.Router();
var multer  = require('multer');
var fs = require('fs');
var aws = require('aws-sdk');
var path = require('path');
var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var sqs = new AWS.SQS();
var session = require('express-session');
var es = require('elasticsearch');
var connection_str='https://***REMOVED***.us-east-1.es.amazonaws.com';
var client = new es.Client({
  host:'https://***REMOVED***.us-east-1.es.amazonaws.com'
});



var Clarifai = require('clarifai');
var Clarifai_app = new Clarifai.App(
      '***REMOVED***',
      '***REMOVED***'
    );

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/signin');
  }
}

function recur(req,res){
  var receive={
    QueueUrl: 'https://***REMOVED***',
    WaitTimeSeconds: 2
  };

  sqs.receiveMessage(receive, function(err, data) {
    if (err) console.log(err,err.stack); // an error occurred
    else{
      console.log('receiving');
      console.log(data);
      if(data!=undefined){
        console.log(data['Messages'][0]['Body']);
        var body=JSON.parse(data['Messages'][0]['Body']);
        console.log(body);
        if(body['user']==req.session.user){
          var del={
            QueueUrl: 'https://***REMOVED***',
            ReceiptHandle: data['Messages'][0]['ReceiptHandle']  
          };
          sqs.deleteMessage(del,function(err,data){
            if(err) console.log(err,err.stack);
            else{
              console.log(data);
              console.log('deleted');
                   //es
// conso  le.log(req.session.user);
              console.log(body['url']);
              res.send(body['url']);
                //es
            }
          });
        }
      else{
        recur(req,res);
      }
      }
    }           
   });
}


function recur2(req,res){
  var receive={
    QueueUrl: 'https://***REMOVED***',
    WaitTimeSeconds: 2
  };

  sqs.receiveMessage(receive, function(err, data) {
    if (err) console.log(err,err.stack); // an error occurred
    else{
      console.log('receiving');
      console.log(data);
      if(data!=undefined){
        console.log(data['Messages'][0]['Body']);
        if(data['Messages'][0]['Body']==req.session.user){
          var del={
            QueueUrl: 'https://***REMOVED***',
            ReceiptHandle: data['Messages'][0]['ReceiptHandle']  
          };
          sqs.deleteMessage(del,function(err,data){
            if(err) console.log(err,err.stack);
            else{
              console.log(data);
              console.log('deleted');
                   //es
// conso  le.log(req.session.user);
              var s_params={
                index:'pixabay-predict',
                type:req.session.user,
                size:5,
                body:{
                  query:{
                    match_all:{}
                  }
                }
              };
              client.search(s_params,function(err,data){
              if(err){
                console.log(err);
              }
              else{
     //   console.log(data['hits']['hits'][0]['_source']["url"]);
                res.send(data['hits']['hits'][0]['_source']["url"]);
                //break;
              }
              });
                //es
            }
          });
        }
      else{
        recur(req,res);
      }
      }
    }           
   });
}
/* GET home page. */
router.get('/lighthouse', restrict, function(req, res, next) {
  res.render('lighthouse',{title:req.session.user, img: req.session.img, tp: req.session.tp});
});

router.post('/lighthouse', function(req, res, next) {
  res.redirect("/lighthouse");
});


/* Sign in*/                             
router.get('/signin', function(req, res) {
    res.render('signin', { title: 'Sign in for LightHouse!' });
});

/* POST to DashBoard*/
router.post('/signin', function(req, res){
  console.log('post')
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
            //session
            req.session.regenerate(function(){
            // Store the user's primary key
            // in the session store to be retrieved,
            // or in this case the entire user object
            req.session.user = userName;
            req.session.img = image;
            req.session.type = type;
            req.session.success = 'Authenticated as ' + userName
              + ' click to <a href="/logout">logout</a>. '
              + ' You may now access <a href="/restricted">/restricted</a>.';
            res.redirect('/lighthouse');
            });
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

router.get('/lh',restrict,function(req, res){
  res.send(req.session.user);
});   
           
/* GET New User page. */
router.get('/signup', function(req, res) {
    res.render('signup', { title: 'Sign up for LightHouse!' });
});

router.get('/prate',restrict, function(req, res) {
    res.render('prate');
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
              console.log(err,err.stack);
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

router.get('/rec',restrict,function(req,res){
  res.render('rec');
});

router.get('/recimg',function(req,res){
  //sqs
  var u=JSON.stringify({'user':req.session.user});
  var params={
    MessageBody: u, 
    QueueUrl: 'https://sqs.us-west-2.amazonaws.com/145842502534/lighthouseusername', 
  };
  
  sqs.sendMessage(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
  recur(req,res);
  /*
  var receive={
    QueueUrl: 'https://***REMOVED***',
    WaitTimeSeconds: 2
  };
//  while(1){
    //console.log('trying');
    sqs.receiveMessage(receive, function(err, data) {
      if (err) console.log('err'); // an error occurred
      else{
        console.log('receiving');
        console.log(data);
        if(data!=undefined){
          console.log(data['Messages'][0]['Body']);
          if(data['Messages'][0]['Body']==req.session.user){
            var del={
              QueueUrl: 'https://***REMOVED***',
              ReceiptHandle: data['Messages'][0]['ReceiptHandle']  
            };
            sqs.deleteMessage(del,function(err,data){
              if(err) console.log(err,err.stack);
              else{
                console.log(data);
                console.log('deleted');
    
                  //es
//   conso  le.log(req.session.user);
                var s_params={
                  index:'pixabay-predict',
                  type:req.session.user,
                  size:5,
                  body:{
                    query:{
                      match_all:{}
                    }
                  }
                };
                client.search(s_params,function(err,data){
                if(err){
                  console.log(err);
                }
                else{
       //   console.log(data['hits']['hits'][0]['_source']["url"]);
                  res.send(data['hits']['hits'][0]['_source']["url"]);
                  //break;
                }
                });
                  //es
              }
            });
          }
        }
      }           
    });
 // }
 */


/*
 // console.log(req.session.user);
  var s_params={
    index:'pixabay-predict',
    type:req.session.user,
    size:5,
    body:{
      query:{
        match_all:{}
      }
    }
  };
  client.search(s_params,function(err,data){
    if(err){
      console.log(err);
    }
    else{
     // console.log(data['hits']['hits'][0]['_source']["url"]);
      res.send(data['hits']['hits'][0]['_source']["url"]);
    }
  });
  */
 // j=[1,2,3];
 // res.send(j);
});

router.get('/feedback', function(req, res){
  var feedback=req.query.f;
  var pic_url = req.query.pic_url;
  console.log(typeof feedback);
  console.log(pic_url);
  console.log(req.session.user);
  var db=req.db;
  var collection=db.get('userfeedback');
  var labels='';
  Clarifai_app.models.predict(Clarifai.GENERAL_MODEL, pic_url).then(
    function(response) {
      for(var i=0;i<response.outputs[0].data.concepts.length;i++){
        if (response.outputs[0].data.concepts[i].name != 'no person'){
          labels=labels+response.outputs[0].data.concepts[i].name+' ';
          //console.log(response.outputs[0].data.concepts[i].name);
        }
      }
      labels=labels.substring(0,labels.length-1);
      console.log(labels);
      /*  
      var fb={
        'feedback':feedback,
        'labels':labels,
        'user':req.session.user
      };
      console.log(fb);
      //to mongodb
      collection.insert(fb,function(err,doc){
        if (err){
          console.log("There was a problem adding the information to the database.");
        }
        else {
        console.log('updated!');
        }
      });
      */
//sqs
      var dic={
        "label":Number(feedback),
        "tags":labels,
        "user":req.session.user
      };
      console.log(dic);
      var dic_2=JSON.stringify(dic);
      console.log(dic_2);
      var params={
        MessageBody: dic_2, 
        QueueUrl: 'https://sqs.us-west-2.amazonaws.com/145842502534/nofeedback', 
        MessageAttributes: {
          "label": {
          DataType: "String", 
          StringValue: feedback
          },
          "tags": {
          DataType: "String", 
          StringValue: labels
          },
          "user": {
          DataType: "String", 
          StringValue: req.session.user
          }
        }
      };
      
      sqs.sendMessage(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });

    },
    function(err) {
       console.error(err);
       // there was an error
    }
  );
/*
  var fb={
    'feedback':feedback,
    'labels':labels
  };
  console.log(fb);
  //to mongodb
  collection.insert(fb,function(err,doc){
    if (err){
      console.log("There was a problem adding the information to the database.");
    }
    else {
    console.log('updated!');
    }
  });
*/
//to s3  
});

module.exports = router;