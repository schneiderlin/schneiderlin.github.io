---
layout: post
title: "polymorphic function value 2"
author: linzihao
categories:
  - scala
  - shapeless
---

## polymorphic function value 2 natural transformation ##
在上一篇中可以看到标准的scala function value不够polymorphic，不能用来map HList。
这一篇中介绍的方法非常有用，但是还不能完全解决问题。

这一篇的例子，首先定义4个函数
```
scala> singleton("foo")
res0: Set[String] = Set(foo)

scala> identity(1.0)
res1: Double = 1.0

scala> headOption(List(1, 2, 3))
res2: Option[Int] = Some(1)

scala> size("foo")
res3: Int = 3

scala> size(List(1, 2, 3, 4))
res4: Int = 4
```
这4个function的function-like signature
```
singleton	(∀T) T => Set[T]
identity	(∀T) T => T
headOption	(∀T) List[T] => Option[T]
size	(∀T) T => Int
```
function-like的意思是说scala不能直接用这种形式表达generic function，这是我们需要解决的问题。

### polymorphism lost, polymorphism regained ###
FunctionN trait的实例在创建的时候就fixed了，而不是在apply的时候决定的。

一个很自然的想法就是把type parameter从Function1中移动到apply中，使得type和enclosing trait独立。在上一次看到，polymorphic method和call site eta-expansion的组合看起来很像polymorphic function value。

因为想要保持是first class type，可以直接传进higher-order function，所以需要保持enclosing type。
```
trait PolyFunction1 {
  def apply[T, R](t: T): R
}
```
但这是不行的，很快在实现的时候就会发现了。

第一个问题是PolyFunction1的result type是完全没有约束的。但是我们需要实现result type是由argument type决定的。
例如
- singleton(A) -> Set(A)
- identity(A) -> A
- headOption(List(A)) -> Option[A]
- size(A) -> Int

第二次尝试用higher-kinked type parameter，作为type-level function
```
trait PolyFunction1[F[_]] {
  def apply[T](t: T): F[T]
}
```
现在可以这样定义singleton
```
object singleton extends PolyFunction1[Set] {
  def apply[T](t: T): Set[T] = Set(t)
}
```
这样就可以预测result type了
```
scala> singleton(23)
res0: Set[Int] = Set(23)

scala> singleton("foo")
res1: Set[String] = Set(foo)
```
现在我们能不能写一个identity实例？需要有一个higher-kinded type使得F[T] = T,这个就是Id
```
type Id[T] = T
```
现在可以这样定义identity实例
```
object identity extends PolyFunction1[Id] {
  def apply[T](t: T): T = t
}

scala> identity(23)
res0: Int = 23

scala> identity("foo")
res1: java.lang.String = foo
```

接下来是headOption。这次不但是result type有约束，argument type也有约束。可以用同样的套路，把argument type也看成是type的function。第三次尝试定义PolyFunction1用两个higher-kinded trait-level type parameter。
```
trait PolyFunction1[F[_], G[_]] {
  def apply[T](f: F[T]): G[T]
}
```

现在3个函数都可以定义一个PolyFunction1实例
```
object singleton extends PolyFunction1[Id, Set] {
  def apply[T](t: T): Set[T] = Set(t)
}

object identity extends PolyFunction1[Id, Id] {
  def apply[T](t: T): T = t
}

object headOption extends PolyFunction1[List, Option] {
  def apply[T](l: List[T]): Option[T] = l.headOption
}
```

现在就剩下size函数，可以用type lambda的方式表示一个type-level的function，从任意的类型T到常数类型C
```
type Const[C] = {
  type λ[T] = C
}
```
在Const[Int]这个例子中，这是一个结构化的type，有一个higher-kinded type member λ[_]，无论输入什么type都会返回C。所以type Const[Int]#λ[T]会等于type Int无论输入什么T。
```
scala> implicitly[Const[Int]#λ[String] =:= Int]
res0: =:=[Int,Int] = <function1>

scala> implicitly[Const[Int]#λ[Boolean] =:= Int]
res1: =:=[Int,Int] = <function1>
```

还有一种value-level常数函数的type-level redering，SKI calculus中的K combinator
```
def const[T](t: T)(x: T) = t

scala> val const3 = const(3) _
const3: Int => Int = <function1>

scala> const3(23)
res6: Int = 3
```

现在就可以定义size的PolyFunction1实例了
```
object size extends PolyFunction1[Id, Const[Int]#λ] {
  def apply[T](t: T): Int = 0
}

scala> size(List(1, 2, 3, 4))
res0: Int = 0

scala> size("foo")
res1: Int = 0
```
现在signature是对的，但是怎么实现apply方法？因为在argument parameter里面用了Id，并不知道argument type具体是什么，所以不能计算size。

当然这里可以用pattern matching，暂时先用。
```
object size extends PolyFunction1[Id, Const[Int]#λ] {
  def apply[T](t: T): Int = t match {
    case l: List[_] => l.length
    case s: String  => s.length
    case _ => 0
  }
}

scala> size(List(1, 2, 3, 4))
res0: Int = 4

scala> size("foo")
res1: Int = 3

scala> size(23)
res2: Int = 0
```

### 一大堆的suger ###
我们希望做一些语法上面的调整，把PolyFunction1变成infix notation。可以把T[X, Y]写成X T Y的形式。

scala的function用了=>符号，这里用~>符号
```
trait ~>[F[_], G[_]] {
  def apply[T](f: F[T]): G[T]
}
```
现在定义看起来更加像函数了
```
object singleton extends (Id ~> Set) {
  def apply[T](t: T): Set[T] = Set(t)
}

object identity extends (Id ~> Id) {
  def apply[T](t: T): T = t
}

object headOption extends (List ~> Option) {
  def apply[T](l: List[T]): Option[T] = l.headOption
}

object size extends (Id ~> Const[Int]#λ) {
  def apply[T](t: T): Int = t match {
    case l: List[_] => l.length
    case s: String  => s.length
    case _ => 0
  }
}
```

### 像函数？ ###
这里用了像函数而不是函数，是在强调这不是scala标准的FunctionN type，因为不能直接传入higher-order function。例如
```
scala> List(1, 2, 3) map singleton
<console>:11: error: type mismatch;
 found   : singleton.type (with underlying type object singleton)
 required: Int => ?
```
我们可以用一个implicit conversion来做调用eta-expansion的功能。
```
implicit def polyToMono[F[_], G[_], T]
  (f: F ~> G): F[T] => G[T] = f(_)
```
因为scala类型推断的限制，Id和Const不会被当成是F[]或者G[]，所以需要加上几个帮助编译器推断的conversion
```
implicit def polyToMono2[G[_], T](f: Id ~> G): T => G[T] = f(_)
implicit def polyToMono3[F[_], T](f: F ~> Id): F[T] => T = f(_)
implicit def polyToMono4[T](f: Id ~> Id): T => T = f[T](_)
implicit def polyToMono5[G, T](f: Id ~> Const[G]#λ): T => G = f(_)
implicit def polyToMono6[F[_], G, T]
  (f: F ~> Const[G]# λ): F[T] => G = f(_)
```

### natural transformation和他的缺陷 ###
这种表示polymorphic function value的方式在higher-kinded type出现的时候就已经有了。用作表示natural transformation，在scalaz中经常有用到。

这种表示方式也有一些缺陷。

第一个问题就是实现size
```
object size extends (Id ~> Const[Int]# λ) {
  def apply[T](t: T): Int = t match {
    case l: List[_] => l.length
    case s: String  => s.length
    case _ => 0
  }
}
```
因为apply方法的type参数T是完全无限制的，因此t的类型相当于Any，所以编译器不知道他有length方法。

可以用pattern matching的方法恢复一部分的type信息，但是这种写法不安全，可能会出现MatchError。而且扩展性不好。

而且还有type erasure的问题，假设我们要定义List[String]的size是里面所有String size的和。可以这样写
```
object size extends (Id ~> Const[Int]# λ) {
  def apply[T](t: T): Int = t match {
    case l: List[String] => l.map(_.length).sum
    case l: List[_] => l.length
    case s: String  => s.length
    case _ => 0
  }
}
```
会得到这样的warning
```
warning: non variable type-argument String in type pattern
  List[String] is unchecked since it is eliminated by erasure
```
如果输入一个不是String的List，就会出现错误
```
scala> size2(List(1, 2, 3))
java.lang.ClassCastException:
  java.lang.Integer cannot be cast to java.lang.String
```
这是JVM在runtime实现pattern match的一个限制，在runtime的时候String type被擦除了。

如果pattern match不行，还有什么方法？我们可以做任意不depend on shape of T的。
identity function直接返回。
singleton function
```
object singleton extends (Id ~> Set) {
  def apply[T](t: T): Set[T] = Set.apply[T](t)
}
```
apply function是parametric in T的，用了Set的apply方法实现（同样parametric in T）。不需要T的形状信息，因为Set不需要检查，直接装起来就行了。
headOption也可以，这一次的确对argument type有约束，我们知道outer type constructor一定是List[_]，这意味着我们可以用List的所有方法，不需要知道T是什么类型(List的方法都是parametric in T的)。
size不可以。

这里关键的问题是没有T的shape信息。或许修改~> trait，然后加上对T的限制。下一章讲这个
