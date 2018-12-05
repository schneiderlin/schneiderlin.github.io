---
layout: post
title: "curry-howard isomorphism"
date: "2018-12-05 11:48:53 +0800"
---

algebra  | type system  | category theory | logic
--|---|---|--
0  | void   | initial object  | false 
1  | ()  | terminal object  | true 
b^a  | A => B(function)  | internal hom-set  |  A => B(implication)
*  | (A, B)  | product  | and
+  | Either[A, B] | co-product | or

每一个type都是一个proposition，可以是true或者false  
- 如何这个type inhabited就是true
- 否则是false
- function type inhabited那么implication为true

所以一个function的实现可以看成是theorem的proof
