---
layout: post
title: "交换机，路由器等硬件"
author: linzihao
categories: networking
date: "2018-11-13"
---

### hub ###
half-duplex的。
收到一个packet的时候，把这个packet复制n份发给所有连接了的端口。
所有连接了的都可以看到这个packet，根据header判断要不要drop。
因为全都要复制发一次，所以效率低。

### switcher ###
full-duplex，在data link layer。
储存所有连接方的信息在CAM table里面。
当收到一个信息的时候，读layer2的header，根据CAM table转发。

### router ###
在layer 3（network layer）上。
和switcher的区别
switcher只能在同一个network segment里面用.
![](https://i.imgur.com/3H8uSt6.png)

## traffic classification ##
### broadcast ###
在layer2，ff:ff:ff:ff:ff:ff MAC地址用来做broadcast。
layer3也有broadcast。IP地址里面最高的作为broadcast地址。例如ip是192.168.0.20，broadcast地址就是192.168.0.255

broadcast domain指不用经过router可以直接发送的范围。
![](https://i.imgur.com/QldtrdF.png)

### multicast ###
224.0.0.0 to 239.255.255.255

### Unicast Traffic ###

## 在switches上抓包的方法 ##
### port mirroring ###
把sniffer插到switch的一个空port上面，然后在switch的控制台设置port x的东西都复制到port sniffer

### hubbing out ###
![](https://i.imgur.com/Bcot1oR.png)

### tapping out ###
![](https://i.imgur.com/XQz7cu1.png)

### ARP pollution ###
