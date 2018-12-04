function可以compose
A => B和B => C这样的两个function可以compose起来变成A => C的函数。

但是有一些函数，返回的是一个monadic的值，例如A => Option[B],
B => Option[C]。
现在就不能把这两个函数直接compose或者andThen组合起来了。

如果要组合f: A => Option[B]和g: B => Option[C]
需要首先f(A)得到一个Option[B]，
然后通过Option的flatMap方法，拿到里面的B，然后g(b)
```
val composed: A => Option[C] =
 a => f(a).flatMap(b => g(b))
```
可以发现，所有支持flatMap操作的F[_]都可以把A => F[B]和
B => F[C]compose成A => F[C]。

kleisli就是对A => F[B]这个类型做了一下包装，使得compose更方便。


Cat的源代码，Kleisli[F[_], A, B]只是对A => F[B]做了一个包装，给他增加了一个compose方法，使得Z => F[A]和A => F[B]可以组合成
Z => F[B]，也就是Kleisli[F[_], Z, B]
```
import cats.FlatMap
import cats.implicits._

final case class Kleisli[F[_], A, B](run: A => F[B]) {
  def compose[Z](k: Kleisli[F, Z, A])(implicit F: FlatMap[F]): Kleisli[F, Z, B] =
    Kleisli[F, Z, B](z => k.run(z).flatMap(run))
}
```

Kleisli是对A => F[B]做了一个包装，所以是一个data type。
包装后的这个arrow，叫做kleisli arrow。

如果这个effect有一个pure方法，就可以造出一个identity的kleisili arrow
object是type，morphism是kleisili arrow的category叫kleisili category

### writer example
```
type Writer[A] = (A, String)
```
morhpism和composition和identity
```
A => Writer[B]
def >=>[A, B, C](m1: A => Writer[B], m2: B => Writer[C]): A => Writer[C]
def pure[A](x: A): Writer[A] = (x, "")
```
kleisili需要一个monad，要有unit做identity，flatten做fish
