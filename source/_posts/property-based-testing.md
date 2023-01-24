有多种方式保证软件的正确性, 从最严格的 formal verification, 到 model checking, fuzzing, property based checking, example based testing 之类的.

# example based testing 的局限性
需要人工造测试用例
- 可能会有边界条件人工考虑不到
- 耗时耗精力
- 一个 example 只能测试一组输入
  
property based 的不同处是, 不是描述单个输入和输出(example)之间的关系, 而是所有的输入和输出的关系. example based 可以类比描述了很多个点[(0, 0), (1, 1), (2, 2), ...(999, 999)], property based 描述了一条直线 x = y.

# 描述 property
很多语言都有 pbt 的库, 描述 property 的方式大致是一样的. 以下用 rescript-fastcheck 作为例子.

以下的例子描述了, 对于任意的 integer i, 都满足 i * 0 = 0.
```rescript
property1(
    integer(),
    i => i * 0 === 0
)
```

下面描述了, 对于任意的 integer i, j, 都满足 i + j = j + i.
```rescript
property2(
    integer(),
    integer(),
    (i, j) => i + j === j + i
)
```

复杂一点的例子, 一个算术表达式 (e1 + e2), 其中 e1 和 e2 也是算术表达式, 如果 e1 的值是 v1, e2 的值是 v2. 那么整个表达式的值就是 v1 + v2
```rescript
property1(
    arbitraryAddExpression(), 
    expr => {
        let Expr0.Add(e1, e2) = expr
        let v1 = Expr0.eval(e1)
        let v2 = Expr0.eval(e2)
        Expr0.eval(expr) == v1 + v2
    }),
```

其中 `arbitraryAddExpression` 是自定义的, `integer` 是任意的整数, `arbitraryAddExpression` 是任意的加法表达式.
# arbitrary
pbt 的测试方式是随机生成大量的样本, 对每一个样本就检查 property 是否满足.

property 的描述里面需要用到任意的整数, 字符串, 或者是自定义数据. 这些随机数据生成器叫做 arbitrary.
pbt 库会自动很多的内置 arbitrary, 例如
- integer, 任意整数
- nat, 任意自然数
- ascii, 任意 ascii 字符串
- boolean, 任意布尔值
- ...

并且有一些函数可以让用户自定义 arbitrary  
## map(arbitrary<a>, a => b): arbitrary<b>
把 arbitrary<a> 通过一个函数转换成 arbitrary<b>

例如
```rescript
map(nat(), n => n + 10) // 任意大于 10 的自然数
map(integer(), i => min(10, max(42, i))) // 10 - 42 之间的整数
map(integer(), i => toString(i)) // 任意由整数组成的字符串
```

## chain(arbitrary<a>, a => arbitrary<b>): arbitrary<b>
如果知道 monad 是什么的, 可以跳过了, 就是 haskell 里面的 bind

类似 map, 但是第二个参数的返回值是 arbitrary<b>. 可以用于生成互相依赖的数据. 
例如需要生成一种特殊的字符串, 字符串的开头有 0 或多个'a'
```rescript
chain(nat(), n => 
    // 先随机一个自然数 n
    map(ascii(), str => 
        // 再随机一串字符串
        repeat(n, 'a') ++ str // 返回前面有 n 个 'a' 的特殊字符串
    )
)
```

自定义的数据结构, 可以用 chain 构造, 每一个字段增加一次 chain 调用. 例如
```rescript
chain(name(), name => 
    // 随机一个变量名
    chain(expr(), e1 => 
        // 随机一个表达式
        map(expr(), e2 => 
            // 再随机一个表达式
            Let(name, e1, e2) // 返回自定义数据结构
        )
    )
)
```

# 怎么找 property
## problem domain 本身就有的 property

## 从 example generalize

## involutive
矩阵转置再转置 == id.
列表翻转再翻转 == id.

## symmetric
序列化成 json, 再反序列化 == id.
编译到 nameless, 再把 de brujin index 变成变量名 <= alpha equivalent => 原表达式 
