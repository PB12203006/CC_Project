#!/usr/bin/env python2
# -*- coding: utf-8 -*-
"""
@author: Yilan
Consume Messages from SQS and send messages to worker.

"""
import json
#import string
import random
import time
import boto3
import Worker_train as Worker
import thread
from pyspark.sql import SparkSession
from pyspark import SparkContext
from pyspark.mllib.feature import HashingTF
#sc=SparkContext(appName="Flickr-train")

spark = SparkSession \
    .builder \
    .appName("Flickr-train").getOrCreate()
#    .config("spark.mongodb.input.uri", "mongodb://127.0.0.1/test.coll") \
#    .config("spark.mongodb.output.uri", "mongodb://127.0.0.1/test.coll") \
sc=spark.sparkContext

numFeatures = 1000
hashingTF = HashingTF(numFeatures=numFeatures)



def ProcessBatchMessages(queue, batch_size=10, Flag=True):
    # Process messages
    while Flag:
        try:
        #if True:
            count = 0
            batch_messages = []
            while True:
                for message in queue.receive_messages():
                    if batch_messages==[]:
                        print "messages from SQS", message.body
                        batch_messages.append(json.loads(message.body))
                        message.delete()
                        print "deleting data....."
                        count = count + 1
                        print "count", count
                        if count >= batch_size or json.loads(message.body)["user"]!=batch_messages[0]["user"]:
                            worker = Worker.workerthread(hashingTF,spark)
                            worker.WorkonMessages(batch_messages,sc)
                            #thread.start_new_thread(worker.WorkonMessages, (batch_messages,))
                            print 'consuming data...'
                            count = 0
                            batch_messages = []
                    else:
                        if count >= batch_size or json.loads(message.body)["user"]!=batch_messages[0]["user"]:
                            worker = Worker.workerthread(hashingTF,spark)
                            worker.WorkonMessages(batch_messages,sc)
                            #thread.start_new_thread(worker.WorkonMessages, (batch_messages,))
                            print 'consuming data...'
                            count = 0
                            batch_messages = []
                        #print "messages from SQS", message.body
                        print "messages from SQS", message.body
                        batch_messages.append(json.loads(message.body))
                        message.delete()
                        print "deleting data....."
                        count = count + 1
                        print "count", count

        except Exception, e:
            print e
            nsecs=random.randint(1,5)
            time.sleep(nsecs)

def ConsumeMessages(batch_size=10):
    sqs = boto3.resource('sqs')

    # Get the queue
    queueName = 'nofeedback'
    queue = sqs.get_queue_by_name(QueueName=queueName)

    # Consume the messages in queue
    ProcessBatchMessages(queue, batch_size)

def main():
    ConsumeMessages(1)

main()
