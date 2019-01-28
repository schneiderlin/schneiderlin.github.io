---
layout: post
title: "shapeless"
date: "2019-01-09 19:41:22 +0800"
---

generic和ADT之间可以互相转化，isomorphism？
ADT的好处是容易读，generic的(co)product可以表示N种具体的ADT

shapeless里面的product就是HList，initial object是HNil

可以召唤一个adtGen: Generic[ADT]，这个instance有Repr可以拿到ADT的generic representation
上面说的相互转换
```
// ADT to generic
val repr = iceCreamGen.to(iceCream)
// repr: iceCreamGen.Repr = Sundae :: 1 :: false :: HNil
// generic to ADT
val iceCream2 = iceCreamGen.from(repr)
// iceCream2: IceCream = IceCream(Sundae,1,false)
```


shapeless里面的coproduct就是coproduct，terminal object是CNil
Inl和Inr对应Left和Right
```
val red: Light = Inl(Red())
// red: Light = Inl(Red())
val green: Light = Inr(Inr(Inl(Green())))
// green: Light = Inr(Inr(Inl(Green())))
```

generic representation的作用
自动推导type class instance
如果Head和Tail都有type class instance，那么整个HList也有type class instance。
如果generic的有type class instance，所有能转成这个generic的ADT都有type class instance。

typeclass里面又summoner method的原因是scala的implicitly有时候会出错，shapeless的the
也是类似summoner的作用
