---
layout: post
title: fault tolerence vm
author: linzihao
categories: distribute_system
tag: [6.824]
date: "2018-10-29"
---

## fault tolerance VM论文 ##
直接复制状态需要太多带宽，deterministic的操作可以直接复制log。non-deterministic的操作比较麻烦。

一种架构是primary VM和backup VM用shared disk，直接两个server都可以读用户的input。
还有一种架构是分离的disk，所有的input先去到primary，primary通过logging channel把输入发给backup

怎么判断primary或者backup死了
用server之间的心跳+logging channel的流量判断。

当通信挂了，但是两个server都没挂的时候，怎么防止split brain问题

#### deterministic reply ####
记录所有的deterministic操作，所有non-deterministic的操作，例如IO interrupt和read clock。记录发生的时间。

#### Output Requirement ####
当backup server take over的时候，backup的所有output都和primary发给external world的consistent

要保证这个requirement，backup可以delay一段时间，等到channel里面的所有东西都apply了再对外输出。

如果在primary刚对外输出完的时候死了，channel还没有写入。
如果backup replay到最后一个output operation之前go live了，最后一个output operation可能会non-deterministic？

在每一个output operation的后面创建一个特殊的log entry，然后利用output rule
#### Output Rule ####
primary在输出output到external之前，必须等backup通知已经收到这个output operation的log entry

#### 判断fail ####
因为不断会有timer interupt，所以channel是会一直有东西的，如果心跳/channel停了超过一段时间，就判定为fail。

防止split brain
每一个serve在打算go live之前，需要在一个分布式储存系统里面test and set。

Q:bakcup如何处理interrupt的时间
A:用CPU的interrupt after X指令。忘记自己的timer

Q:backup如何处理non pure function
A:FT在backup执行的时候假装interrupt，然后返回primary的函数返回值

#### 还有一些关于disk的实现细节 ####


## raft的log replication ##
#### Committing entries from previous terms ####
老的term的entry，就算replicate足够了，也不能commit，因为可能有一个没replicate到的server当了leader，然后把这个entry覆盖了。

需要等到自己current term commit了一个entry先，因为Log Matching Property，所以之前的也implicit的commit了。

这样可以保证当我死了的时候，大多数已经replicate我的一个高term的entry，不会投票给低term的candidate

#### 什么时候允许overwrite ####
必须是还没commit的


## TODO ##
为什么会有un-needed elections
为什么timer reset只能往下减不能往上加？