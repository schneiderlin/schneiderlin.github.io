---
layout: post
title: "scala实现profanity filter"
date: "2018-12-07 15:43:59 +0800"
category: algorithm
author: linzihao
---

profanity filter的目标是在一大段文本中，判断是否存在屏蔽词，本质上是字符串搜索算法  
一些符号和变量
- input: 输入的一大段文本
- N: input的长度
- profanityWords: 屏蔽词列表
- M: 屏蔽词的平均长度

首先考虑只有一个屏蔽词，例如从"xxxxxxxxxxxx fuk xxxxxxxxx"中判断是否有屏蔽词"fuk"。  

### 暴力枚举
固定input，滑动屏蔽词，每一个位置做一次对比。  
```
function NaiveSearch(string s[1..n], string pattern[1..m])
   for i from 1 to n-m+1
      for j from 1 to m
         if s[i+j-1] ≠ pattern[j]
            jump to next iteration of outer loop
      return i
   return not found
```
复杂度是O(NM)  
在这个算法里面，屏蔽词每一次只滑动一格，实际上可以一次性滑动N格。  
一次最多跳多少格？

### Boyer–Moore string-search algorithm
Boyer–Moore对暴力枚举中每次只滑动一格做了改进。Boyer–Moore的特点是从屏蔽词的最后一个字符开始匹配  
一些符号
- P: 屏蔽词或pattern，长度是n
- T: 搜索的text，长度是m 
- alignment of P to T: T里面的一个index k，where T[k] = P[n]
- match: 如果T[(k-n+1)..k] = P,那么找到了一个匹配

https://people.ok.ubc.ca/ylucet/DS/BoyerMoore.html  
P是从左往右滑动，但是对比的时候，是从P的右边开始对比  

#### 滑动规则
滑动规则根据bad character rule和good suffix rule决定。  
bad character rule  
![](/assets/boyer-moore-bad-character.png)
当这样对齐的时候，从右往左匹配，N A M都一样，然后N和A不一样。把T中不匹配的标记成红色，这个称为bad character。  
出现bad character的时候，在bad character左边部分的P找下一个相同的字符（图中第二行蓝色的N）。  
然后把P滑动到蓝色和红色对齐的位置。   
如果没有在左边部分P找到相同的字符，直接把P滑动到越过bad character的位置。

为什么可以这样滑？（往右滑动了两格）
P想要匹配，就必须要有一个N跟红色的N对齐，因为P是从左往右滑的，所以右边部分的P全部不用考虑。  
如果P的左边部分没有N，证明这个红色N是一定匹配不到了，可以把P滑动到越过红色点。  

good suffix rule  
![](/assets/boyer-moore-good-suffix.png)
