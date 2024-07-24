to do list
好像不太需要cookie
用户加密的对称密钥不能发送到服务器
向服务器发出请求后，如果本地再有修改，然后收到服务器广播回来的消息，文本会回退（加时间戳，使用最晚输入）
brotli压缩
密钥字符集为了易读和输入使用了26个大写英文字母，最安全的方法是用32个16进制数来表示这128个位。
所有用户的key必须是随机生成的。
AES算法加密用户名作为识别凭证，密钥的随机性（26的16次方）防止识别凭证撞车。
登录时需要向服务端明确是否是新用户来实现验证；不这么做的话，服务端无从判断，只能添加所有新的凭证。这意味着无法防止user与1111 1111 1111 1111的出现。
设置定时清理服务器的Map存储

首次使用，用户输入用户名，随机生成一个对称加密密钥。加密密钥加密用户名得到识别凭证，发送到服务器。
服务器会记住新用户的识别凭证，检查已有用户的识别凭证。
后续设备使用已有的用户名和加密密钥即可识别。

考虑隐私，服务器应当没有读出用户复制内容的可能，所以对称密钥需要用户自己记住和搬运，不会发送到服务器

用户名是不必要的，所有用户的密钥加密固定的一段字符串也可以作为识别凭证。

识别凭证的发送最好也经过加密，需要服务器先发送一个公钥

回调，有时候回调函数不止一个来源组件，不是很方便。Promise.withResolvers看起来比较好用。

封装对重要数据结构的操作，方便修改

被react保存的对象经常总是那一个，它的方法可能形成闭包

清理，客户端检查清理再建新连接，只保持一个事件对象；服务端定时清理过期的等待请求。
sse不支持post方法，不能在请求体里放识别凭证：
1. 先使用post请求验证凭证，返回一个一次性识别码，然后eventSource发送带着识别码的连接请求。
2. eventSource先建立连接，服务器把连接放进一个buffer，返回识别码，在connect回调里发送带识别码和凭证的post请求告诉服务器连接的是谁。
: (凭证本身相当于数据库的存储key，其实不适合明文传，做eventSource的动态路由参数也不太合适，后面可能会做非对称加密post的body里的凭证)


``` js
post       /authentication           req {taken:string, newUser:boolean}   res {login-key: string or null(string) (if fails)}
get(sse)   /auth-connect/:login-key                                        res {data: {content:encrypted-string, update: encrypted-number}}
post       /update-text              req {content:string(en), update:number(en)}    👆broadcast                
/receive             req {content:string, update:string}   res {content: 'got it'}




```
