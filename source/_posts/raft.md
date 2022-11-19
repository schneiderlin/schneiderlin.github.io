---
layout: post
title: raft
author: linzihao
categories: distribute_system
tag: [6.824]
date: "2018-10-29"
---

## Raft ##
是一个replicate state machine的protocol。
raft管理了用户的所有请求，形成一个log。并且保证所有的replica都同意这个log。
执行写操作的时候，按照log的顺序执行，所以每一个replica里面的状态是一样的。
如果有一个server死了，回来的时候可以根据log更新到同步状态。

当超过多数的server不能通信的时候，raft不能执行，需要等到多数server恢复通信。

节点的状态
- follower
- candidate
- leader
一开始全部节点都是follower，当收不到leader的消息的时候，可以变成candidate。
candidate往其他node发送投票信息，其他node回复投票，当一个candidate收到多数的票，成为leader。这个过程叫leader election

client的所有请求都发到master的log里面，当log还没commit的时候，node的内部状态保持不变。
master把log entry发送给其他的node，当收到大多数的响应的时候，leader commit自己的log，然后通知其他人这个log commit了，这个过程叫做log replication

#### leader election ####
election timeout，follower经过这个timeout没有收到leader的信息，就会变成candidate。每一个节点的timeout是不一样的，一般是150ms到300ms之间的随机数。

当一个节点变成candidate的时候，开始一个election term（死一个leader就更新一次leader term），自己投票给自己，然后发出request vote。
如果收到request的节点在这个term还没有投过票，就会投票，然后重置自己的election timeout。

保证了每一个term只能有一个leader。
当两个candidate平票的时候，又是一个随机的timeout，timeout结束过后开始新一轮的election

当network partition结束的时候，较低election term的leader会step down，因为少数的partition里面生成不了新的leader。step down只会发生在老leader被隔离成少数派了。

### log replication ###
client把请求写到leader的log里面。
leader发出Append entries的消息给follower，每一个heartbeat timeout，就会发送一次。
follower响应append entries消息。

当大多数都响应了，leader就会commit，然后response发给client

为什么可以防止split brain
因为commit之前必须要得到大多数的响应，所以少数的那边没有办法commit。
当partition结束的时候，少数把log更新成多数人的log（收到来自更高election term的leader的消息）


TODO：
- leader已经commit了，但是还没通知其他人commit，然后挂了怎么办
- 读数据在哪里读？
- follower如何知道哪些log已经执行了，例如有一些commit的通知没收到

log matching property
如果两个log里面某一个index上的term一样，那么这两个log entry一定一样。前面的所有log entries也一定一样

leader completeness property
当一个log commit了，所有未来的leader都一定存了这个entry


Q：如何防止选了一个log不完整的node作为leader。
A：leader completeness property。每一个candidate请求投票的时候，都要发自己的最后一个log entry是什么。
如果收到了一个投票请求，然后发现最后一个log entry的index/term没自己的高，就不投票。


Q：log发送多少内容？整个log发送？错过了一些内容怎么看回以前的？
A：append entries的消息内容：发送当前的entry和term，加上上一个的index和term。
follower收到对比上一个的term和entry和自己的最后一个是不是一样，如果一样就可以接收。
如果不一样，证明follower错过了一些，或者是partition的时候往前写了一些脏数据。
leader知道了这个情况之后，就会把log的再上一个entry带上发给follower