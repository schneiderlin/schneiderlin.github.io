---
layout: post
title: map reduce
author: linzihao
categories: distribute_system
tag: [6.824]
date: "2018-11-30"
---

## map reduce论文 ##
https://pdos.csail.mit.edu/6.824/papers/mapreduce.pdf

map reduce流程
- fork创造出很多个worker和一个master
- input被分成m份，master把map/reduce任务分配给worker
- worker把input输入到map函数，输出放在memory
- 过一段时间，memory中的intermediate内容partition成R分存在硬盘，并把位置告诉master
- reducer iterate的读取intermediate的内容

master需要储存的内容
- 每一个map/reduce task的状态(idle,in-progress,fail,success)
- 每一个worker的id
- intermediate file的位置和大小

fault tolerance
worker failure
- master定时向worker发送心跳
- worker没有响应，把worker completed的map task改成idle
- 把in-progress的reduce task改成idle

Q:为什么completed的map task还要重做？
A:因为map的输出intermediate file是放在local disk的。而reduce的输出是放在global file system的

Q:reduce task正在做的过程中，有一个intermediate file要重做，怎么办?

master filure
- master定时把状态写出来作为checkpoint
- 当master死了，可以从checkpoint的数据重建一个master继续做

Q:nondeterministic的任务重试有什么影响？

input一般是放在map reduce集群上的分布式文件系统
master在分配任务的时候，要考虑文件的位置，尽量分配本地input给worker做

task granularity
一般来说M和R越大越好
- 有例如failure之后的重做
- load balance优势

M和R的瓶颈
master需要分配O(M + R)的task，保存intermediate file位置需要O(M * R)
一般分配之后，一个input的大小大概是16MB到64MB，根据分布式文件系统的block size决定，优化locality。
R的大小一般是业务需求决定

当差不多结束的时候，每一个in-progress的任务叫多几个worker来做，这种叫做backup task。

combiner
如果reduce的输入是一个monoid，可以用combiner，一般跟reducer是同一个函数，不过是在map完之后跑，跑完的结果输出到local disk