#!/usr/bin/env python2
# -*- coding: utf-8 -*-
"""
Created on Mon Apr  3 21:42:08 2017

@author: Jillian

Upload twitter data to SQS.

"""
#Import the necessary methods from tweepy library
from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream
#from elasticsearch import Elasticsearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
import json
import string
import random
import time
import boto3
#from textwrap import TextWrapper

# change default system encoding method of python into UTF-8
import sys
reload(sys)
sys.setdefaultencoding('UTF8')

#Variables that contains the user credentials to access AWS Elastucsearch

# Get the service resource
sqs = boto3.resource('sqs')
#client = boto3.client('sqs')

# Create the queue. This returns an SQS.Queue instance
queueName = 'Flickr-train-queue'
for queue in sqs.queues.all():
    #print queue
    if queueName in queue.url:
        queue = sqs.get_queue_by_name(QueueName=queueName)
    else:
        queue = sqs.create_queue(QueueName=queueName, Attributes={'DelaySeconds': '10'})

# You can now access identifiers and attributes
print(queue.url)
#print(queue.attributes.get('DelaySeconds'))

doc = [
    {"user":"JJ","label":0.0, "tags":"server Flask python","url":"SOME-LINK0"},
    {"user":"JJ","label":0.0, "tags":"Nodejs Javascript Express html","url":"SOME-LINK1"},
    {"user":"JJ","label":0.0, "tags":"Online Perceptron Spark Hadoop pySpark mongdb AWS","url":"SOME-LINK2"},
    {"user":"Jay","label":1.0, "tags":"server Flask python","url":"SOME-LINK3"},
    {"user":"Jay","label":1.0, "tags":"Nodejs Javascript Express html","url":"SOME-LINK4"},
    {"user":"Jay","label":1.0, "tags":"Online Perceptron Spark Hadoop pySpark mongdb AWS","url":"SOME-LINK5"},
    {"user":"Taylor","label":0.0, "tags":"server Flask python","url":"SOME-LINK6"},
    {"user":"Taylor","label":1.0, "tags":"Nodejs Javascript Express html","url":"SOME-LINK7"},
    {"user":"Baxia","label":0.0, "tags":"Online Perceptron Spark Hadoop pySpark mongdb AWS","url":"SOME-LINK8"},
    {"user":"Baxia","label":0.0, "tags":"server Flask python","url":"SOME-LINK9"},
    {"user":"Baxia","label":1.0, "tags":"Nodejs Javascript Express html","url":"SOME-LINK10"},
    {"user":"Baxia","label":1.0, "tags":"Average Perceptron Spark pySpark mongdb AWS","url":"SOME-LINK11"}
]

myQueue = sqs.get_queue_by_name(QueueName=queueName)
for line in doc:
    json_body = json.dumps(line)
    response = myQueue.send_message(MessageBody=json_body)
print 'Write To Queue Complete' + '\n'
