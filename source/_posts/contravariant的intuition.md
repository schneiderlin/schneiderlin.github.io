---
layout: post
title: 各种category
author: linzihao
categories: functional_programming
date: "2018-11-19"
---

## contravariant ##
contravariant是一个定义了contramap函数的functor
```
def contramap[A, B](fa: F[A])(f: B => A): F[B]
```
可以发现这跟普通的map很像，就是f函数相反了
```
def map[A, B](fa: F[A])(f: A => B): F[B]
```
因此叫contramap，平时所说的定义了map的functor可以叫covariant functor，定义了contramap的是contravariant functor

contravariant的例子有Show和scala.math.Ordering。

### contramap的intuition ###
我们都知道map可以把函数f应用到一个容器里面，这个是map的intuition。那么contramap的intuition是什么？

看contramap的参数，有一个F[A]，这是一个容器里面装着A，还有一个函数B => A。很明显不能把这个函数应用进去，因为容器装的不是B。

忘掉map intuition中的容器，从另一个角度看contramap非常的直观。

> 一天，数学家觉得自己已受够了数学，于是他跑到消防队去宣布他想当消防员。消防队长说：“您看上去不错，可是我得先给您一个测试。”消防队长带数学家到消防队后院小巷，巷子里有一个货栈，一只消防栓和一卷软管。消防队长问：“假设货栈起火，您怎么办？”数学家回答：“我把消防栓接到软管上，打开水龙，把火浇灭。”消防队长说：“完全正确！最后一个问题：假设您走进小巷，而货栈没有起火，您怎么办？”数学家疑惑地思索了半天，终于答道：“我就把货栈点着。”消防队长大叫起来：“什么？太可怕了！您为什么要把货栈点着？”数学家回答：“这样我就把问题化简为一个我已经解决过的问题了。”

再看一个Show的例子
```
case class Money(amount: Int)
case class Salary(size: Money)

implicit val showMoney: Show[Money] = Show.show(m => s"$$${m.amount}")
implicit val showSalary: Show[Salary] = showMoney.contramap(_.size)
```

上面两个例子中的共同点都是把一个问题化简为一个已经解决过的问题。
当已经定义了Show[Money]之后，定义Show[Salary]时，就可以通过Salary.size方法把Salary转换成Money，这样问题就自动解决了。

### contramap的应用 ###
scala.math.Ordering中已经有contramap了
```
def by[T, S](f: T => S)(implicit ord: Ordering[S]): Ordering[T]
```
这里的by，其实就是contramap
- 要求解一个未知的问题: Ordering[T]
- 需要一个已解决的问题: Ordering[S]
- 还有一个转换的方法: T => S

## Subtyping和contravariant的关系 ##
我们都知道liskov substitution principle，如果一个函数需要的参数是A，那么A的所有subtype B都可以作为参数传进去。
例如getAge(human: Human)可以传getAge(man)或者getAge(woman)

Contravariant有这样的一个属性：
如果有一个contravariant Functor F，并且B <: A，那么F[A] <: F[B]。

这背后的intuition是：
A可以看作是全人类，B可以看作是某一类人。
如果有一个问题，需要关于B这一类人的解决方案。那么如果我有关于A的解决方案，我一样可以套用进去。

again，F[B]可以看成是关于类型B的解决方案，Show[B]是解决如何print B，Ordering[B]是如何对B排序...

实现方法非常简单
```
class A
class B extends A

val showA: Show[A] = Show.show(a => "a!")
val showB: Show[B] = showA.contramap(identity[A])
```
一般情况下，在contramap需要提供如何从B转换成A的方法。但是在这里，B是A的subtype，所以根本就不需要转化，只需要告诉编译器，我就是一个A。

看回人类的那个例子。
例如我需要“测量男人年龄”的方案，然后我已经有一个“测量人类年龄”的方案，我只需要说“男人也是人类”，这个问题就自动解决了。

因此F[A] <: F[B]，所有的F[B]可以用F[A]代替。
