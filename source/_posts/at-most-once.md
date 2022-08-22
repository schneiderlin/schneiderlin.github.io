---
layout: post
title: at most once
author: linzihao
categories: distribute_system
date: "2018-11-29"
---

### 如何保证at-most-once semantic ###
客户端每一次发送的时候带一个XID，重试请求的时候发相同的XID。
服务器每一次做完一个请求，把result r缓存起来，seen[xid]=r，当下一次收到相同的XID的时候，直接在缓存里面拿返回结果。

服务器什么时候可以清除缓存？
客户端在发送新的RPC请求的时候，告诉服务器，“<= X的result都已经收到”。服务器就可以把xid <= X的缓存都清空。

或者客户端只能k个outstanding的请求，当服务器收到第k+1个请求的时候，就可以evict最早的缓存。

如果正在处理请求的时候（还没缓存）又收到一个相同的xid怎么办。
开始处理的时候就用一个占位符seen[xid] = future(?)，收到相同的xid就返回future？
如果future一直resolve不到怎么办？