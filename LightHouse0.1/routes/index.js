var express = require('express');
var router = express.Router();
var multer  = require('multer');
var fs = require('fs');
var aws = require('aws-sdk');
var path = require('path');
var AWS = require('aws-sdk');
AWS.config.update({region:'us-west-2'});
var sqs = new AWS.SQS();
var session = require('express-session');
var es = require('elasticsearch');
var connection_str='https://*.us-east-1.es.amazonaws.com';
var client = new es.Client({
    host:'*.es.amazonaws.com'
});


//this API is for recognizing pictures
var Clarifai = require('clarifai');
var Clarifai_app = new Clarifai.App(
        '*',
        '*'
        );

//this function is for maintaining the login session
function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/signin');
    }
}

//this function recursively receives messages from sqs until getting a message corresponding to the specific user it requires
function recur(req,res){
    var receive={
        QueueUrl: '*/sparkfeedback',
        WaitTimeSeconds: 2
    };
    sqs.receiveMessage(receive, function(err, data) {
        if (err) console.log(err,err.stack); // an error occurred
        else{
            console.log('receiving');
            console.log(data);
            if(data!=undefined && data['Messages']!=undefined && data['Messages'][0]!=undefined && data['Messages'][0]['Body'] !=undefined){
                console.log(data['Messages'][0]['Body']);
                var body=JSON.parse(data['Messages'][0]['Body']);
                console.log(body);
                if(body['user']==req.session.user){
                    var del={
                        QueueUrl: '*/sparkfeedback',
        ReceiptHandle: data['Messages'][0]['ReceiptHandle']  
                    };
                    sqs.deleteMessage(del,function(err,data){
                        if(err) console.log(err,err.stack);
                        else{
                            console.log(data);
                            console.log('deleted');
                            console.log(body['url'].length);
                            console.log(body['url']);
                            res.send(body['url']);
                        }
                    });
                }
                else{
                    recur(req,res);
                }
            }
            else{
                recur(req,res);
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


/* Home page Sign in*/                             
router.get('/', function(req, res) {
    res.render('signin', { title: 'Sign in for LightHouse!' });
});

/* Sign in*/                             
router.get('/signin', function(req, res) {
    res.render('signin', { title: 'Sign in for LightHouse!' });
});
/* Process login request on home page */
router.post('/', function(req, res){
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
        }
        else {
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
            } else {
                console.log("AUTHENTICATION FAILED");
                res.render("signin", { title: 'Wrong username or password. please Sign in again.'});
            }
        }
    db.close();
    });
});  
/* Process login request*/
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
        }
        else {
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
            } else {
                console.log("AUTHENTICATION FAILED");
                res.render("signin", { title: 'Wrong username or password. please Sign in again.'});
            }
        }
    db.close();
    });
});  

/* sign up */
router.get('/signup', function(req, res) {
    res.render('signup', { title: 'Sign up for LightHouse!' });
});

/* the page for what's up */
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
        }
        else  {
            if (/image/.exec(sampleFile.mimetype)==null){
                console.log("MimeType of the file:" , sampleFile.mimetype);
                res.render('signup', {title:'Please upload a image.'})
            }
            else{
                var user = {
                    "username" : userName,
        "email" : userEmail,
        "password" : userpw,
        "number" : usernum,
        "file": sampleFile
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

/*recommendation page*/
router.get('/rec',restrict,function(req,res){
    res.render('rec');
});

/* this router calls recur function to conmmunicate with Spark via SQS, get the recommendation from Spark */
router.get('/recimg',function(req,res){
    //sqs
    var u=JSON.stringify({'user':req.session.user});
    var params={
        MessageBody: u, 
    QueueUrl: '*/lighthouseusername', 
    };

    sqs.sendMessage(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
    recur(req,res);
});

/* This router is used for collecting user feedback and send the information to Spark */
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
                QueueUrl: '*/nofeedback', 
            };
            sqs.sendMessage(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else     console.log(data);           // successful response
            });
        },
    function(err) {
        console.error(err);
    }); 
});

module.exports = router;
