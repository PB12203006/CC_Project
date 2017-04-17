"""
./bin/pyspark --conf "spark.mongodb.input.uri=mongodb://127.0.0.1/test.coll?readPreference=primaryPreferred" \
    --conf "spark.mongodb.output.uri=mongodb://127.0.0.1/test.coll" \
    --packages org.mongodb.spark:mongo-spark-connector_2.11:2.0.0

bin/mongod --dbpath /Users/Jillian/Desktop/lighthouse/data

bin/spark-submit --packages org.mongodb.spark:mongo-spark-connector_2.11:2.0.0 ~/Desktop/lighthouse/spark_mongodb_test/feedback_train_model.py

"""
#from pyspark import SparkContext
from pyspark.mllib.feature import HashingTF, IDF
from pyspark.mllib.regression import LabeledPoint
from pyspark.mllib.classification import NaiveBayes, SVMWithSGD, SVMModel, LogisticRegressionWithLBFGS, LogisticRegressionModel
from pyspark.sql import SparkSession
#from pyspark.mllib.util import MLUtils
numFeatures = 3000
hashingTF = HashingTF(numFeatures=numFeatures)
spark = SparkSession \
    .builder \
    .appName("feedback") \
    .config("spark.mongodb.input.uri", "mongodb://127.0.0.1/test.coll") \
    .config("spark.mongodb.output.uri", "mongodb://127.0.0.1/test.coll") \
    .getOrCreate()

fbdata = spark.createDataFrame([
    (0.0, {"server":0.9, "Flask": 0.7, "python": 0.5}),
    (0.0, {"Java":0.8, "Nodejs": 0.6, "Javascript":0.4,"CSS":0.5,"html":0.7}),
    (1.0, {"Online Perceptron":0.8, "Spark":0.7, "Hadoop":0.4, "pySpark":0.9, "mongdb":0.7,"AWS":0.9})
], ["label", "tags"])

fbdata.write.format("com.mongodb.spark.sql.DefaultSource").mode("append").option("database",
"test").option("collection", "coll").save()

# To read from a collection called userfeedback in a database called lighthouse,
# specify lighthouse.userfeedback in the input URI option.
feedback = spark.read.format("com.mongodb.spark.sql.DefaultSource").option("uri",
"mongodb://127.0.0.1/test.coll").load()

tagscore = feedback.select("tags").rdd.map(lambda x: {k:v for k,v in x.tags.asDict().items() if v is not None},preservesPartitioning=True)
tags = tagscore.map(lambda x: [k for k,v in x.items() if v>=0.7],preservesPartitioning=True)#select tags with high scores
#scores = tagscore.map(lambda x: x.values())
#feedback = feedback.filter(df["username"]==username)
'''
hashingTF = HashingTF(inputCol="words", outputCol="rawFeatures", numFeatures=20) #This use TF from pySpark.ml.feature
# If use pyspark.ml.feature, then convert to use mllib models cause overheads
train = rescaledData.select("label", "rawFeatures")
train = MLUtils.convertVectorColumnsFromML(train, "rawFeatures").rdd.map(list)
training = train.map(lambda x: LabeledPoint(x[0], x[1]))
'''
traintf = hashingTF.transform(tags)
trainlabel = feedback.select("label").rdd.map(lambda x: x.label,preservesPartitioning=True)
training = trainlabel.zip(traintf).map(lambda x: LabeledPoint(x[0], x[1]))


testdata = spark.createDataFrame([
    (0.0,{"server":0.9, "Flask": 0.7, "python": 0.5}),
    (0.0,{"Nodejs": 0.6, "Javascript":0.4,"Express":0.9,"html":0.7}),
    (0.0,{"Online Perceptron":0.8, "Spark":0.7, "Hadoop":0.4, "pySpark":0.9, "mongdb":0.7,"AWS":0.9})
], ["label","tags"])
spark = SparkSession \
    .builder \
    .appName("feedback") \
    .config("spark.mongodb.input.uri", "mongodb://127.0.0.1/test.colltest") \
    .config("spark.mongodb.output.uri", "mongodb://127.0.0.1/test.colllabeled") \
    .getOrCreate()
testdata.write.format("com.mongodb.spark.sql.DefaultSource").mode("append").option("database",
"test").option("collection", "colltest").save()

test = spark.read.format("com.mongodb.spark.sql.DefaultSource").option("uri",
"mongodb://127.0.0.1/test.colltest").load()
tagscore = test.select("tags").rdd.map(lambda x: {k:v for k,v in x.tags.asDict().items() if v is not None},preservesPartitioning=True)
tags = tagscore.map(lambda x: [k for k,v in x.items() if v>=0.7],preservesPartitioning=True)#select tags with high scores

testtf = hashingTF.transform(tags)

# Combine using zip
#training = labels.zip(tfidf).map(lambda x: LabeledPoint(x[0], x[1]))
# Train and check
"""
Use NaiveBayes model from pyspark.mllib
"""
model = NaiveBayes.train(training)
train_labels_and_preds = trainlabel.zip(model.predict(traintf)).map(
    lambda x: {"actual": x[0], "predicted": float(x[1])})
print train_labels_and_preds.collect()
preds = model.predict(testtf).zip(tagscore).map(lambda x: (str(x[0]),x[1])).toDF(["label","tags"])
labeled_preds = preds.filter(preds["label"]>0)
print labeled_preds.show()
labeled_preds.write.format("com.mongodb.spark.sql.DefaultSource").mode("append").option("database",
"test").option("collection", "colllabeled").save()
#MLUtils.saveAsLibSVMFile(sc.parallelize(training), "tempFile.txt")

#Confusion Matrix of NaiveBayes model:
from pyspark.mllib.evaluation import MulticlassMetrics
from operator import itemgetter
metrics = MulticlassMetrics(
    train_labels_and_preds.map(itemgetter("actual", "predicted")))

print 'Confusion Matrix of NaiveBayes model:'
print metrics.confusionMatrix().toArray()
"""
Use SVMWithSGD model from pyspark.mllib
"""

model = SVMWithSGD.train(training, iterations=100)

train_labels_and_preds = trainlabel.zip(model.predict(traintf)).map(
    lambda x: {"actual": x[0], "predicted": float(x[1])})
#print(labels_and_preds.collect()[:20])

metrics = MulticlassMetrics(
    train_labels_and_preds.map(itemgetter("actual", "predicted")))

print 'Confusion Matrix of SVMWithSGD Model:'
print  metrics.confusionMatrix().toArray()

"""
Use LogisticRegressionWithLBFGS model from pyspark.mllib
"""

model = LogisticRegressionWithLBFGS.train(training)
train_labels_and_preds = trainlabel.zip(model.predict(traintf)).map(
    lambda x: {"actual": x[0], "predicted": float(x[1])})
#print(labels_and_preds.collect()[:20])

metrics = MulticlassMetrics(
    train_labels_and_preds.map(itemgetter("actual", "predicted")))

print 'Confusion Matrix of LogisticRegressionWithLBFGS Model:'
print metrics.confusionMatrix().toArray()

"""
Classify a batch of tf of tags using Perceptron based on RDD
"""
from perceptron import PerceptronforRDD
model = PerceptronforRDD(numFeatures)
[w,b] = model.AveragePerceptron(traintf, trainlabel)
errrate = model.PredictErrrate(traintf,trainlabel)
print 'Training error rate using average perceptron: ',errrate
predict = model.Predict(testtf)
print 'example predict labels for average perceptron:',predict.take(5)

preds = predict.zip(tagscore).map(lambda x: (str(x[0]),x[1])).toDF(["label","tags"])
labeled_preds = preds.filter(preds["label"]>0)
print labeled_preds.show()
# Write the labeled predicted data with tags into mongodb
labeled_preds.write.format("com.mongodb.spark.sql.DefaultSource").mode("append").option("database",
"test").option("collection", "colllabeled").save()
