之前从《JavaScr权威指南》看到一段SSE代码，看起来比较有意思。从ipad和电脑之间复制链接之类的好像没有很轻便的办法，正好可以用。

# 使用
首次使用，自拟用户名，随机生成一个对称加密密钥，用户名和密钥需要记住和手动输入新设备。AES密钥加密用户名得到识别凭证（token），发给服务器，发送的所有文本内容也使用这个密钥加密。
成功进入会使用localStorage记录用户名和密钥，不需要再次输入。其他设备使用已有的用户名和加密密钥登录即可，在文本框输入的文字会被同步。clear按钮会清空除了timerRef以外的所有数据，用户信息和localStorage。

这个实现以隐私为首要考虑，服务器应当没有解密用户复制内容的可能，所以AES对称密钥需要用户自己记住和搬运。

密钥为使用26个大写英文字母作为字符集，长度为16，随机性足够防止碰撞；这个只是为了易读和输入，没有利用所有的位。

# 连接流程
当获取用户名和密钥后（用户输入或者读取localStorage），先进行new EventSource()连接，服务器接受连接，生成identifier，把identifier和对应的response放入等待队列，返回identifier。
客户端在使用生成的token和收到的identifier向服务器发起验证。如果验证成功，服务器将identifier对应的response移出等待队列，加入已连接队列，并记录identifier和token的对应关系。然后向新加入的设备发送缓存的最新信息，并向同token下的所有设备更新编号和总数信息。SSE连接完成。
后续发送文本消息使用identifier为识别，可以识别具体的设备，避免一次冗余发送。同时发送的还有完成输入时的时间戳，用以服务器缓存最新消息，和防止客户端接受消息设定最新版防止装车。

服务端定期清理等待队列里的过期连接。

服务端缓存和客户端设置接受文本，都以完成输入时候向服务器发出请求后，如果本地再有修改，然后收到服务器广播回来的消息，文本会回退（加时间戳，使用最晚输入）

登录时需要向服务端明确是否是新用户来实现验证；不这么做的话，服务端无从判断，只能添加所有新的凭证。这意味着无法防止user与1111 1111 1111 1111的出现。
设置定时清理服务器的Map存储

# bugs和其他
暂时没有https部署，用不了新的clipboard API。document.execCommand似乎不能粘贴。

token是唯一凭证，它的发送最好也加密，服务器可以在发送identifier时也发送一个公钥，客户端再生成另一个加密其他数据的对称密钥。好像不如https部署

有时候回调函数不止一个来源组件，不是很方便。Promise.withResolvers看起来比较好用。

封装对重要数据结构的操作，修改方便安全

被react保存的对象经常总是那一个，它的方法可能形成闭包

伪元素倒影，按钮和开屏动画,

点击无关处自动关闭信息版似乎要监听onMouseEnter，onMouseLeave，onBlur，onClick这几个事件，不做坐标判断的话。

客户端检查清理再建新连接，只保持一个事件对象；服务端定时清理过期的等待请求，维持计数正确。

sse不支持post方法，不能在请求体里放识别凭证：
~~1. 先使用post请求验证token凭证，返回一个一次性识别码，然后eventSource发送带着识别码的连接请求。~~
2. eventSource先建立连接，服务器把连接放进一个buffer，返回识别码，在connect回调里发送带识别码和凭证的post请求告诉服务器连接的是谁。
: (token凭证是用户的唯一识别码，其实不适合明文传。要再做加密让服务器生成和发送非对称公钥，部署成http，自生成证书体验一般)

# 后续
- brotli压缩
- 传输图片，文件能力
- 允许归档几条信息
- 移动端适配（呃一个多端传文本的项目没有适配手机）
- iPad和手机的中文输入会有回退
- 持久存储

``` 
get      /eventsource    req                       res {identfier}
post     /identify       req {token, identifer}    res {}           SingleEvent: {type:sucess, {count}} {type:message, {content,update} ; GroupCast: {type:message,{count} 
post     /text           req {content, update}     res {}           GroupCast except origin {type:message, {content, update}


```
