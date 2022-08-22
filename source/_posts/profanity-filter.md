---
layout: post
title: "scala实现profanity filter"
date: "2018-12-07 15:43:59 +0800"
category: scala
author: linzihao
---

profanity filter的目标是在一大段文本中，判断是否存在屏蔽词，本质上是字符串搜索算法  
一些符号和变量
- input: 输入的一大段文本
- N: input的长度
- profanityWords: 屏蔽词列表
- M: 屏蔽词的平均长度

### 用trie表示所有的屏蔽词
![](/assets/trie.png)  
在这个例子中，红色圈起来的是屏蔽词

每一个节点，需要保存两样东西
- 一个hashmap，key是字符，value是下一个节点。例如t节点可以通过加o变成to，可以通过加e变成te。  
- 一个flag，用来表示当前节点是不是屏蔽词。例如红圈flag为true，其他为false

### 根据trie判断是否包含屏蔽词
输入一串字符，例如"tedd abcd A inn te ted"，无视空格，空格只是方便阅读
- 首先从根节点出发，第一个字符是"t"，走到t节点，没有红圈，继续
- 第二个字符是e，走到te节点，没有红圈，继续
- 第三个字符是d，走到ted节点，没有红圈，继续
- 第四个字符是d，但是ted节点已经没有子节点了，证明tedd一定不在屏蔽词树里面，回到根节点
- 第五个字符是a，根节点没有a，证明a开头的词一定不是屏蔽词，回到根节点
- 第六个字符是b，根节点也没有b，同上
- 第七第八个同上
- 第九个字符是i，走到i节点，没有红圈，继续
- 第十个字符是n，走到in节点，有红圈，发现屏蔽词in

### scala构建trie
```
case class TrieNode(map: mutable.Map[Char, TrieNode], isProfanity: Boolean) {
  def addProfanityWord(word: String): Unit = {
    val chars = word.toCharArray

    chars match {
      case Array(h) ⇒ map.put(h, TrieNode.profanityNode)
      case Array(h, _*) ⇒
        val nextNode = map.getOrElse(h, TrieNode.emptyNode)
        nextNode.addProfanityWord(word.tail)
        map.put(h, nextNode)
    }
  }
}

object TrieNode {

  def profanityNode = TrieNode(mutable.Map(), true)

  def emptyNode = TrieNode(mutable.Map(), false)
}
```

### scala根据trie判断
```
class WordFilter(rootNode: TrieNode) {

  def testProfanity(toTest: String): Boolean = {
    var currentNode = rootNode

    for (char ← toTest) {
      if (currentNode.map.contains(char)) {
        currentNode = currentNode.map(char)
        if (currentNode.isProfanity) return true
      } else {
        currentNode = rootNode
      }
    }

    false
  }
}
```

测试代码
```
object WordFilter extends App {
  val rootNode = TrieNode(mutable.Map(), isProfanity = false)
  rootNode.addProfanityWord("fuck")
  rootNode.addProfanityWord("fick")
  rootNode.addProfanityWord("shit")
  rootNode.addProfanityWord("微商")

  val filter = new WordFilter(rootNode)
  val res1 = filter.testProfanity("i am fucking awesome")
  val res2 = filter.testProfanity("shiit, this should pass")
  val res3 = filter.testProfanity("ganz gut, fick dich")
  val res4 = filter
  println(res1)
  println(res2)
  println(res3)
}
```
