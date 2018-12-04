---
layout: post
title: "bifunctor"
date: "2018-12-04 19:17:47 +0800"
author: linzihao
categories: functional_programming
---

可以看成是从product category到另一个category的functor。
由于product category里面的morphism是pair of morphism。
从(a, b)到(a', b')是用了pair of morphism(f, g)。
如果product的component单独都满足functorial law
![](/assets/bifunctor1.png)

那么就可以分别应用两个fmap得到bimap
bimap = fmap f . fmap g

![](/assets/bifunctor2.png)
实现bifunctor instance的时候，只需要实现两个单独的fmap或者直接实现一个bimap

如果有一个categorical product，category里面的每一个object都有product。
那么从这些object到他product的mapping是bifunctorial的。
如果有categorical co-product，每一个object都有对应的co-product。
那么从object到co-product的mapping也是bifunctorial的
因为product和co-product都是functorial的

None可以看成是Const((), A)functor
Some可以看成是Id()functor
可以用Either表示Option
> So Option is the composition of the bifunctor Either with two functors

因为product和co-product都是functorial的，并且Option可以看成是bifunctor和functor的compose，所以可以推导出Option就是functor，其他的parametric ADT同理也可以推导出就是functor。

bifunctor和functor是可以compose的，分别lift两个functor，然后lift bifunctor。
```
implicit def bicompBiFunctor[BF[_, _], FU[_], GU[_]](
  implicit BF: Bifunctor[BF],
  FU: Functor[FU], GU: Functor[GU]) = {
    // partially-applied type BiComp
    type BiCompAB[A, B] = BiComp[BF, FU, GU, A, B]
    new Bifunctor[BiCompAB] {
      override def bimap[A, B, C, D](f1: A => C)(f2: B => D)
      : BiCompAB[A, B] => BiCompAB[C, D] = {
        case BiComp(x) => BiComp(
          BF.bimap(FU.fmap(f1))(GU.fmap(f2))(x)
          )
        }
      }
    }
```
就跟Option[List[A]]可以直接map一样，Either[Option[A], List[B]]可以直接bimap，因为functor compose
