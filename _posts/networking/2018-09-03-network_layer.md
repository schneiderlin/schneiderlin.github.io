---
layout: post
title: "网络协议七层模型"
author: linzihao
categories: networking
---

## OSI
- physical
决定频率，信号等，只把数据转换成信号然后发送，在传输过程中可能会被干扰，所以需要data link来处理错误
- data link
决定某一时间多少数据，数据的格式，传到哪一条cable，检测错误等。检测到错误的时候，直接扔到，不通知sender重新发送。
- network
- transport
- session
负责检查需要的数据是否完整，TCP的已经做了，这里就不用做，UDP的检查到不完整一般不重发
- presentation
- application

每一个device都要向上读N层的数据，然后传给下一个或者返回
![](https://www.ictshore.com/wp-content/uploads/2016/09/1005-12-Data_processing.png)

## TCP/IP
- network access, 包括了physical和data link，都是物理的
- network，负责通知data link下一个直接连接的device是什么
一般是IP
- transport，负责把network拿到的东西传给正确的应用
一般是TCP/UDP
network地址127.0.0.1加上transport地址8080合起来就是socket地址

## topology
bus结构的网络因为是共用一个连接，所以在同一个时间内只有一个node可以说话，一般用CSMA/token ring算法来解决scalable的问题。

### CSMA
监听连接，决定自己是否可以说话。
```
while ( true )
  if ( hasSomethingToTransmit() )
    while ( mediaIsBusy() ) ;
    wait(96bit_time);
    if ( mediaIsIdle() )
      transmit()
      while ( transmitting() )
		// 传输的同时监听有没有别的声音
        if ( collision() )
		   // 发送一个信号给冲突方，通知他等待随机时长
           jamSignal()
           wait( random() )
```
### token ring
一个master node先生成一个token，然后把token和要传递的信息交给环上的下一个node。下一个node在token上拿信息/放信息，然后传递给下一个。



## 网络配置 ##
公司public ip 116.22.32.181
ISP提供的public ip是有可能变化的，除非买了static ip

### default gateway ###
默认网关，局域网要给外网发消息，消息就先通过默认网关，然后发出去，接收的时候port forward?
网关不一定要是router，也可以是一台有两个network adapter的机器，一个连内网一个连外网

### port forward ###
在路由器admin页面配置，也有可能叫virtual server
port forward是固定的，NAT是动态的

要长期使用port forward，就要设置一个static private ip，直接在ipv4的properties里面设置，subnet mask和gateway和之前用一样的。DNS要用外面的DNS

### NAT(network address translation) ###
局域机器和router之间通过DHCP连接
private ip的package直接发送给外网会自动被丢，local ip是non-routable address，router有一个routable地址，NAT就是这两个地址之间的转换。

NAT table就是记录消息返回之后应该交给那个local ip

### DHCP（dynamic host configuration protocol） ###
dynamic IP address server，是一个应用层协议
DHCP客户端发送一个DHCP discover的广播包。
DHCP服务器收到discover包之后，把未分配的IP地址放在offer包里面广播出去

### ICMP ###
通知错误的时候用的协议

### DNS ###
如果DNS和default gateway一样，要把DNS改成外面的DNS，可以问ISP


## 网络层和传输层的区别 ##
![](https://user-gold-cdn.xitu.io/2017/12/13/1604f6eba3aa2f38?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)
传输层是end to end的，网络层是中间的所有路由器都要用的

## TCP ##
TCP的可靠性是指在每一条消息发送成功后都会带一个ACK

TCP有一个缓冲区，在收到ACK之前发出去的内容会存在缓冲区里面，收到ACK的时候才清除

### 分片 ###
分片是在IP协议里面处理的，因为离链路层最近
链路层对dataframe的长度有一个MTU的限制，每一个节点的MTU都不一样，所以分片可能发生在中间路由/源主机上

TCP里面有MSS（maximum segment size），IP是因为MTU的限制被动分片。MSS是在三次握手的过程中协商的主动分片，避免中间被动分片的计算量。

TCP的keepAlive是操作系统负责响应的

### 交互数据流和成块数据流 ###
交互数据流收到消息不马上发ack，等一段时间，如果有其他内容，跟ACK合并发送。

Nagle算法，同一时间只能存在一个没有ack的分组。其他分组不会发送出去，先堆积起来等到ack收到了再一起发。提高了payload占比

成块数据流
用窗口处理发送速度比接收速度快的情况
![](https://upload-images.jianshu.io/upload_images/4437917-0d73ca5704cf3169.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/924/format/webp)

慢启动，方式中间节点缓存不足。一开始发1个分组，然后翻倍
