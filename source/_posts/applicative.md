---
layout: post
title: applicative functor
author: linzihao
categories: functional_programming
date: "2018-11-22"
---

## applicative functor ##
applicative functor是多了ap和pure方法的functor
```
trait Applicative[F[_]] extends Functor[F] {
  def ap[A, B](ff: F[A => B])(fa: F[A]): F[B]

  def pure[A](a: A): F[A]

  def map[A, B](fa: F[A])(f: A => B): F[B] = ap(pure(f))(fa)
}
```
pure就是把一个值包装起来，lift成一个functor。
ap是把一个包装起来的函数ff，应用到一个包装起来的fa上，返回fb。

除了通过定义ap获得一个applicative，还可以通过定义product+map的方式。product+map和ap是等价的。即可以用ap表示product+map，也可以用product+map表示ap。

product和ap提供了两种直观的方式看applicative。

### product ###
```
def product[A, B](fa: F[A], fb: F[B]): F[(A, B)]
def map[A, B](fa: F[A])(f: A => B): F[B]
```
product就是把两个包装起来的值a和b，合在一起变成(a, b)。

来看一个具体的例子，是可以把包装里面的内容合在一起的
```
implicit def applicativeForEither[L]: Applicative[Either[L, ?]] = new Applicative[Either[L, ?]] {
  def product[A, B](fa: Either[L, A], fb: Either[L, B]): Either[L, (A, B)] = (fa, fb) match {
    case (Right(a), Right(b)) => Right((a, b))
    case (Left(l) , _       ) => Left(l)
    case (_       , Left(l) ) => Left(l)
  }

  def pure[A](a: A): Either[L, A] = Right(a)

  def map[A, B](fa: Either[L, A])(f: A => B): Either[L, B] = fa match {
    case Right(a) => Right(f(a))
    case Left(l)  => Left(l)
  }
}
```

applicative需要满足
- Associativity
	- fa.product(fb).product(fc) ~ fa.product(fb.product(fc))
	- fa.product(fb).product(fc) = fa.product(fb.product(fc)).map { case (a, (b, c)) => ((a, b), c) }
- identity
	- pure(()).product(fa) ~ fa
	- pure(()).product(fa).map(_._2) = fa
	- fa.product(pure(())) ~ fa
	- fa.product(pure(())).map(_._1) = fa

## functor, applicative, monad ##
functor管理的是单个effect，applicative是管理多个不相关的effect，monad是管理一串相互关联的effect

要写一个验证表单的函数
```
case class Form(name: String, age: Int, email: String)
def validName(name: String): Either[NameErr, String]
def validAge(age: Int): Either[AgeErr, Int]
def validEmail(email: String): Either[EmailErr, String]
```

一个表单要通过验证，必须3项都通过验证，如果用monad是这样写
```
def validForm(name: String, age: Int, email: String): Either[List[Err], Form] = 
	valid
```