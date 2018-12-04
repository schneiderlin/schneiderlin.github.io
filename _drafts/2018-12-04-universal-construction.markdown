---
layout: post
title: "universal construction"
date: "2018-12-04 11:07:44 +0800"
---

initial object
> The initial object is the object that has one and only one
morphism going to any object in the category

在Hask里面，这个initial object就是Void，这个morphism就是absurd

terminal object
> The terminal object is the object with one and only one
morphism coming to it from any object in the category

product
> A product of two objects 𝑎 and 𝑏 is the object 𝑐 equipped
with two projections such that for any other object 𝑐′ equipped
with two projections there is a unique morphism 𝑚 from 𝑐′
to 𝑐 that factorizes those projections.

co-product
> A coproduct of two objects 𝑎 and 𝑏 is the object 𝑐 equipped
with two injections such that for any other object 𝑐′ equipped
with two injections there is a unique morphism 𝑚 from 𝑐
to 𝑐′ that factorizes those injections.

co-domain比domain大，可以把整个domain embed到co-domian里面的function，叫做surjective function
不collapse的function叫injective function

Hask中的functor说的是endo functor，把type map到另一个type，所以是type constructor，可以看成是装着type的容器。

monoidal category指的是有product和terminal object的category。

Cartesian product of categories
morphism是pair of morphism，identity morphism是(id, id)，object是两个组成category里面的Cartesian product。
compose是(𝑓 , 𝑔) ∘ (𝑓 ′, 𝑔′) = (𝑓 ∘ 𝑓 ′, 𝑔 ∘ 𝑔′)
