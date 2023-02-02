---
layout: post
title: 全链路追踪的各种概念
author: linzihao
categories: distribute_system
date: "2023-02-02"
---

全链路指的是从客户端发起请求开始, 到网关, 可能经过多个应用服务器, 再到数据库.
全链路追踪是为了方便排查问题, 不再需要人工的把各种零散的日志拼凑起来.
在链路中放任意的自定义数据, 这些数据是会在链路中一直往后传递的. 可以用于灰度测试, 在链路的上游对流量进行标识, 后续在路由流量时, 如果发现链路中有灰度标识, 就转发给灰度环境.

以下介绍 OpenTracing 中的概念, OpenTracing 是一套做全链路追踪的标准, 有很多的类库都提供了符合 OpenTracing 标准的 API. 
每个实现稍有不同, 可能会引入一些 OpenTracing 以外的概念, OpenTracing 大致是个公共子集.

## Trace
完整的一条链路就是一个 Trace, Trace 是由多个 Span 组成的一个 DAG(directed acyclic graph). 节点是 Span, 边是 Reference.

## Span
Span 的粒度有大有小, 链路从进入网关到出网关, 这一段是一个 Span, 在网关中执行了某个函数, 也是一个 Span, 这个函数还调用了其他的函数, 其他的这些函数也是 Span.

| Span 网关 ...............|
  | Span 入口函数 .........|
     | Span f1 | |Span f2|

Span 里面包含了
- 操作名称
- 开始时间
- 完成时间
- tag 集合, 业务代码可以在当前 span 上打任意的标签
- log 集合, 类似 tag, 业务可以打日志, 日志和 tag 的区别是日志是带时间戳的
- SpanContext, 后续介绍
- Reference, 到其他 Span 的引用, 上图中的入口函数包含了 f1, f2 的引用, 具体后面介绍. 

## SpanContext
里面包含了每个实现方式需要用到的各种状态, 例如 SpanId, TraceId 之类用于维护 reference 的.
还有 `Baggage Items`, 是业务代码中使用的各种 key value pair.

SpanContext 中的所有状态都是跨线程, 跨进程传递的. 

## Reference
reference 有两种, ChildOf 和 FollowsFrom

ChildOf 表示嵌套关系, 例如一个函数调用了另外 3 个函数.
FollowsFrom 表示顺序关系, 例如 mq Producer 发送消息, 随后 Consumer 消费消息