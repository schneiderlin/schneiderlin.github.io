---
layout: post
title: "akka实现logical timestamp和分布式锁, part 1-1: 问题描述和总体框架"
date: "2018-12-25 15:39:54 +0800"
category: scala
author: linzihao
---

用akka实现一个分布式锁，并且模拟各种网络环境进行测试(延迟，重复，乱序，丢包等)，这个实现
必须在所有的网络情况下都能正常工作。  

这个系列分成两部分，第一部分是akka实现一个分布式锁和单元测试。第二部分是用fuzz test的方式
模拟生成各种网络情况进行测试。

在第一部分中，主要学习这个分布式锁的协议和logical timestamp，熟悉akka和akkatest。

要实现一个具有以下属性的分布式锁
I. 必须要release了才能给另一个process
II. 给资源的顺序必须和请求资源的顺序相同
III. 如果每一个拿资源的都会逐渐释放，那么所有请求都会逐渐满足

注意这里有一个关键是 给资源的顺序必须和请求资源的顺序相同 ，不可以乱序。
在分布式环境中，可能有一个进程先请求资源，但是由于网络延迟，这个请求信息到达资源方的时候，
另一个后发的进程已经把资源独占了。

在一些需要保证资源分配顺序的场景下，需要一个共识算法，这个共识算法在n个进程中对“谁是第一个
请求资源的进程”达成一致。
在达成一致后，这个一致认同的进程才会发送请求给资源方，所有其他进程不会竞争。

进程 --> 共识算法 --> 资源方

那么现在是不是把进程 --> 资源方的竞速改成了进程 --> 共识算法的竞速？
首先到达共识算法的进程，会被一致认为是“第一个请求资源的进程”？
如果是这样，那么这个共识算法就没意义了，只是换了一种竞速的方式。

这里的关键是进程在给共识算法发请求的时候，带上当前请求的时间戳。共识算法会根据时间戳判断
究竟是哪个进程先请求的。
但是在分布式环境中，并不是每一个节点的物理时钟都是同步的，如果有一个节点时钟稍快，那么这个
节点更有可能抢占资源。所以在分布式环境中不能用物理时钟，要用logical clock

### 用akka重新描述问题
在这里每一个进程都是一个Process Actor，进程运行的过程中，偶尔会需要请求资源。

> 为了方便测试，这里写成一旦Process Actor收到ClientRequest消息，就请求资源。
实际上请求资源的行为是进程自发的（代码执行到某一个点，需要请求资源），
并不是收到Client的消息开始请求资源。

在测试的时候，往Process Actor发送ClientRequest消息来模拟进程需要资源。

```
case object ClientRequest

class Process(priority: Int) extends Actor {
  
  var peers: Set[ActorRef] = Set()
  var isHoldingResource: Boolean = false
  
  override def receive: Receive = {
    case ClientRequest =>
      if (isHoldingResource) {
        sender ! "already holding resource"
      } else {
        val request = Request(self, getAndIncrementTimestamp())
        peers foreach {
          peer => peer ! request
        }
        ...
      }
    }
}
```
Request消息是通知其他节点，“我在时间点？请求资源”
```
case class Request(actor: ActorRef, timestamp: Timestamp)
```
peers是所有的其他节点，这里不考虑有节点加入或离开的情况，专注分布式锁协议
因此peers是提前固定的，在测试开始之前，生成了所有的节点 Set(所有的节点)
```
case class SetPeers(peers: Set[ActorRef])

def receive: Receive = {
  ...
  case SetPeers(actorRefs) =>
    this.peers = actorRefs.filter(_ != self)
  ...
}
```

当达成共识之后，用一个println模拟某个进程获取到了资源
```
def tryGetResource(): Unit = {
    if (canGetResource) {
      isHoldingResource = true
      println(s"${self.path.name} got the resource")
    }
  }
```

以上就是用akka写这个分布式锁协议的基本框架
- 每一个进程是一个Actor
- 需要请求资源的时候，给所有的其他节点发送Request消息
- 节点之间根据Request消息达成共识
- 用println模拟共识算法 --> 资源方
