---
layout: post
title: "free functor/monad"
author: linzihao
categories: functional_programming
date: "2019-01-02 11:03:38 +0800"
---

Functor可以用map改变F[_]里面的type   
Monad可以用flatMap改变M[_]里面的type    
那么是否可以保持容器里面的type不变，改变容器的类型。这是一个functor到functor的morphism，是
natural transformation。  

加入在某个项目中，同时用了Monix的Task，scala collection的Future/Promise，java的CompletableFuture，
想要在这些容器之间转换，就需要用到natural transformation。   

### 如何实现在functor之间转换
用一个Free type class，Free像其他的functor一样，都有一个map方法，不过这个map方法不是马上执行的，
而是有一个延迟(more on this later)。  
```
sealed triat Free[S[_], A] {
  def map[B](f: A => B): Free[S, B] = 
    Free.Mapped(this, f)
}
object Free {
  final case class Point[S[_], A](a: A) extends Free[S, A]
  final case class Mapped[S[_], A, B](fa: F[A], f: A => B) extends Free[S, B]
}
```
注意Mapped的fa参数类型是F[A]，
也就是Mapped(fa: Future[A], f: A => B)可以是一个Free[CompletableFuture[_], B]   
Mapped相当于创建了一个object记下了原来的所有内容和f，并没有马上应用f。  
Point是最原始的状态，从来没有被map过。  
叫Free的原因是因为他能随意转换成任意的functor，例如转化成一个Future   

```
object futureInterpreter {
  def apply[S[_], A](free: Free[S, A]): Future[A] = 
    free match {
      case Free.Pure(a) =>
        Future.successful(a)
      case Free.Mapped(fa, f) =>
        futureInterpreter(fa).map(f)
    }
}
```

例如转换成一个Id
```
object idInterpreter {
  def apply[S[_], A](free: Free[S, A]): Id[A] = 
    free match {
      case Free.Pure(a) => Id(a)
      case Free.Mapped(fa, f) => idInterpreter(fa).map(f)
    }
}
```

回到最开始的问题，如果要把Future转换成Promise，可以把Future[A]包装成一个Free[Future, A]。
然后用一个PromiseInterpreter把Free转换成Promise

### cats中的functionK
functionK是higher-kind-function，跟natural transformation是同一个概念，scalaz里面叫natural transformation。   
cats文档里面用了一个DSL的例子，在这个例子中，是要把DSL(KVStoreA)包装成Free[KVStoreA, A],  
然后把这个Free转换成Id/Future   

定义DSL中所有的语法ADT
```
sealed trait KVStoreA[A]
case class Put[T](key: String, value: T) extends KVStoreA[Unit]
case class Get[T](key: String) extends KVStoreA[Option[T]]
case class Delete(key: String) extends KVStoreA[Unit]
```

包装成Free，这样就可以把KVStoreA转换成任意的functor
```
type KVStore[A] = Free[KVStoreA, A]

// Put returns nothing (i.e. Unit).
def put[T](key: String, value: T): KVStore[Unit] =
  liftF[KVStoreA, Unit](Put[T](key, value))

// Get returns a T value.
def get[T](key: String): KVStore[Option[T]] =
  liftF[KVStoreA, Option[T]](Get[T](key))

// Delete returns nothing (i.e. Unit).
def delete(key: String): KVStore[Unit] =
  liftF(Delete(key))

// Update composes get and set, and returns nothing.
def update[T](key: String, f: T => T): KVStore[Unit] =
  for {
    vMaybe <- get[T](key)
    _ <- vMaybe.map(v => put[T](key, f(v))).getOrElse(Free.pure(()))
  } yield ()
```

因为KVStore是一个free monad，所以可以像monad一样compose起来，实际上是记录了原始的信息和所有的
map/flatMap方法。
```
def program: KVStore[Option[Int]] =
  for {
    _ <- put("wild-cats", 2)
    _ <- update[Int]("wild-cats", (_ + 12))
    _ <- put("tame-cats", 5)
    n <- get[Int]("wild-cats")
    _ <- delete("tame-cats")
  } yield n
```

最后可以用compiler(interpreter)把Free monad转换成任意的monad
```
def impureCompiler: KVStoreA ~> Id  =
  new (KVStoreA ~> Id) {

    // a very simple (and imprecise) key-value store
    val kvs = mutable.Map.empty[String, Any]

    def apply[A](fa: KVStoreA[A]): Id[A] =
      fa match {
        case Put(key, value) =>
          println(s"put($key, $value)")
          kvs(key) = value
          ()
        case Get(key) =>
          println(s"get($key)")
          kvs.get(key).map(_.asInstanceOf[A])
        case Delete(key) =>
          println(s"delete($key)")
          kvs.remove(key)
          ()
      }
  }
```
这里的KVStoreA ~> Id是FunctionK[KVStoreA, Id]的alias

Free monad还有一个延迟执行的功能，当写program的时候，没有实际的side-effect发生。  
只有在foldMap了之后，才有side-effect
```
// S[_]是KVStoreA[_], M[_]是Id[_]
// 把一个S[Option[Int]]转换成了M[Option[Int]]
val result: Option[Int] = program.foldMap(impureCompiler)
```
