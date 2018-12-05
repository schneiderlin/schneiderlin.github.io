---
layout: post
title: "function_type"
date: "2018-12-05 10:39:52 +0800"
---

用universal construction造一个function type。需要指明3个object的关系（function type，
argument type， return type）。
![](/assets/function_type1.png)

可以看到定义function type，这个category必须要有product，如果不是所有object都有product，也不能定义function type。这跟function type叫exponential有关系。

universal construction的ranking
![](/assets/function_type2.png)

因为product category里面的morphism就是pair of morphism，所以(z', a)到(z, a)的morphism就是(h, id)
这样g'就可以用g来表示，g' = g . (h, id)

在Set里面，function object isomorphic to hom-set。


### curring
g'是(z', A) => B，是一个两个参数的函数  
h是 z' => (A => B)，是一个higher-order function  
根据universal construction，每一个z'都有唯一的一个h，所以g'和h之间是一对一的关系。h是curry version的g'

### exponential
internal hom-set被叫做exponential。  
在lazy的语言例如Haskell里面，data可以看成是function（pure function就是table lookup），这个data的cardinality就是b^a。
