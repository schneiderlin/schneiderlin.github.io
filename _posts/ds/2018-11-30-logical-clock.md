---
layout: post
title: logical clock
author: linzihao
categories: distribute_system
---

## lamport's logical clock ##
日常生活中用physical time来对事件进行排序。例如我们说8点15发生的事件在8点16分发生的事件之前。在分布式系统中，物理时钟不准，所以我们不能依赖物理时间对事件排序。我们用logical clock描述事件之间的partial order。

### 一些数学定义 ###
#### Relation ####
集合A上的一个binary relation R，是A * A的子集。集合A和B上的relation是A * B的自己。
例如{1,2,3}和{a,b,c}的relation有
- {(1,a), (2,c)}
- {(1,a), (2,b), (3,c)}
- {}
- {(1,a), (1,b), (1,c)}

(a,b)∈R表示a R b。
在自然数集合的小于关系(<)中。当两个自然数i和j，如果i小于j，那么i,j in relation。
R是一个无限集合{(0,1),(0,2)...}

#### partial和total order ####
集合A上的irreflexive partial ordering满足3条
- irreflexivity: a≮a
- anti-symmetry: if a < b then b ≮ a
- transitivity: if a < b and b < c then a < c

例如真子集就是一个partial ordering的关系。
需要注意的是，partial order里面的两个元素可以完全没关系，例如
{1,2}和{2,3}，没有真子集关系

irreflexive total ordering是partial ordering的基础上加多一条
- totality: if a ≠ b then a < b or b < a

例如自然数上的小于关系就是total order。

### 事件的partial order ###
happened-before关系是一个partial order，事件a和b。可以是a happened-before b，可以是b happened-before a，也可以是同时发生，a和b没有关系。

在分布式系统中，有一个process的集合，每一个process都执行他们自己的event。一共有3种event可以发生
- local event
- 发消息到另一个process
- 从另一个process收到消息

所有这些event的并集是我们需要order的。可以用space-time graph可视化。每一个垂直的线表示一个process。时间轴的方向是向上，点表示event。有颜色的线表示process之间的message。
![](https://i.imgur.com/C4ofJjQ.png)
在这个系统中，process A有4个event
1. A0, process A发消息给process B
2. A1, process A收到processB的消息
3. A2, process A执行一个local event
4. A3, process A收到process B的消息

现在用->表示happend-before关系
1. 如果a，b是一个process中的两个event，并且a happen before b，那么a -> b。例如A0 -> A1
2. 如果一个process发送消息是event a，另一个process接收消息是event b。那么a -> b。例如A0 -> B2
3. 如果a -> b, b -> c，那么a -> c。例如A0 -> B2, B2 -> B4, B4 -> C3所以A0 -> C3

在图上看，如果a -> b，那么可以沿着线从a走到b。例如A0 -> C3，可以从A0走蓝色线到B2，向上走到B4，然后走紫色线到C3。
只能向上走，时间轴向上。

从图上同样可以看到A2和B3是没关系的，因为之间没有连线。不依赖物理时钟无法判断哪个先发生。

### logical clock ###
这是时钟其实是一个function，把event map到一个数字，这个数字作为timestamp对事件排序。

每一个process Pi都有一个时钟Ci，是一个event到Integer的mapping。
在process Pi中event e的timestamp是Ci(e)。
系统时钟C，也是一个event到integer的function。如果e是Pi中的event，那么C(e) = Ci(e)。
在上面的图中，timestamp由水平虚线表示，例如事件B0到B7的timestamp是0到7.

clock condition
∀a,b.a -> b => C(a) < C(b)

例如A0 -> B2，如果C要满足clock condition，必须满足C(A0) < C(B2)。
注意并不是∀a,b.C(a) < C(b) => a -> b，例如C(A2) < C(B3)，但是A2和B3没有关系。

实现C的算法。
每一个process Pi都维护一个mutable的timestamp Ci。当一个event e发生的时候，令Ci(e) := Ci，然后increment timestamp。
当Pi发消息给Pj的时候，需要带上Ci。当Pj收到消息的时候，令Cj := Ci + Δ。

这个算法保证了C是满足clock condition的。
这样定义整个系统event的total order
用=>表示total order关系。
用≺表示process之间的关系，例如≺是{(A,B),(A,C),(B,C)}
1. if C(a) < C(b), then a => b
2. if C(a) = C(b), a ≺ b，then a => b
在上面的例子中，A1 => B2，A2 => B3

### total order的作用 ###
假如有一个系统里面有很多个process需要分享一个mutex保护的资源。
要保持3个properties
I. 必须要release了才能给另一个process
II. 给资源的顺序必须和请求资源的顺序相同
III. 如果每一个拿资源的都会逐渐释放，那么所有请求都会逐渐满足

II没有说两个concurrent的请求，应该先给哪个。
根据收到请求的顺序决定分配给资源的顺序是不行的。
假设P0是资源调度process，P1发送了一个请求到P0，然后发送消息到P2，P2收到通知消息也请求P0。P2的请求信息是有可能比P1的请求信息更快到达P0的，不满足II。

用logical clock很明显能看出P1的请求happened-before P2的请求。那么如果P0先收到了P2的请求怎么办？需要等到P1的请求也到了才能判断？如果要等，等多久？

加多两个假设，简化问题。
Pi发送多个消息到Pj，Pj收到消息的顺序和Pi发出消息的顺序是一样的。
并且所有的消息最终都会收到。
（这两个假设可以通过实现message number和message acknowledgement的方式移除）
TODO： message number，如果跳号了等多久？TCP乱序是怎么解决的

每一个process都有自己的一个request queue，初始化里面有一个消息T0:P0,T0是所有时钟之前的时间，P0是一开始拿着资源的process。
1. 当要请求资源的时候，Pi发送一个Tm:Pi request resource给所有其他的process，然后把这个消息放进queue
2. 当Pj收到Tm:Pi request resource，把这个消息存在request queue里面，然后发一个带时间戳的ack给Pi
3. 要释放资源的时候，Pi把所有Tm:Pi request resource消息从queue里面移除。然后发送一个带时间戳的Pi releases resource给所有其他process
4. 当Pj收到Pi的releases resource消息时，把queue中所有Tm:Pi request resource移除。
5. 当以下条件满足的时候，Pi获得资源
	1. queue里面有一个Tm:Pi在所有其他request之前(=>关系)
	2. Pi收到了来自所有其他process时间大于Tm的消息

可以把request queue看成一个用total order排序的priority queue。
给资源就是给queue里面的第一个，释放资源的时候把Tm:Pi清空，相当于pop了队列，资源就可以给队列里的下一个。

还有一个问题就是queue里面有一个request的时候，是不是马上给资源？
为了防止有先请求的request还没到。必须要等到所有process都说了一句话(不请求的process会说ack)，这样可以保证没有process因为网络原因request还没到。