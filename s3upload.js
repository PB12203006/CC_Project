//directly node it

var AWS = require('aws-sdk');
var fs = require('fs');
// Create an S3 client
var s3 = new AWS.S3();

var bucketName = 'lighthouseimages';

var keyName = 'whatever you like';  //filename

stream=fs.createReadStream('IMG_0144.PNG');  //argument: local path+filename
var params = {Bucket: bucketName, Key: keyName, Body:stream, ACL: 'public-read' };
s3.upload(params, function(err, data) {
  console.log(err, data.Location);  //data.location is the url that links to the file
});

  /*
  //adding tags to s3 objects
  var params = {
  Bucket:bucketName,
  Key:keyName,
  Tagging: 
  {
    TagSet:
    [
      {Key:'label_1', Value:'goose'},
      {Key:'label_2', Value:'cheese'}
    ]
  }
 };
 s3.putObjectTagging(params, function(err,data){
  if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
 });
 */
