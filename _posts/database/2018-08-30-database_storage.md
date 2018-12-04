---
layout: post
title: "数据库的储存方式"
author: linzihao
categories: database
---

## Log
只能append的一个file
为什么要用log，不直接在in place overwrite？
- 写操作更快，因为是顺序的写不是随机的写。
- concurrent支持更好，因为旧记录是immutable的
- 统一的merging避免了数据散落在硬盘的不同分区
- 可以作为防止crash的手段

## index
hash-index: key-value储存到hashMap中
index不用存全部，分段的存（skip list）

## SST(sorted string table)
Sorted String Table: 每一个segment都是sorted by key的，当query某个key的时候，就可以先去到对应的segment

在内存里面maintain一个AVL tree之类的东西（memtable），每一个log的append操作进来都执行二叉树的插入操作，当内存的AVL元素达到一定阈值的时候，写出到磁盘，形成一个segment

### SST的优化 ###
如果query一个不存在的key，首先要查memtable，然后最近的segment...一直到最老的segment。
可以用bloom filter判断key是否存在

两种merge policy
- size-tiered，小的segment优先合成大的segment
- leveled compaction，看不懂

## B-tree ##
每一个节点叫做一个page，page是固定大小的，这个大小和底层的硬件有关。page之间有引用
一个父节点中子节点的数量叫做branching factor。
![](https://i.imgur.com/aXv7bbV.png)

更新的时候直接找到对应的叶节点更新值，不影响引用。
插入的时候如果没有位置了，就把插入节点从中间分开，然后插入
![](https://i.imgur.com/k4zYW7V.png)

### B-tree的优化 ###
如果在插入的时候split了page，然后还没更新parent page的时候crash了，就会出现orphan page（任何parent里面都没有他的引用）
需要加一个redo log，或者叫write-ahead log(WAL)

concurrent control比log结构复杂，log结构只需要每一次的写入都是atomic，然后swap segment的时候是atomic。
B-tree有一种concurrent control也是参考了log结构，先创建好一个新的page，然后切引用

range query比log结构慢
加上sibling pointer可以优化一点点


## 其他 ##
不是主键怎么存
- 拼接一个主键
- 用inverted index那种方式，一个键后面存的是一个list

second index
- non-cluster(heap file)，主键key里面存的value是一个引用，指向heap file
	在更新的时候直接根据key找到heap file，然后更新，不需要更新key
- cluster，key里面存的就是对应的value（mysql默认主键存储方式）
