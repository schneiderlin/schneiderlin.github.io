---
layout: post
title: "contravariant"
date: "2018-12-04 20:35:11 +0800"
author: linzihao
categories: functional_programming
---

在opposite category里面的a -> b是原category的b -> a。
在opposite category和D之间有一个functor F, 可以把a -> b变成Fa -> Fb。
在原category里面就可以定义一个contra variant functor G, object的mapping和F一样，morphism首先map到opposite category，然后用F map到D
