---
layout: post
title: "用clojure写个编译器, part1"
author: linzihao
categories: compiler
date: "2023-01-21"
---

lisp 语言的 s-expression 非常适合用来处理 AST. 并且 clojurescript 写前端很方便, 有很好的库 re-frame, 还可以利用 npm 生态里面的其他库, 例如 d3 来做可视化.  
这个系列会用 clojurescript 写一个编译器, 可以根据输入的源代码, 即时的 parse 成 AST, 并可视化. 再将 AST 进行多次编译到不同的 IR, 每层 IR 也有可视化. 最后会编译到栈式虚拟机的一串指令, 再加上栈式虚拟机逐步执行指令的可视化过程. 后续可能还会加上编译优化, 语法高亮, 自动补全等.  

# 简单算术表达式
先从简单的开始, 只支持正整数, 加法, 乘法表达式. 例如 20 * 2 + 2 这样的表达式.
## AST 定义
clojure 代码习惯使用基础数据结构来表达所有的 data, 而不是使用 ADT(algebra data type), 因此在这里使用 vector 来表达所有的 AST 节点.  
- 常数用 `[:const n]` 表示, 例如 `[:const 4]`
- 加法用 `[:add e1 e2]` 表示, 例如 `[:add [:const 3] [:const 1]]`
- 乘法和加法类似, 用 `[:mul e1 e2]` 表示

定义了 AST 之后, 再加一点辅助函数, 类似 java 的各种 getter.
```clojure
(defn get-type 
  "获取一个表达式的类型, 返回 :const | :add | :mul ..."
  [expr]
  (first expr))

(defn get-const [const-expr]
  (second const-expr))

(defn get-operand-1 [add-or-mul-expr]
  (second add-or-mul-expr))

(defn get-operand-2 [add-or-mul-expr]
  (third add-or-mul-expr))
```

现在可以手写一个 AST, 例如 20 * 2 + 2
```clojure
[:add [:mul [:const 20]
            [:const 2]]
      [:const 2]]
```

## 利用宿主语言 eval
只要宿主语言能够递归的处理树状结构, 那么就可以对 AST 做一次递归求值, 得到表达式的计算结果.
```clojure
(defn eval-expr [expr]
  (cond
    (= (get-type expr) :const) (second expr)
    (= (get-type expr) :add) (+ (eval (second expr))
                                (eval (third expr)))
    (= (get-type expr) :mul) (* (eval (second expr))
                                (eval (third expr)))))
```

```clojure
(eval [:add [:mul [:const 20]
            [:const 2]]
      [:const 2]]) ;; => 42
```

## 编译到栈式虚拟机
栈式虚拟机的指令集目前只有
- `[:const n]`, 将常数 n 推入栈
- `[:add]`, 将栈顶的前两个元素取出, 相加后再入栈
- `[:mul]`, 将栈顶的前两个元素取出, 相乘后再入栈
  
以下是 20 * 2 + 2 的指令
```clojure
[[:const 20] [:const 2] [:mul] [:const 2] [:add]]
```

在写编译 AST 到指令集之前, 先看一下怎么执行指令集.
在 eval 的时候, 需要有一个栈, 即 `eval-instr` 的第二个参数, 这里使用 clojure 的 list 作为 stack 使用
```clojure
(defn eval-instr [instrs stack]
  (if (empty? instrs) (first stack)
      (let [instr (first instrs)]
        (cond
          (= (get-type instr) :const) (eval-instr (rest instrs)
                                                  (conj stack (get-const instr)))
          (= (get-type instr) :add) (eval-instr (rest instrs)
                                                (conj (drop 2 stack) (+ (first stack)
                                                                        (second stack))))
          (= (get-type instr) :mul) (eval-instr (rest instrs)
                                                (conj (drop 2 stack) (* (first stack)
                                                                        (second stack)))))))
```

测试一下
```clojure
(eval-instr [[:const 20] [:const 2] [:mul] [:const 2] [:add]] '()) ;; => 42
```

观察可以发现, 编译 AST 到指令集时, 
- 如果是 const 节点, 直接往栈上推
- 如果是 add 节点, 先编译 operand1, 这些指令执行完时会在栈顶留下 operand1 的计算结果. 再编译 operand2, 栈上就会留下两个计算结果. 最后加上 add 指令
- mul 节点同上, 最后修改成 mul 指令
  
```clojure
(defn arith-expr-to-instr [expr]
  (cond
    (= (get-type expr) :const) [:const (get-const expr)]
    (= (get-type expr) :add) (concat (arith-expr-to-instr (get-operand-1 expr))
                                     (arith-expr-to-instr (get-operand-2 expr))
                                     [[:add]])
    (= (get-type expr) :mul) (concat (arith-expr-to-instr (get-operand-1 expr))
                                     (arith-expr-to-instr (get-operand-2 expr))
                                     [[:mul]])))
```

## 可视化 AST
https://d3js.org/ 里有功能可以做树状数据的可视化. clojurescript 有 https://clojars.org/cljsjs/d3 可以在 cljs 中使用 d3.  
可视化代码的部分先省略, 以后有空可能会出 d3 可视化的系列, 还有 re-frame 写前端的系列. 完整的代码在 xxxx.

最终效果是这样的

## 栈式虚拟机运算过程可视化
先省略

# 变量
之前只有简单的算术表达式, 现在给语言添加定义变量的功能. 例如 `let x = 1 in x + x` 这样的表达式.
## AST 定义
常数, 加法, 乘法还是和之前的算术表达式一样
- 常数用 `[:const n]` 表示, 例如 `[:const 4]`
- 加法用 `[:add e1 e2]` 表示, 例如 `[:add [:const 3] [:const 1]]`
- 乘法和加法类似, 用 `[:mul e1 e2]` 表示

新增了两个节点 let 和 var
- `[:let name e1 e2]` 表示 let name = e1 in e2
- `[:var name]` 表示变量引用, 例如 `let x = 1 in x + x` in 后面的两个 x 都是变量引用
  
并且增加对应的辅助函数
```clojure
(defn get-name [expr]
  (second expr))

(defn get-let-e1 [expr]
  (third expr))

(defn get-let-e2 [expr]
  (third (rest expr)))
```

上面的例子 `let x = 1 in x + x` 手写 AST 就是这样的
```clojure
[:let "x" [:const 1]
          [:add [:var "x"] [:var "x"]]]
```

## 利用宿主语言 eval
之前 eval 算术表达式时, 只需要宿主语言提供递归处理树的能力. 现在多了一个额外的要求, 需要宿主语言能提供一个"环境" `name-to-value`.  
环境是一个映射关系, 从变量名映射到变量的计算结果. 可以用 clojurescript 的 map 作为宿主语言提供的环境.

const, add, mul 节点的处理都和之前类似, 只是多了一个 `name-to-value` 参数需要在递归时传递下去.  
let 会在 eval 了 e1 部分之后, 把变量名和 e1 的计算结果绑定起来, 放到环境中, 交给 e2 求值时使用.  
var 是在环境中直接查找到对应的变量值.  
```clojure 
(defn eval-expr [expr name-to-value]
  (cond
    (= (get-type expr) :const) (get-const expr)
    (= (get-type expr) :add) (+ (eval-expr (get-operand-1 expr) name-to-value)
                                (eval-expr (get-operand-2 expr) name-to-value))
    (= (get-type expr) :mul) (* (eval-expr (get-operand-1 expr) name-to-value)
                                (eval-expr (get-operand-2 expr) name-to-value))
    (= (get-type expr) :let) (let [value1 (eval-expr (get-let-e1 expr) name-to-value)
                                   new-env (assoc name-to-value (get-name expr) value1)]
                               (eval-expr (get-let-e2 expr) new-env))
    (= (get-type expr) :var) (lookup (get-name expr) name-to-value)))
```

测试
```clojure
(eval-expr [:let "x" [:const 1]
                     [:add [:var "x"] [:var "x"]]]
            ;; 初始没有任何变量, 环境是一个空的 map
            {}) ;; => 2
```


## 编译到 nameless
let 和 var 节点引入了变量名, 但是在栈式虚拟机中, 只有栈和数字, 没有字符串的概念, 因此首先要把变量名给编译掉.  
去掉变量名的方式是使用 De Bruijn index, 把变量名变成索引. 
TODO: 这里插入几个图解释一下

引入一个中间层 IR(intermediate representation), 这个中间层叫 nameless. nameless 也是 AST, 和原始的 AST 基本相同, let 和 var 节点不同
- `[:let name e1 e2]` 变成 `[:let e1 e2]`
- `[:var name]` 变成 `[:var index]`

