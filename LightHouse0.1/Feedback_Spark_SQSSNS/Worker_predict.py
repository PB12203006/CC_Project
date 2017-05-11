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
import requests
# change default system encoding method of python into UTF-8
import sys
reload(sys)
sys.setdefaultencoding('UTF8')


class workerthread():
    def __init__(self, hashingTF, spark):
        self.sqs = boto3.resource('sqs')#self.client_sns = boto3.client('sns')
        #self.sns_arn = 'arn:aws:sns:us-west-2:560376101737:Pixabay-feed'
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
            response = requests.get("https://pixabay.com/api/?key=5321184-68d88d45c3c32345d8c6768c7&image_type=photo&order=latest&per_page=200").json()
            results = response["hits"]
            print len(results)
            doc=[]
            for i in range(200):
                result = results[i]
                doc.append({"tags":result["tags"].split(", "),"url":result["webformatURL"]})
            messages = sc.parallelize(doc)
            tags = messages.map(lambda x: x["tags"],preservesPartitioning=True)
            #labels = messages.map(lambda x: x["label"],preservesPartitioning=True)
            links = messages.map(lambda x: x["url"],preservesPartitioning=True)
            tf = self.hashingTF.transform(tags)
            #train = tf.zip(messages).map(lambda x: {"tf":x[0],"label":x[1]["label"]})
            #model.perceptronBatch(data=tf,labels=labels,MaxItr=10)
            #model.save("models/"+user+".json",average=True)
            #test = tf.zip(messages).map(lambda x:{"tf":x[0],"link":x[1]["url"]})
            #print "save_path:","models/"+user+".json"
            predict = model.predictPositive(tf,links)
            prediction = predict.map(lambda x:x[1]).collect()
            positive = {"user":user,"url":prediction}
            #print "predict label", predict.collect()
            #mongodb.write.format("com.mongodb.spark.sql.DefaultSource").mode("overwrite").option("database", \
            #                        "test").option("collection", "colllabeled").save()
            print json.dumps(positive, indent=4)
            """
            ind = "pixabay-predict"
            if not es.indices.exists(index=ind):
                es.indices.create(index=ind, ignore=[400,404])
                print "creating index........."

            response = es.search(index=ind,doc_type=user)
            ids = [x["_id"] for x in response["hits"]["hits"]]
            for x in ids:
                es.delete(ind,user,x)
            es.indices.refresh(index=ind)
            es.index(index=ind,doc_type=user,body=positive,timeout='3000s')
            es.indices.refresh(index=ind)
            print "update data in elasticsearch"
            response = es.search(index=ind,doc_type=user)
            """
            queueName = 'sparkfeedback'
            queue = self.sqs.get_queue_by_name(QueueName=queueName)
            queue.send_message(MessageBody=json.dumps(positive))
            print "message sent to SQS....."
            #print "urls for user:",response
            #self.client_sns.publish(TopicArn=self.sns_arn, Message=json.dumps(positive), Subject='Pixabay')
            #print 'message pushed'
        except Exception, e:
            print messages
            print "Exception ERROR:",e
            #    pass
