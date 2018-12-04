---
layout: post
title: Trampoline, FP如何解决递归栈溢出
author: linzihao
categories: functional_programming
---

## Trampoline ##
在递归很深的时候，可以用尾递归和Trampoline解决栈溢出的问题，虽然Trampoline比直接写尾递归要慢，但是代码的可读性会好很多。

由于用了Trampoline之后，调用递归代码时，栈的深度一直在1和2之间跳跃，直到递归结束。所以叫Trampoline。

### 一个会栈溢出的例子 ###
```scala
def even(n: Int): Boolean = n match {
	case 0 => true
	case _ => odd(n - 1)
}
def odd(n: Int): Boolean = n match {
	case 0 => false
	case _ => even(n - 1)
}
```
在这个判断某个整数n是否为偶数的例子中，even和odd互相调用，当输入n很大的时候，就会出现栈溢出。

### Trampoline改写例子 ###
Trampoline的思想是每一次递归的时候，返回一个计算的状态。稍后可以从这个状态开始，继续计算下去。
在这个例子中，计算的状态就是even或者odd，还有输入n。

现在定义一个存放状态的trait，叫做Trampoline，A代表计算结果的返回类型
Even和Odd是两种状态，所以extends Trampoline
另外还要加上一个完成的状态Done
```scala
trait Trampoline[A] {}
case class Even(n: Int) extends Trampoline[Boolean]
case class Odd(n: Int) extends Trampoline[Boolean]
case class Done[A](b: A) extends Trampoline[A]
```

有了状态之后，现在就可以改写even和odd函数，使得这两个函数返回一个状态，而不是直接返回结果。
```scala
def even(n: Int): Trampoline[Boolean] = n match {
	case 0 => Done(true)
	case _ => Odd(n-1)
}
def odd(n: Int): Trampoline[Boolean] = n match {
	case 0 => Done(false)
	case _ => Even(n-1)
}
```

由于现在even和odd返回的是一个Trampoline[Boolean]，不是最终的结果，所以我们需要给Trampoline定义一个run方法。只要有一个计算状态，就可以从这个状态开始run。

```scala
trait Trampoline[A] {
	def run: A = this match {
	    case Done(result) => result
	    case even: Even => even.run
	    case odd: Odd => odd.run
	  }
}
```
可以看出

### 总结 ###
用Trampoline可以把状态
