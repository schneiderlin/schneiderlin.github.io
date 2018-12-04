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

可以用stream system实现distribute database的query engine。

### stream replay ###
- 可以用来debug
- 可以作为一个重试机制实现FT

可以用一个buffer来实现部分replay
![](https://highlyscalable.files.wordpress.com/2013/08/replay-buffer.png)

### lineage tracking ###
event在stream system中经过多个processor的处理，最后去到终点，形成一个directed graph。最终一个event在这个图里面的轨迹就是lineage traking。

Twitter的Storm用跟踪轨迹确保at-least-once。
- 在source产生event的时候，给event分配一个随机ID，每一个source都记录eventId -> signature的mapping。signature初始化就是event id。
- 下游的节点在收到event后，可以产生0或多个event，每一个event有一个新的随机ID和收到event的ID
- 如果一个event被某一个node处理了，这个node就把event的signature改成(原始sign) xor (原始sign) xor (所有派生event sign)
- 一个事件可以基于多个事件派生的
- 如果event的signature是0，那么就算完成了。终止节点ack事件完成，然后发送commit消息给source
- 周期性的检查source上面那个eventId -> signature，找到signature不是0的，然后要求source replay
- 因为xor操作是semigroup，所以signature update的顺序不需要同步
- 运气非常不好的情况下signature可能会变成0但是没做完，用64bit ID可以把概率降低到2^(-64)

![](https://highlyscalable.files.wordpress.com/2013/08/lineage-tracking-storm1.png)

这里的signature就是lineage tracking

所有节点都是idempotent的时候就可以用，如果不是，怎么办？
并发量很高的时候，大量的ack和XOR也是瓶颈。

at-least-once可能重复处理，因为有周期性的重试。

Apache Spark的架构
最终result是incoming data的function。
把incoming data分成batch，result是batch of incoming data的function。
每一个batch都有对应的ID，任意时刻都可以根据ID找到对应的batch，parallel的生成transaction，把input batchs变成persistent的result batch。
可以保证exactly-once
![](https://highlyscalable.files.wordpress.com/2013/08/stream-join-microbatching-tx.png)

这是join两个stream然后再经过一个中间环节的例子。

### state checkpoint ###
上面Storm的那个用signature保证at-lease-once的有两个问题。
- 很多情况下需要exactly once
- 节点可能是有状态的，需要persist和replicate这些状态

Storm用以下protocol解决
- event被分成batch，每一个batch有一个transaction ID。这个ID是单调递增的。如果pipeline在处理一个batch的时候失败了，这个batch会已同样的transaction ID再发送一次
- 首先通知所有的节点，一个新的transaction要开始了。然后把batch发送给pipeline。最后每个节点commit状态，保存到外部database
- 保证commit的顺序，transaction 2不能比transaction 1先commit
	- 最后一个transaction ID随着状态commit
	- 如果commit的ID和数据库里面的ID不一样，才允许commit。假设已经保证了commit顺序，这个可以额外保证每一个commit只能出现一次。
	- 如果ID是一样的，证明这是一个replay，跳过commit步骤。
	- 前面的node经常会空等后面的node处理完，然后commit，可以把process改成parallel的，只有commit是sequential的。
	![](https://highlyscalable.files.wordpress.com/2013/08/pipelining-commits-2.png)

假设data source是可以replay并且fault-tolerant的，那么就可以保证exactly-once。