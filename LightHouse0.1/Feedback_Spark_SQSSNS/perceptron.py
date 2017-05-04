"""

Binary Perceptron class: PerceptronforRDD
To train an Online Perceptron model: PerceptronBatch(m,y,MaxItr=10) #m is RDD data, y is label {1, -1}
To trian an Average Perceptron model: AveragePerceptron(data, label, MaxItr=10) #data is RDD data, label is label{1, -1}
To predict: Predict(data) # input data is RDD with sparse vectors as elements

by Yilan Ji

"""

import numpy as np
import random
from scipy.sparse import coo_matrix
import json

# m sparse matrix
# d dimension
# y label
# m should be preprocessed into a sparse matrix,so currently this function may not work
def Perceptron_train(m,y):
	w=coo_matrix(np.zeros(m.shape[1]))
	b=0
	y = [-1*(x==0 or x==-1)+(x==1) for x in y]
	for i in range (m.shape[0]):
		a=w.dot(m[i].T).todense()+b
		if y[i]*a<=0:
			w=w+y[i]*m[i]
			b=b+y[i]
	return [w,b]


def AveragePerceptron(data, label):
	w = coo_matrix(np.zeros(data.shape[1]))
	u = coo_matrix(np.zeros(data.shape[1]))
	b = 0
	c = 1
	beta = 0
	label = [-1*(x==0 or x==-1)+(x==1) for x in label]
	for i in range(data.shape[0]):
		predict = w.dot(data[i].T).todense() + b
		if label[i]*predict<0 or label[i]*predict==0:
			w = w + label[i]*data[i]
			b = b + label[i]
			u = u + c*label[i]*data[i]
			beta = beta + c*label[i]
		c += 1
	w = w - u/c
	b = b - beta/c
	return [w,b]

def PerceptronPredict(testdata,w,b):
	predict = []
	for i in range(testdata.shape[0]):
		p = w.dot(testdata[i].T).todense() + b
		p = -1*(p<0)+1*(p>=0)
		predict.append(p)
	return predict

class PerceptronforRDD():
    def __init__(self,numFeatures=1000, w=np.zeros(1000),b=0.0,u_avg=np.zeros(1000),beta_avg=0.0,count_avg =1.0):
		if len(w)!= numFeatures:
			self.w = np.zeros(numFeatures)
			self.u_avg = np.zeros(numFeatures)
		else:
			self.w = w
			self.u_avg =u_avg
		self.b = b
		self.beta_avg = beta_avg
		self.count_avg = count_avg

    def save(self,path_json,average=True):
		w = self.w
		u_avg = self.u_avg
		if average==True:
			parameters = {"w":w.tolist(),"b":self.b,"u_avg":u_avg.tolist(),"beta_avg":self.beta_avg,"count_avg":self.count_avg}
		else:
			parameters = {"w":w.tolist(),"b":self.b}
		model_param=parameters
		with open(path_json, 'w') as outfile:
			json.dump(model_param, outfile)
			outfile.close()
		print "write model parameters to json file complete! path:",path_json

    def load(self,path_json,average=True):
		with open(path_json) as data_file:
			param = json.load(data_file)
			data_file.close()
		if average==True:
			self.w=np.array(param['w'])
			self.b=param['b']
			self.u_avg=np.array(param['u_avg'])
			self.beta_avg=param['beta_avg']
			self.count_avg=param['count_avg']
		else:
			self.w=np.array(param['w'])
			self.b=param['b']
			self.u_avg = np.zeros(len(self.w))
			self.count_avg = 1.0
			self.beta_avg = 0.0
		print "load model parameters from json file complete! path:", path_json
		return self

    def perceptronSingle(self,m,y):
        y = y.map(lambda x: -1.0*(x==0.0 or x==-1.0)+(x==1.0))
        pred = m.first().dot(self.w)+self.b
        if y.first()*pred<0:
            self.w = self.w+y.first()*m.first().toArray()
            self.b = self.b+y.first()
        return [self.w, self.b]


    def perceptronBatch(self,data,labels,MaxItr=10):
		y = labels.map(lambda x: -1.0*(x==0.0 or x==-1.0)+(x==1.0)).collect()
		m = data.collect()
		ind = range(len(m))
		random.shuffle(ind)
		for time in range(MaxItr):
			random.shuffle(ind)
			for i in ind:
				pred = m[i].dot(self.w)+self.b
				#print "label and predict:",y[i],pred
				if y[i]*pred<0:
					#print "label and predict:",i,y[i],pred
					self.w = self.w+y[i]*m[i].toArray()
					self.b = self.b+y[i]
		return [self.w, self.b]

    def AveragePerceptronOne(self, data, label):
		label = label.map(lambda x: -1.0*(x==0.0 or x==-1.0)+(x==1.0))
		label = label.collect()
		data = data.collect()
		ind = range(len(data))
		random.shuffle(ind)
		for i in ind:
			pred = data[i].dot(self.w) + self.b
			if label[i]*pred<0:
				self.w = self.w + label[i]*data[i].toArray()
				self.b = self.b + label[i]
				self.u_avg = self.u_avg + self.count_avg*label[i]*data[i].toArray()
				self.beta_avg = self.beta_avg + self.count_avg*label[i]
			self.count_avg += 1.0
		self.w = self.w - self.u_avg/self.count_avg
		self.b = self.b - self.beta_avg/self.count_avg
		return [self.w,self.b]

    def AveragePerceptron(self, data, label, MaxItr=10):
		label = label.map(lambda x: -1.0*(x==0.0 or x==-1.0)+(x==1.0))
		label = label.collect()
		#data=data.map(lambda x: x/sum(x))
		data = data.collect()
		ind = range(len(data))
		for time in range(MaxItr):
			random.shuffle(ind)
			for i in ind:
				pred = data[i].dot(self.w) + self.b
				if label[i]*pred<0:
					#print "label and pred for",i,":",label[i],pred
					#print "data:", data[i].toArray()
					self.w = self.w + label[i]*data[i].toArray()
					#print "b before train:",self.b
					self.b = self.b + label[i]
					#print "b after train:", self.b
					self.u_avg = self.u_avg + self.count_avg*label[i]*data[i].toArray()
					#print "beta_avg before train: ",self.beta_avg
					self.beta_avg = self.beta_avg + self.count_avg*label[i]
					#print "beta_avg after train:", self.beta_avg
				#self.u_avg = self.u_avg + self.w
				#self.beta = self.beta + self.b
				self.count_avg += 1.0
				#print "count number:", self.count_avg
		self.w = self.w - self.u_avg/self.count_avg
		self.b = self.b - self.beta_avg/self.count_avg
		return [self.w,self.b]


    def predict(self,data):
        w = self.w
        b = self.b
        predict = data.map(lambda x: x.dot(w)+b)
        predict = predict.map(lambda p: -1.0*(p<0)+1.0*(p>=0))
		#print predict.take(10)
        return predict

    def predictPositive(self,tf,links):
		w = self.w
		b = self.b
		predict = tf.map(lambda x: x.dot(w)+b, preservesPartitioning=True).zip(links)
		predictPositive = predict.filter(lambda p: p[0]>=0)
		print predictPositive.take(10)
		return predictPositive


    def PredictErrrate(self,data,label):
		w = self.w
		b = self.b
		predict = data.map(lambda x: x.dot(w)+b)
		predict = predict.map(lambda p: -1.0*(p<=0)+1.0*(p>0))
		#print(["predict",predict.count(),predict.first()])
		#label = label.map(lambda x: -1.0*(x==0 or x==-1)+1.0*(x==1))
		#print(["label",label.count(),label.first()])
		ones = predict.zip(label)
		err = ones.map(lambda (x,y): 0*(x==y)+1*(x!=y)).sum()
		#print(err)
		errrate = float(err)/float(label.count())
		return errrate

    def perceptronBatch0(self,train,MaxItr=10):
		y = train.map(lambda x:x["label"]).map(lambda x: -1.0*(x==0.0 or x==-1.0)+(x==1.0)).collect()
		m = train.map(lambda x:x["tf"]).collect()
		ind = range(len(m))
		random.shuffle(ind)
		for time in range(MaxItr):
			random.shuffle(ind)
			for i in ind:
				pred = m[i].dot(self.w)+self.b
				#print "label and predict:",y[i],pred
				if y[i]*pred<0:
					#print "label and predict:",i,y[i],pred
					self.w = self.w+y[i]*m[i].toArray()
					self.b = self.b+y[i]
		return [self.w, self.b]

    def predictPositive0(self,test):
		w = self.w
		b = self.b
		predict = test.map(lambda x: {"predict":x["tf"].dot(w)+b,"url":x["link"]}, preservesPartitioning=True)
		predictPositive = predict.filter(lambda p: p["predict"]>=0)
		print predictPositive.take(10)
		return predictPositive
