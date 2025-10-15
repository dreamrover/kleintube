# KleinTube
A simple proxy server/client written in nodejs based on socks5, websocket and chacha20-poly1305.

<img width="125" height="240" src="https://github.com/dreamrover/screenshots/blob/master/Klein_bottle.svg" />

## 简介
KleinTube（克莱因管）命名源自[克莱因瓶](https://zh.wikipedia.org/wiki/%E5%85%8B%E8%8E%B1%E5%9B%A0%E7%93%B6)——没有“内部”和“外部”之分的平面，表示没有服务端和客户端之分的“管道”，亦表示可以同时运行为服务端和客户端的网络代理工具。

目前的网络代理工具已有很多，却几乎都具有以下缺点之一：安装配置复杂、协议复杂、有效载荷比率低、易于被探测、代码结构繁杂、速度慢。

本项目的目的是开发一个功能单一、代码简洁、性能优越、抗监测性强、安装配置简单，对用户和开发者皆友好的网络代理工具。

客户端和服务端的连接使用基于WebSocket的自创协议，化繁为简，数据的加密和验证采用AEAD算法，具有高安全性和低冗余度，并将身份验证和代理请求融为一体，使得数据和连接没有任何特征，难于被监测。

目前所有代码仅500余行，可运行于Linux、FreeBSD、Windows及MacOS等支持nodejs的系统，速度与主流代理工具相当，甚至略快。

客户端为本地提供socks5代理，通过WebSocket连接至服务端，数据传输采用chacha20-poly1305加密。客户端可同时监听多个端口提供socks5代理，各端口可分别转发至不同服务端；服务端亦可同时监听多个端口。
## 安装
### Linux
* sudo npm i -g kleintube
### FreeBSD
* sudo npm i -g kleintube
### Windows
* npm i kleintube
## 参数
Linux/FreeBSD系统通常默认安装在/usr/local/lib/node_modules/kleintube目录，所有参数均在文件config.json中设置，server字段的内容是作为服务端的配置参数，client字段的内容是作为客户端的配置参数，可以仅保留server或client字段以单独作为服务端或客户端，也可以保留两者同时作为服务端和客户端。

参数文件也可在运行kleintube.js时通过第一个参数指定。
## 运行
### 配置文件
运行前建议修改配置文件config.json中的参数，包括端口、密码等，此文件为JSON格式，具体介绍如下：
#### server字段
此字段是程序作为服务端的配置，支持同时监听多个端口，数组的每一项为一个端口的配置：port为所监听的端口号，key为对应的连接密码。
#### client字段
client字段是程序作为客户端，通过WebSocket加密连接至服务端，并在本地开启socks5服务的配置，可同时开启多个端口提供socks5服务：

host为允许使用客户端socks5服务的主机，设置为localhost时仅允许本机上的程序使用socks5服务，设置为0.0.0.0时允许网络上所有主机的连接；

port为客户端开启的socks5服务的端口号；

remote_host为服务端主机的地址，客户端加密连接至运行于此主机的服务端；

remote_port为服务端的端口号；

key为连接至服务端的密码。

程序可同时运行为服务端和客户端；若仅作为服务端，建议删除client字段；若仅作为客户端，建议删除server字段。

服务端和客户端的时钟须保持同步，偏差不得大于50秒。
### TCP fastopen
Linux系统可开启TCP fastopen以加快TCP连接的建立：

切换至root，运行以下命令立即开启：
* echo 3 > /proc/sys/net/ipv4/tcp_fastopen

设置为自动开启：
* echo "net.ipv4.tcp_fastopen = 3" >> /etc/sysctl.conf
### Debian/Ubuntu
将kleintube.servie拷贝至/etc/systemd/system/目录，运行以下命令启动服务：
* sudo systemctl start kleintube
### RedHat
将kleintube.servie中的Group=nogroup修改为Group=nobody，然后拷贝至/etc/systemd/system/目录，运行以下命令启动服务：
* sudo systemctl start kleintube
### FreeBSD
将kleintube拷贝至/usr/local/etc/rc.d/目录，运行以下命令启动服务：
* sudo service kleintube start
### Windows
#### 运行方式一：直接运行
* node.exe path\to\kleintube\kleintube.js
#### 运行方式二：添加至系统服务（推荐）
首先安装node-windows：
* npm i node-windows

然后运行service.js将Kleintube添加至系统服务，此命令只需运行一次：
* node.exe path\to\kleintube\service.js

Kleintube将出现在系统服务中，可以随系统自动启动：
![image](https://github.com/dreamrover/screenshots/blob/master/kleintube-win.png)
#### 注意
安装NodeJS更新之前须手动停止此服务，更新之后再启动此服务，否则无法安装更新。
## 参考链接
[为何 shadowsocks 要弃用一次性验证 (OTA)](https://printempw.github.io/why-do-shadowsocks-deprecate-ota)