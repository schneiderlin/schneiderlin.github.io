---
title: 用 MessageChannel 和 iframe 通信
date: 2023-01-23 11:10:02
---
首先有两个 html, index.html 里面内嵌了 iframe inner.html

index.html
```html
<html>
<body>
    <h1>index</h1>

    <iframe id="inner" style="display: block;" src="./inner.html"></iframe>
</body>
</html>
```

inner.html
```html
<html>
<body>
    <h1>inner</h1>
</body>
</html>
```

在 index.html 中创建 MessageChannel
```javascript
const channel = new MessageChannel()
```

channel 有两个属性, port1 和 port2. 是 channel 的两端, 在 port1 发送的消息会传递到 port2, 在 port2 发送的消息会传递到 port1.
发送消息到 port 使用 postMessage 方法, 接受消息使用 onmessage 方法. 

下面把 port1 和 port2 放到 window 里面, 可以在控制台测试.
```html
<script type="text/javascript">
    const channel = new MessageChannel()
    const port1 = channel.port1
    const port2 = channel.port2

    // 放到 window, 可以在控制台测试
    window.port1 = port1
    window.port2 = port2

    // 接收到消息打印出来
    port1.onmessage = e => {
        console.log("port1 get message: ", e)
    }
</script>
```

在控制台使用 postMessage 方法往 port1 输入消息, 可以看到 port2 接收到了
```
> port1
MessagePort {onmessageerror: null, onmessage: ƒ}
> port1.postMessage("hello from port1")
index.html:21 port2 get message:  MessageEvent {isTrusted: true, data: 'hello from port1', origin: '', lastEventId: '', source: null, …}
```

现在 port1 和 port2 两端都在 index.html 中, 如果想要 index.html 和 inner.html 通信, 那么就需要把 port2 交给 inner.html.  

首先需要拿到 inner 的 frame, 然后在 inner 加载完时使用 postMessage 方法把 port2 交给对端
postMessage 文档 https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
```javascript
// 获取 inner 的 frame
const frameElem = document.getElementById("inner")
const frame = frameElem.contentWindow

// 当 inner 加载完时(即 load 事件发生时), 使用 postMessage 方法把 port2 交给对端
frameElem.addEventListener("load", function () {
    // 使用的是三个参数的 postMessage(message, targetOrigin, transfer)
    // - 第一个参数 message 不需要用到, 用空字符串
    // - 第二个参数 targetOrigin 表示当 origin 是什么时候才生效, * 表示任意 origin
    // - 第三个参数 transfer 是需要传递到对端的所有对象
    frame.postMessage(
        "",
        "*",
        [channel.port2]
    )
    console.log("port2 send to iframe")
})
```

相应的需要在 inner.html 中, 接收 index.html 传过来的 port2.
并且把 port2 的监听逻辑从 index.html 移动到 inner.html
```javascript
window.onmessage = (evt) => {
    // evt.ports 就是 index.html 中传递的 [channel.port2]
    if (evt.ports && evt.ports.length) {
        console.log("inner received port2")
        // 放到 window 中方便测试
        window.port2 = evt.ports[0]

        // 监听消息
        port2.onmessage = e => {
            console.log("port2 get message: ", e)
        }
    }
}
```

现在再往 port1 发送消息, 可以看到消息响应方是 inner.html
```
> port1.postMessage("aha")
inner.html:16 port2 get message:  MessageEvent {isTrusted: true, data: 'aha', origin: '', lastEventId: '', source: null, …}
```

以上就实现了和 iframe 的双向通信.