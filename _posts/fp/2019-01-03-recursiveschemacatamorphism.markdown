---
layout: post
title: "用catamorphism把recursive抽象出来"
date: "2019-01-03 15:25:33 +0800"
author: linzihao
categories: functional_programming
---

在写fold代码的时候，需要递归计算sub-structure的值，最后再根据sub-structure的递归结果，计算
当前这一层的返回值。   

例如
```
def sumList(l: List[Int]): Int = l match {
  case Cons(h, t) => h + sumList(t)
  case Nil => 0
}
```
在这里sub-structure就是tail，也是一个List，需要对tail递归的调用sumList，得到返回值之后，再和当前这一层的
head相加。   
想象如果sub-structure不是一个List，而是一个Int，这个Int就是tail的和，那么就根本不需要递归了，
直接用当前的head加上sub，就能得到结果
```
case Cons(h, sub) => h + sub
case Nil => Nil
```
在这篇文章中，讲如何用catamorphism，把递归给抽象走，使得写fold代码的时候不需要考虑递归。

#### 如何才能写Cons(h, sub) => h + sub
step1:  
原本Cons是Cons(h: Int, t: List[Int]),要把Cons改成Cons(h: Int, sub: A)，这个A可以是任意
“结果类型”，例如在这个例子中是Int。   

step2:   
List[Int]的tail一定还是List[Int]类型，因此需要一个函数f，能够把sub-structure
转换成一个结果，f: List[Int] => Int   

#### 给IntList加一个type parameter
```
sealed trait IntList[+Sub]
case class Cons[Sub](head: Int, tail: Sub) extends IntList[Sub]
case object Nil extends IntList[Nothing]
```
这里的Sub是sub-structure的类型，Sub可以是任何类型，这样就解决了step1   
```
// 可以和以前一样的List
val cons1: IntList[IntList[IntList]] = Cons(1, Cons(2, Nil))
// 或者写一个tail是Int的List
val cons2: IntList[Int] = Cons(1, 2)
```

#### IntList from a functor
```
implicit val functor: Functor[IntListF] = new Functor[IntListF] {
  override def map[A, B](fa: IntListF[A])(f: A => B): IntListF[B] = fa match {
    case Cons(h, t) => Cons(h, f(t))
    case Nil => Nil
  }
}
```
这样就解决了step2，现在可以把一个sub-structure是从List变成Int
```
val cons1: IntList[IntList[IntList]] = Cons(1, Cons(2, Nil))
val cons2: IntList[Int] = cons1.map(_ => 2) // Cons(1, 2)
```

#### catamorphism
以下是catamorphism的定义，可以把递归抽象出来
```
def cata[F[_]: Functor, Sub, A](structure: F[Sub])(algebra: F[A] => A): A
```
这里的F是一个由他的子结构parameterized的结构，例如上面的IntList   
cata的第一个参数structure就是这个要fold的数据结构   
cata的第二个参数algebra就是上面写的，当已经把原来拖着sub-structure的F[Sub]通过魔法变成了
拖着结果的F[A]之后，要如何做   
```
// magical的F[A]如何变成结果A
case Cons(h, a) => h + a
```

现在sumList可以写成这样，完全不需要递归，递归被隐藏到了cata的实现中    
```
def sumList(l: IntList): Int = cata[IntListF, Int](l) {
  case Cons(h, t) => h + t
  case Nil => 0
}
```

#### 实现catamorphism
catamorphism的实现思路很简单，递归的对后面sub-structure调用cata就行了。
```
def cata[F[_]: Functor, Sub, A](structure: F[Sub])(algebra: F[A] => A): A =
  algebra( structure.map(cata(_)(algebra)) )
```

然而这个实现有问题。   
问题一：   
我们都知道输入到cata中的structure应该是一个递归的结构，在例子中，Sub == IntList[IntList[IntList[...]]]，即F[Sub] == Sub   
但是编译器不知道这个信息，编译器在递归到下一层的时候，会认为Sub不是一个Functor，不能调用map方法。   
需要告诉编译器Sub == F[Sub], F是functor，所以Sub也应该可以map   

问题二：   
同时，如果编译器不知道这个信息，那么我们把一个不是递归结构的IntList传入cata的时候，编译器不会报错，
但是我们知道这是错的   
```
val nonRecursiveLst = Cons(1, 2)
cata[IntList, Int](nonRecursiveLst) {
  // ...algebra
}
```

#### 告诉编译器Sub == F[Sub]
这时候就需要用到Fix point.   
x是函数f上的一个fixed point iff f(x) == x,可以想象有一个higher-order function fix，输入一个函数，输出这个函数的一个fixed point   
fix(f) == x => f(x) == x，并且fix(f) == f(fix(f))

在type theory里面，Sub是F[_]上的fixed point iff F[Sub] == Sub,
同样可以有一个higher-order的Fix[F[_]]使得Fix[F] == F[Fix[F]]   
Fix[F] == F[Fix[F]] == F[F[Fix[F]]] == ...

下面是Fix data type的定义
```
case class Fix[F[_] : Functor](unfix: F[Fix[F]])
```
现在可以给cata加多一个限制，structure的类型必须是Fix[F]，例如
```
// 这个lst是一个递归的结构，他的所有sub-structure都是Fix[IntList]，这样才可以放到cata里面
val lst: Fix[IntList] =
  Fix(Cons(1,
    Fix(Cons(2,
      Fix(Cons(3,
        Fix[IntList](Empty)
      ))
    ))
  ))
```
这样就解决了问题二    

要解决问题一，只需要在实现cata的时候，告诉编译器怎么从Fix[F]变成F[Fix[F]]，就解决了。
```
def cata[F[_], A](structure: Fix[F])(algebra: F[A] => A)(implicit F: Functor[F]): A = 
  algebra(F.map(structure.unfix)(cata(_)(algebra)))
```

### 一些例子
> 注意前面例子中用的IntList重命名为IntListF，IntList是一个type alias，提高可读性



#### IntList
```
sealed trait IntListF[+F]

object IntListF {
  type IntList = Fix[IntListF]

  implicit val functor: Functor[IntListF] = new Functor[IntListF] {
    override def map[A, B](fa: IntListF[A])(f: A => B): IntListF[B] = fa match {
      case Cons(h, t) => Cons(h, f(t))
      case Nil => Nil
    }
  }
  
  def apply(f: IntListF[IntList]): IntList = Fix(f)

  def nil: IntList = apply(Nil)

  def cons(head: Int, tail: IntList): IntList = apply(Cons(head, tail))

  def fromList(is: Int*): IntList =
    is.foldRight(nil)(cons)

  def sumList(l: IntList): Int = cata[IntListF, Int](l) {
    case Cons(h, t) => h + t
    case Nil => 0
  }

  def main(args: Array[String]): Unit = {
    val intList = cons(1, cons(2, cons(3, nil)))

    val listRes = sumList(intList)
    println(listRes)
  }
}

case class Cons[F](head: Int, tail: F) extends IntListF[F]

case object Nil extends IntListF[Nothing]
```

#### Nat
```
sealed trait NatF[+A]

case class Succ[A](previous: A) extends NatF[A]

case object Zero extends NatF[Nothing]

object NatF {
  implicit val natFunctor: Functor[NatF] = new Functor[NatF] {
    override def map[A, B](fa: NatF[A])(f: A => B): NatF[B] = fa match {
      case Succ(previous) => Succ(f(previous))
      case Zero => Zero
    }
  }

  type Nat = Fix[NatF]

  def apply(f: NatF[Nat]): Nat = Fix(f)

  def succ(previous: Nat): Nat = apply(Succ(previous))

  def zero: Nat = apply(Zero)

  def natToInt(n: Nat): Int = cata[NatF, Int](n) {
    case Succ(x) => 1 + x
    case Zero => 0
  }

  def main(args: Array[String]): Unit = {
    val nat =
      succ(
        succ(
          succ(
            zero
          )
        )
      )
    val natRes = natToInt(nat)
    println(natRes)
  }
}
```
