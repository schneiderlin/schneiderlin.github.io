---
layout: post
title: "polymorphic function value 1"
author: linzihao
categories:
  - scala
    - shapeless
---

## polymorphic function value 1 ##
HList中最主要的一个特征，就是支持map()操作。
这个map和scala collection List里面的操作非常的接近。

> scala> import shapeless._ ; import HList._
// List[Int]
scala> List(1, 2, 3) map singleton
res0: List[Set[Int]] = List(Set(1), Set(2), Set(3))
// List[String]
scala> List("foo", "bar", "baz") map singleton
res1: List[Set[String]] = List(Set(foo), Set(bar), Set(baz))
// HList
scala> (23 :: "foo" :: false :: HNil) map singleton
res2: Set[Int] :: Set[String] :: Set[Boolean] :: HNil =
      Set(23)  :: Set(foo)    :: Set(false)   :: HNil

第一个观察是
这里的singleton是map的参数，是一个function value，这个function能够把一个东西变成一个singleton set。

第二个观察是
singleton需要接收不同类型的参数(Int, String, Boolean..)，也就是说，这个function是polymorphic in argument type。

然而所有的scala value，包括function value，都是monomorphic的。

我们首先需要理解method-level parametric polymorphism，并且理解scala method和scala function value之间的区别。然后就可以理解，为什么标准scala的function value只能是monomorphic的。

### method-level parametric polymorphism ###
最容易理解 method-level parametric polymorphism 的方式就是对比monomorphic和polymorphic的method。一个参数类型是fixed type，另一个参数类型bounded到了method-level type parameter。例如
```
// Monomorphic methods have type parameter-free signatures
def monomorphic(s: String): Int = s.length

monomorphic("foo")

// Polymorphic methods have type parameters in their signatures
def polymorphic[T](l: List[T]): Int = l.length

polymorphic(List(1, 2, 3))
polymorphic(List("foo", "bar", "baz"))
```

monomorphic method只能apply到跟fixed type一样type的参数（或者subtype），polymorphic method可以是任何满足bound的type。

因为scala即使OOP也是FP，所以有polymorphic method加上subtype polymorphism。所以我们说的monomorphic只是parametric意义上的monomorphic。

### methods vs function values ###
之前一直说的都是method，现在要讨论和function value的区别。scala method和java method一样，是class或者trait的一部分，单独拿出来不是first-class value。而function value，是JVM-level的first class class，而不是某个class的一部分。
因此可以作为argument传入higher-order function。

然而，scala method可以非常像function。特别是在modules object里面，或者在另一个method/function定义里面。在这些情况下，这些method看起来是free floating的，没有传统OOP的left-hand-side "receiver"。并且可以用在higher-order function里面。例如
```
scala> object Module {
     |   def stringSingleton(s: String) = Set(s)
     | }
defined module Module

scala> import Module._
import Module._

scala> stringSingleton("foo")
res0: Set[String] = Set(foo)

scala> List("foo", "bar", "baz") map stringSingleton
res1: List[Set[String]] = List(Set(foo), Set(bar), Set(baz))
```

这个singleton看起来就是一个function value，然而并不是。这个method不是free-standing的：这个method会引用会Module，并且传进去的不是这个method，而是implicitly创建了一个函数调用singleton()方法(eta-expansion)，然后把这个创建出来的函数传入map。

这个机制一般是透明的，我们可以让scala编译器explicit的给一个eta-expand后的function value，这样就可以给他名字和检查他的类型。
```
scala> val stringSingletonFn = stringSingleton _
stringSingletonFn: (String) => Set[String] = <function1>

scala> stringSingletonFn("foo")
res2: Set[String] = Set(foo)

scala> List("foo", "bar", "baz") map stringSingletonFn
res3: List[Set[String]] = List(Set(foo), Set(bar), Set(baz))
```
现在可以看到type是String => Set[String].

在这个例子中，mothod和eta-expanded function value都是monomorphic的，试一下polymorphic的method会怎么样
```
scala> def singleton[T](t: T) = Set(t)
singleton: [T](t: T)Set[T]

scala> singleton("foo")
res4: Set[java.lang.String] = Set(foo)

scala> singleton(23)
res5: Set[Int] = Set(23)
```
这个是method，现在来看一下function value
```
scala> val singletonFn = singleton _
singletonFn: (Nothing) => Set[Nothing] = <function1>

scala> singletonFn("foo")
<console>:14: error: type mismatch;
 found   : java.lang.String("foo")
 required: Nothing
       singletonFn("foo")
                   ^

scala> singletonFn(23)
<console>:14: error: type mismatch;
 found   : Int(23)
 required: Nothing
       singletonFn(23)
```
为什么这里singletonFn的type会变成了Nothing => Set[Nothing]，需要看scala的function type和怎么表示function value的。

### scala function types ###
scala融合了OOP的一个好处是，String => Set[String]其实只是FunctionN的一个语法糖，在这里是Function1
```
trait Function1[-T, +R] {
  def apply(v: T): R
}

val stringSingletonFn = new Function1[String, Set[String]] {
  def apply(v: String): Set[String] = Module.stringSingleton(v)
}
```
这里的关键点是，function的参数类型和返回类型都是在trait level定义的，这有两个后果。
第一，当我们创建一个Function1实例(或者编译器创建)的时候，必须在当时就决定参数和返回类型。在上面eta-expansion的时候，我们没有明确表示参数类型，所以编译器不会推断，填了一个Nothing进去。
第二，在创建Function1实例的时候，类型就已经固定死了。看下面这个例子，虽然singleton是poly的，但是转换成Function1的时候固定了。

```
scala> val singletonFn: String => Set[String] = singleton _
singletonFn: (String) => Set[String] = <function1>

scala> singletonFn("foo")
res6: Set[String] = Set(foo)

scala> singletonFn(23)
<console>:14: error: type mismatch;
 found   : Int(23)
 required: String
       singletonFn(23)
```

回到一开始的例子
```
scala> def singleton[T](t: T) = Set(t)
singleton: [T](t: T)Set[T]

// eta-expanded to Int => Set[Int]
scala> List(1, 2, 3) map singleton
res0: List[Set[Int]] = List(Set(1), Set(2), Set(3))

// eta-expanded to String => Set[String]
scala> List("foo", "bar", "baz") map singleton
res1: List[Set[String]] = List(Set(foo), Set(bar), Set(baz))
```
polymorphic method每一次都会eta-expanded，然后传进map，因为List的每一个元素都是相同type，所以没问题。

在HList的时候，因为只调用了map一次，所以只有一次eta-expansion的机会。这个Function1只能有一个fixed type，爆炸。

现在的问题是，有first-class的monomorphic function value，second-class的polymorphic method，但是没有first-class的polymorphic function value。

下一章讲怎么在scala中支持polymorphic function value
