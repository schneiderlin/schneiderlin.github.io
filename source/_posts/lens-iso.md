---
layout: post
title: Lens part1 - Iso
author: linzihao
categories: functional_programming
date: "2019-04-18"
---

Iso是Isomorphism，```MIso[A, B]```表示A和B之间有一个isomorphism  

如果两个A和B是isomorphic的，那么就一定有一个morphism get，从A到B，并且有一个morphism reverseGet，从B到A  
并且如果A和B是isomorphic的，那么B和A一定是isomorphic的，因此有reverse  
isomorphism还是transitive的，所以有composeIso
```
trait MIso[A, B] {
  def get: A => B

  def reverseGet: B => A

  def reverse: MIso[B, A] =
    MIso[B, A](reverseGet)(get)
    
  def composeIso[C](other: MIso[B, C]): MIso[A, C] =
    MIso[A, C](other.get compose get)(reverseGet compose other.reverseGet)
}
```

### Iso的应用
假设有一个根据长度做某种计算的函数，长度单位是米
```
def someFunc(length: Meter): Answer
```
在这个库中，有好多其他的长度单位，例如厘米，英尺，寸等等，如果想要以其他的单位作为输入。需要overload
这个someFunc函数，并且提供所有其他单位到米的转换函数
```
def someFunc(length: MiliMeter): Answer = {
    val meter = miliMeter2Meter(length)
    someFunc(meter)
}
// ... and many other overload someFunc
```
这种写法需要太多overload很麻烦，并且如果有另一个函数，用的是厘米作为参数，那么又要写一堆overload和其他单位
到厘米的转换

#### Iso to the rescue
所有的长度单位，都是Isomorphism的，从米可以转换到厘米的过程没有损失任何的信息。  
因此可以只overload一个someFunc
```
def someFunc[A](length: A)(implicit iso: MIso[A, Meter]): Answer = {
    val meter = iso.get(length)
    someFunc(meter)
}
```
这里的A可以是任意的类型，只要他和Meter是isomorphic的，这个A甚至可以是一个库的作者不知道的类型，
只要库的调用者提供```MIso[A, Meter]```实例就可以了。

而作为库的作者，只需要提供一个```MIso[MiliMeter, Meter]```，如果有另一个用厘米作为参数的函数，
就可以通过reverse免费得到一个```MIso[Meter, MiliMeter]```。  
并且如果还有```MIso[MiliMeter, MicroMeter]```，那么可以通过composeIso免费得到一个
```MIso[Meter, MicroMeter]```