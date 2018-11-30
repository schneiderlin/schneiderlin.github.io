---
layout: post
title: stream system
author: linzihao
categories: distribute_system
---


- joins over time window
- multi-pass data mining algorithms
- fault-tolerance buffer
- stateful pipeline

### distribute query processing的套路 ###
partition和shuffling，把大的data set分成单机可以处理的大小。

如何partition有利于selection和projection(range query)？

能够单机独立处理的都好办，关键是如何做distribute join。
每一个processing都先独立join他那部分的data，最后再整合。

distribute join分成两类
- disjoint data partitioning
- divide and broadcast join

### disjoint data partitioning ###
根据join key（两个relation里面共同的key）把data分成disjoint的多份数据。每一份都可以独立join(相同的join key一定在同一份数据里)，最后直接把所有独立join的结果concat。
![](https://i.imgur.com/RxV1MNY.png)

### divide and broadcast join ###
把第一个dataset分成几份，然后把第二个dataset replicate到所有的process
![](https://i.imgur.com/Q97v9WG.png)
这种适合第二个dataset比较小的情况。
在stream system中，可以用来做stream enrichment(admixture)

上面的这两种都可以用message passing的方式实现。query engine可以看成是message queue连接的分布式节点。

## pipelining ##
stream的特征是不能阻塞，不能等某一部分的input进来，然后在等的过程中没有输出。
sorting很明显办不到，sort必须要看到所有的input，才能决定如何排序。
下面是一个可以pipeline的例子。
![](https://highlyscalable.files.wordpress.com/2013/08/join-pipeline.png)

admixtures的时候就可以用这种方式。
R数据集需要在网络中传输很多次，有什么方式优化

还有一种高级的hash join叫symmetric hash join
![](https://highlyscalable.files.wordpress.com/2013/08/symmetric-join.png)
普通的hash join需要stream1的input全部都到了才可以做一个hash table，然后开始stream2.symmetric hash join可以两个stream同时开始。

stream到了之后，先lookup，如果能找到就输出。无论lookup有没有成功，都存到hash table里面。
如果有一个stream是无限的，那么hash table会被挤爆，所以需要一个evict的policy。
这种hash join还可以用来实现time base的join，时间过长的被evict掉就join不到一起。