---
layout: post
title: "sort/hash超出内存大小如何处理"
author: linzihao
categories: database
---

## out of core sorting and hashing ##
RAM的大小是可以放B这么多个Page
需要处理的数据总大小是N

有1个page用来做input buffer，1个page用来output buffer。
因为磁盘处理速度和CPU处理速度不同，所有要有这两个buffer。
存放数据的空间就剩下B-2个page

### out-of-core sorting ###
顺序的读所有要sort的内容，一次读B个，然后在memory里面sorted，写出去。
这样处理完之后，就有N/B个sorted block。

如果两个两个的把sorted block读进内存，在内存中做linear merge然后写出磁盘。这样磁盘里面就会有N/2B个sorted block。
这样的一次操作叫做一个phrase。

![](https://i.imgur.com/jWiKLKd.png)
每一个横线隔开是一个phrase，每一个phrase里面都读了所有全部的数据N，phrase的个数是log_{2}(N/B)个。

如果一次读入B-1个sorted block，phrase的个数就是log_{B-1}(N/B)个。

两次pass可以sort多大的数据？
也就是一个phrase可以sort多少，取决于block的数量
也就是B-1必须大于等于N/B，当等于的时候最大。
N = B(B-1)，也就是sort N需要根号N的空间


### out-of-core hashing ###
为什么要用out-of-core hashing？


顺序的读所有内容，然后用hash function Hp()把N partition成N/B份，使得每一份的内容小于B。

然后把每一份读进内存，然后就是in memory的hash。
如果partition之后，一份的大小还是不能放进memory，就可以把每一份当成N，然后recursive的调用out-of-core hash。

有一个假设是数据本身是可以分开的，如果相同的hash内容太多，就没办法分成N/B份，例如性别只能分成两份。

如果一次过不需要recursion，可以hash多少数据？
每一份的大小不能超过(B-1)
也就是N/B要小于等于(B-1)，当等于的时候N最大
N = B(B-1)，和sort一样


### sort和hash的对比 ###
sort和hash是dual
sort是顺序读N，然后顺序写N/B个block，然后顺序读merge？？

hash是顺序读N，然后随机的写到N/B个block中，然后顺序读每一个


### notation ###
- [R], number of pages to store R
- Pr，number of records per page of R
- |R|，number of records in R

[R] * Pr = |R|

### nested loop ###
```
foreach record r in R
	foreach record s in S
		if θ(r, s) then add <r, s> to result
```
|R|*[S] + [R]
|S|*[R] + [S] smaller

如果[S]可以整个放进内存，可以读一次[S]然后就存在内存里，然后每一个r进来对比一次。cost是[S] + [R]

每一个r tuple都要读一次[S]太多了

### page-oriented nestled loop ###
```
foreach page br in R
	foreach page bs in S
		foreach record r in br
			foreach record s in bs
				if θ(r, s) then add <r, s> to result
```
[R] * [S] + [R]

如果内存够大，应该一次尽量读多几页的R

### chunk nested loop ###
一次读进B-2页的R，然后同上
([R] / B-2) * [S] + [R]


## equil join 的一些优化 ##
如果Θ是一个equality test，为什么我要扫描整个表，我可以先对要look up的表排序，然后binary search

### index nested loop ###
不需要扫描整个S，然后做θ测试了，直接通过index在S中找到符合条件的record，然后加到result中
```
foreach tuple r in R
	foreach tuple s in S where rk == sk
		add <r, s> to result
```
|R| * cost to find maching S + [R]

### sort merge join ###
sort S, R，然后merge的时候，顺便输出
适用于equil join

### hash join ###
hash 较小的S，把小的partition留在内存中，然后stream另一个，做hash的lookup
