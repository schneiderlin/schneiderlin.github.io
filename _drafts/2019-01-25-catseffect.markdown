---
layout: post
title: "cats-effect"
date: "2019-01-25 17:34:46 +0800"
---

IO是在evaluate的时候，会产生side-effect的代码块，因为IO只是一串描述，所以是pure，RT的。
IO里面的computation，可以是sync/async的

IO实现了MonadError，如果computation过程中有错误，会short-circuit
IO可以cancel

IO.pure把一个“已经计算好的值”lift到IO，因为是by value的参数，所以不能在里面写side-effect。

IO.apply，描述一个可以马上在当前thread的call-stack evaluate的computation。类似Sync[IO].delay

IO.async，描述一个在别的thread执行的computation。
```
def async[A](k: (Either[Throwable, A] => Unit) => Unit): IO[A] = ???
```
Either[Throwable, A] => Unit是一个callback，用来signal操作完成了.
如果调用了cb(Right),表示可以拿到A了，如果cb(Left)表示有错误，MonadError
callback只是用来表示结束的，并不做任何操作。

IO.cancelable，返回一个IO[Unit],运行这个IO[Unit],就把任务取消了

IO.never = IO.async(_ => ())，永远不调用callback，永远不会完成


IO用来表示带副作用的computation，但是没有指定这个副作用能不能concurrent/cancelable。
要用Concurrent[F[_]]表示某个effect f是可以concurrent的，extend了Async[F[_]]，表示
async的，然后又extend了Sync[F[_]]，表示是可以delay effect的

Sync, Async, Concurrent都是type class，类似functor，applicative，monad。写tagless
final compose的时候，不需要具体的data type，只需要type class F是支持compose方式的就可以。
