# KleinTube
A simple proxy server/client written in nodejs based on socks5, websocket and chacha20-poly1305.

<img width="125" height="240" src="https://github.com/dreamrover/screenshots/blob/master/Klein_bottle.svg" />

## 简介
KleinTube（克莱因管）命名源自[克莱因瓶](https://zh.wikipedia.org/wiki/%E5%85%8B%E8%8E%B1%E5%9B%A0%E7%93%B6)——没有“内部”和“外部”之分的平面，表示没有服务端和客户端之分的“管道”，亦表示可以同时运行为服务端和客户端的网络代理工具。

目前的网络代理工具已有很多，却几乎都具有以下缺点之一：安装配置复杂、协议复杂、有效载荷比率低、易于被探测、代码结构繁杂、速度慢。

本项目的目的是开发一个功能单一、代码简洁、性能优越、抗监测性强、安装配置简单，对用户和开发者皆友好的网络代理工具。目前所有代码仅500余行，可运行于Linux、Windows及Mac OS等支持nodejs的系统，速度接近甚至快于某著名代理工具。安卓端工具正在开发中。

客户端为本地提供socks5代理，通过WebSocket连接至服务端，数据传输采用chacha20-poly1305加密。客户端可同时监听多个端口提供socks5代理，各端口可分别转发至不同服务端；服务端亦可同时监听多个端口。
## 安装
### Linux
* sudo npm -g install kleintube
### Windows
* npm install kleintube
## 参数
所有参数均在文件config.json中设置，server字段的内容是作为服务端的配置参数，client字段的内容是作为客户端的配置参数，可以仅保留server或client字段以单独作为服务端或客户端，也可以保留两者同时作为服务端和客户端。

参数文件也可在运行tube.js时通过第一个参数指定。
## 运行
首先修改文件config.json中的参数，包括端口、密码等。
### Debian/Ubuntu
将tube.servie拷贝至/etc/systemd/system/目录，运行以下命令启动服务：
* sudo systemctl start tube
### RHEL/CentOS
将tube.servie中的Group=nogroup修改为Group=nobody，然后拷贝至/etc/systemd/system/目录，运行以下命令启动服务：
* sudo systemctl start tube
### Windows
* node.exe path\to\kleintube\tube.js
