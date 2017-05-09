#!/usr/bin/env python2
# -*- coding: utf-8 -*-
"""
Created on Tue Apr  4 10:50:41 2017

@author: Yilan

Define workers, each worker consume a batch of messages from SQS or Kafka and send to SNS.

"""
import json
import boto3
from perceptron import PerceptronforRDD
# Use modules import local and modified by author to analyze the sentiment of content.
#import tweet_utils
#import notify2es


# Use API to get sentiment analysis, which can analyze a limit number of tweets per day. Switch to tweet_utils analysis instead.
#from watson_developer_cloud import AlchemyLanguageV1
#alchemy_language = AlchemyLanguageV1(api_key='c0200c7c4dc55546016f0dba32ffdc9f58607060')

class workerthread():
    def __init__(self, hashingTF, spark):
        #self.client_sns = boto3.client('sns')
        #self.sns_arn = 'arn:aws:sns:us-west-2:560376101737:Flickr-feed'
        self.hashingTF = hashingTF
        self.spark = spark
        #self.mongodb = mongodb
        #self.client_es = boto3.client('es')

    def WorkonMessages(self, messages,sc):
        try:
        #if True:
            #mongodb = self.spark.read.format("com.mongodb.spark.sql.DefaultSource").option("uri", \
            #                                    "mongodb://127.0.0.1/test.coll").load()
            message = messages[0]
            user = message["user"]
            print "User:",user
            #model_param = mongodb.filter(mongodb["user"]==user).select("model").rdd
            #model_param = model_param.map(lambda x: {"w":x.w,"b":x.b}).collect()
            model = PerceptronforRDD(numFeatures=1000)
            try:
                print "load_path:","models/"+user+".json"
                model.load("models/"+user+".json",average=True)
            except Exception,e:
                pass
            messages = sc.parallelize(messages)
            tags = messages.map(lambda x: x["tags"].split(" "),preservesPartitioning=True)
            labels = messages.map(lambda x: x["label"],preservesPartitioning=True)
            #links = messages.map(lambda x: x["url"],preservesPartitioning=True)
            tf = self.hashingTF.transform(tags)
            #train = tf.zip(messages).map(lambda x: {"tf":x[0],"label":x[1]["label"]})
            model.perceptronBatch(data=tf,labels=labels,MaxItr=10)
            model.save("models/"+user+".json",average=True)
            #test = tf.zip(messages).map(lambda x:{"tf":x[0],"link":x[1]["url"]})
            print "save_path:","models/"+user+".json"
            predict = model.predict(tf)
            print predict.collect()
            #prediction = predict.map(lambda x:x[1]).collect()
            #positive = {"user":user,"links":prediction}
            #print "predict label", predict.collect()
            #mongodb.write.format("com.mongodb.spark.sql.DefaultSource").mode("overwrite").option("database", \
            #                        "test").option("collection", "colllabeled").save()
            #print json.dumps(positive, indent=4)
            #self.client_sns.publish(TopicArn=self.sns_arn, Message=json.dumps(positive), Subject='Flickr')
            #print 'message pushed'
        except Exception, e:
            print messages
            print "Exception ERROR:",e
            #    pass
