---
layout: post
title: lens，函数式的getter和setter
author: linzihao
categories: functional_programming
date: "2018-11-22"
---

## Lens, getter/setter the functional way ##
在OOP和FP中，一个type里面往往包含了另一个type。

在OOP中，要获取和修改内部的值，需要用外部提供的getter和setter方法。
在FP中，有一个Lens[S, A] type，可以看作是OOP中的getter/setter。
```
trait Lens[S, A] {
  def get(s: S): A

  def set(s: S, a: A): S

  def modify(s: S)(f: A => A): S =
    set(s, f(get(s)))

  def modifyOption(s: S)(f: A => Option[A]): Option[S] =
    f(get(s)).map(a => set(s, a))

  def modifyList(s: S)(f: A => List[A]): List[S] =
    f(get(s)).map(a => set(s, a))
}
```

### modifyOption和modifyList其实是modifyF ###
观察发现，modifyOption和modifyList的实现方式是完全一样的。
作为一个FP programmer，可以发现只要f返回的是一个Functor[_]，实现方式都是一样的。
```
def modifyF[F[_] : Functor](s: S)(f: A => F[A]): F[S] =
    f(get(s)).map(a => set(s, a))
```
### modify其实是modifyF ###
看modifyF和modify的区别，可以发现modify就是modify Id functor。

### set其实是modify ###
看set和modify的区别，可以把set看成是modify传入了一个
```
f = () => s
```
无视了get出来的值，直接提供s。

现在可以改一下实现，用modifyF表示modify，用modify表示set。
但是modifyF要保持abstract，不然modifyF和set之间会不断循环调用。
```
trat Lens[S, A] {
	def modifyF[F[_]: Functor](s: S)(f: A => F[A]): F[S]

	def modify(s: S)(f: A => A): S =
		modifyF[Id](s)(f)

	def get(s: S): A
	
	def set(s: S, a: A): S = 
		modify(s)(_ => a)
}
```

## 为一个case class实现Lens ##
现在有一个case class Person
```
case class Person(name: String)
```
要为Person实现一个Lens[Person, String]，可以get和set名字。

因为modify和set都是推导出来的，所以只需要实现modifyF和get，然而一会将会看到，get也可以又modifyF表示。
```
implicit val personLens = new Lens[Person, String] {
    override def modifyF[F[_]: Functor](s: Person)(f: String ⇒ F[String]): F[Person] = {
      val fa: F[String] = f(s.name)
      fa.map(a ⇒ s.copy(a))
    }
  }
```
这里没有实现get，因为get一会要从modifyF推导出来。

注意modifyF的实现，首先通过f获得了一个F[A]。
然后把这个F[A] map 成一个F[S]返回。

### get也可以用modifyF表示 ###
用modifyF实现get的关键，就是要找到一个合适的F[_]。

1. 在modifyF中，f拿到一个A（这个就是要get的），然后把这个A变成了F[A]。
因此这里要找的F[_]需要能够储存信息，在
```
val fa = f(s.name)
```
这一步的时候，把s.name这个信息，储存起来。

2. modifyF最后返回的是一个F[S]，因此在F[A] map 到F[S]的过程中，储存的信息不能丢失
3. 并且要能从F[S]中提取出A

#### 这个F[_]是什么？ ####
在上面的3条中，第2条是最有约束力，提供了最多信息的。
map不改变任何内容的functor...这个F[_]是Const[A, ?]!
```
case class Const[A, B](getConst: A)
```
Const[_, _]有两个type parameter，固定第一个之后，就是要找的F[_]
```
implicit def constFunctor[X]: Functor[Const[X, ?]] = 
	new Functor[Const[X, ?]] {
		def map[A, B](fa: Const[X, A])(f: A => B): Const[X, B] = 
			Const(fa.getConst)
}
```
可以看到map完之后内容没有变化，Const(fa.getConst)里type是Const[X, B]，但是里面存的a还是和fa里面存的a是一样的。
B这种对runtime没有影响的type，叫做phantom type。

满足了第二条之后，再来检查另外的约束。
1. 能够把一个a lift成F[A]，储存信息
```
a => Const(a)
```
满足第一条
2. 能从F[S]中提取出A
```
val fs: F[A, S] = Const(fa.getConst)
val a: A = fs.getConst
```
满足第三条


现在可以把get也用modifyF表示
```
 def get(s: S): A = {
    val storedValue = modifyF[Const[A, ?]](s)(a => Const(a))
    storedValue.getConst
  }
```
