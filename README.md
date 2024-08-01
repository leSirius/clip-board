iPad和电脑之间复制链接之类文本的暂时没有很轻便的办法，之前从《JavaScr权威指南》看到一段SSE代码，看起来比较有意思。

# 使用
首次使用，自拟用户名，随机生成一个AES加密密钥，用户名和密钥需要记住和手动输入新设备。AES密钥加密用户名得到识别凭证（token），发给服务器记录，复制的文本内容将使用这个密钥加密。
成功进入会使用localStorage记录用户名和密钥，不需要再次输入。其他设备使用已有的用户名和加密密钥登录即可，在文本框输入的文字会被同步。clear按钮会清空除了timerRef以外的所有运行数据和localStorage。

这个实现以隐私为首要考虑，服务器应当没有解密用户复制内容的能力，加密解密只在客户端进行，密钥不会传输，所以需要用户自己记住和搬运密钥。

密钥为使用26个大写英文字母作为字符集，长度为16，随机性足够防止碰撞；为了易读和输入，没有利用所有的位。

# 连接流程
1. 当获取用户名和密钥后（用户输入或者读取localStorage），先进行new EventSource()连接，服务器生成identifier，把对应的response放入等待队列，返回identifier。
2. 客户端使用生成的token和收到的identifier向服务器发起验证。如果验证成功，将identifier对应的response移出等待队列，加入已连接队列；并记录identifier和token的对应关系。然后向新加入的设备发送缓存的最新信息，并向同token下的所有设备更新编号和总数信息。SSE连接完成。
3. 后续发送文本消息使用identifier为识别，可以识别到具体的设备，方便编号和避免一次冗余的发送。

发送的还有完成输入时的时间戳，服务器用以缓存最新版本的消息，客户端用来比较更新时间，防止当前输入因为先前的网络响应回退

服务端定期清理等待队列里的过期连接。

# bugs和其他
暂时没有https部署，用不了新的clipboard API。document.execCommand似乎不能粘贴。

token和identifier是作为连接凭证，最好也加密，服务器可以在发送identifier时也发送一个公钥，客户端再生成另一个加密其他数据的对称密钥。

有时候回调函数不止一个来源组件，不是很方便。Promise.withResolvers。返回连接的结果，移出控制流，依赖一个环境的代码尽可能在该环境的控制流中运行。

封装对重要数据结构的操作，修改方便

被react保存的对象经常总是那一个，它的方法可能形成闭包

伪元素倒影，按钮和开屏动画,

sse不支持post方法，不能在请求体里放识别凭证：
~~1. 先使用post请求验证token凭证，返回一个一次性识别码，然后eventSource发送带着识别码的连接请求。~~
2. eventSource先建立连接，服务器把连接放进一个buffer，返回识别码，在connect回调里发送带识别码和凭证的post请求告诉服务器连接的是谁。

# 后续
- brotli压缩
- 传输图片，文件能力
- 允许归档几条信息
- 移动端适配（呃一个为了多端同步的项目没有适配手机）
- iPad和手机的中文输入有时会回退
- 持久存储

``` 
get      /eventsource    req                       res {identfier}
post     /identify       req {token, identifer}    res {}           SingleEvent: {type:sucess, {count}} {type:message, {content,update} ; GroupCast: {type:message,{count} 
post     /text           req {content, update}     res {}           GroupCast except origin {type:message, {content, update}


```
