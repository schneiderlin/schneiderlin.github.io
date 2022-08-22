---
layout: post
title: GFS
author: linzihao
categories: distribute_system
date: "2018-10-29"
tag: [6.824]
---

## GFS论文 ##
#### 假设 ####
- 文件的数量是GB级别，文件的大小是100MB左右，也支持小文件，但是没有特别优化
- 读的结构一般是大批的streaming read和小规模的random read。stream一般是读1MB，random一般是读几kb
- 写的结构是顺序的append，写了的基本不会改，也支持少量修改，不过不保证效率
- 优化throughput放弃latency
- 直接snapshot和record append

#### 架构 ####
cluster里面有一个master和多个chunkserver。
文件被分为固定大小的chunk，每一个chunk都有一个全局唯一的ID，是64bit的叫做chunk handle，在master创建的时候生成。
chunk一般replica3份放在不同的chunkserver
meta-data的交互跟master进行，所有data的交互都直接跟chunkserver进行。
![](https://i.imgur.com/74uiX7h.png)

#### chunk size ####

chunk size64MB，大chunk size的好处。
client和master交互得到一次meta data之后，就可以和某一个chunk server建立持久的TCP连接，然后读一堆的东西。
chunk size大减少了master需要维持的meta data数量。

chunk size大的坏处。
需要用lazy space allocation
有一些小文件可能只占一个chunk，存这个chunk的server可能会变成hot spot

#### metadata ####
master persistent file的namespace和file2chunk的mapping。
chunk的位置只存在内存，master启动的时候询问chunkserver他存了什么chunk。

#### consistency model ####
什么是file region？
file region的几种状态
- consistent，所有client不管读哪个replica都能读到一样的内容
- defined，mutation的时候没有受到concurrent writer的干扰，就是defined的，并且consistent
- undefined，concurrent的mutation成功，可以保证所有人看到的是一样的，但是可能有一些writer的mutation被覆盖了。也是consistent的，可能混了不同mutation的部分。
- undefined+unconsistent，mutation失败

application只需要区分define和undefined，具体是怎么样的undefined不需要关心。

写数据有两种方式
write和record append
- write是写在application指定的offset
- record append是写在GFS指定的offset，在concurrent的时候不一定是文件的末尾。写完会返回给client一个offset，client将这个offset作为defined region的开始

要保证mutation正确，需要
1. 对一个chunk和他的所有replica都做相同顺序的mutation
2. 用version number检测有没有replica miss了某个mutation


TODO: padding是什么东西

#### mutation的order ####