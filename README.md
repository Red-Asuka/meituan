## 一、前言

Vue-SSR 相信各路大佬都不陌生，我前段时间刚了解到 SSR，

SSR 简单来说就是将本来要放在浏览器执行创建的组件，放到服务端先创建好，然后将编译好的内容（模板）下发（包括样式、内容、数据将它们直接发送到浏览器，最后将这些静态标记"激活"为客户端上完全可交互的应用程序。

通过服务端渲染，可以优化 SEO 抓取，提升首页加载速度，提升用户体验等。由于我 vue 还可以，所以上手还是比较轻松的，通过几天的学习，我先是把 nuxt.js 做了下整理，然后在 B 站找了项目实战撸了一把，所以想通过这篇文章，对其中的模块实现做一下总结，同时希望能够对学习 SSR 的小伙伴起到一点帮助。如果你觉得本文还行，请点亮左边的 👍

## 二、nuxt 基础

### 1. 概念

我过了一遍[nuxt.js 中文文档](https://zh.nuxtjs.org/guide/)做了个初步了解。

Nuxt.js 是一个基于 Vue.js 的通用应用框架，预设了利用 Vue.js 开发服务端渲染的应用所需要的各种配置。基于 Vue 2 做的，包括 Vue-Router，支持 Vuex、Vue Server Render、vue-meta。

### 2. nuxt 的工作原理

下面简单说一下 nuxt 的工作原理：（下图截自 nuxt 官网）

![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326332626664626339636435643f773d35323926683d36363326663d706e6726733d3339393731.png)

从浏览器发出一个请求，到最终服务端渲染完成，Nuxt 的生命周期如下：

- Incoming Request 浏览器发送一个请求；
- 服务端检查是否有 nuxtServerInit；
- 配置项，有的话就会执行这个函数，其中包含一个标注： Store action 用来操作 vuex；
- 下一个环节就是中间件 middleware ，与路由相关，做任何你想要的功能；
- 预验证 validate() 可以配合高级动态路由，做一些验证，比如是否允许跳转某个页面；
- asyncData() & fetch() 获取数据，前一个是用来渲染 vue component，即 vue 组件的，后一个通常用来修改 vuex，即 Store 的 state；
- 有了数据和模板后，最后一步就是 Render 渲染。后面就是浏览器的事儿了。

### 3.路由（Routing）

常用的有这几种：Basic Dynamic Nested

Nuxt 封装了路由的生成，你不需要额外编写路由，pages 文件夹下的结构，会自动生成对应的路由。

路由的生成主要是在 lib/build.js 里面处理的，大致步骤如下：

- 通过 glob 获取 pages 下所有文件，得到数组；
- 过滤掉 pages 和.vue 等不相关的字符串；
- 对带有\_符号进行处理；
- 处理动态路由和嵌套路由；
- 对子路由排序

### 4.支持异步数据（Async Data）

支持 Promise async/await callback

在组件结构中，其属于宿主 layout 下的子组件，不属于页面组件，无法使用页面组件中的 fetch 方法，官方的解释是子组件无法使用阻塞异步请求，即：子组件得到的异步数据无法用于服务端渲染，这对于程序是合理的，避免异常阻塞，简化业务模型。

如果需要这些异步数据增强站内内链 SEO，我们可以巧妙地使用内置 vuex 中的 nuxtServerInit 这个 API，这个 API 实在 nuxt 程序实例化之后第一次执行的方法，其内部返回一个 promise，我们可以在这里完成我们站内的所有子组件异步请求，随后将数据映射至对应子组件即可。

另外的方法是在 mounted 方法去调用异步数据。

注：在这个 data 方法里面，我们获取不到 this 指针，因为 data 方法在组件初始化之前就已经被调用了。

### 5. 搭建 nuxt 项目 demo

了解原理后，开始搭建一个 nuxt 项目，由于篇幅原因，这里不对项目搭建过程展开，可自行百度。下面我放了一张很多文章不会写的 nuxt 项目结构介绍及基本的 api：

![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326336353131613866643039333f773d3232353126683d3232363526663d706e6726733d343833333636.png)
![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326333616334613736303631343f773d3138343726683d31323726663d706e6726733d3233393031.png)

项目搭建完成后，我们随便写点东西，然后打开打开源码，就会有惊奇的发现。服务器端渲染完页面后给浏览器端的 html 分了几个部分，第一个是样式 style，第二个是模板内容，例如上图中圈中的蓝色部分，第三个是服务端拿到的数据结果，例如上图中圈中的红色部分，为什么服务端拿到的数据给到浏览器端呢？
这里我们得思考一个 SSR 的工作原理 了

如果不给数据的话，就是一个静态 html 模板，一个静态的内容，没有任何交互，那交互是在哪完成的呢？

交互是在浏览器端完成的，也就是说浏览器端会有一个入口，进行预编译，但不会再渲染页面了，因为服务器端已经在页面渲染过一次了。它要做的是创建一个虚拟的编译结果（可以理解为虚拟 dom）， 和服务器端传过来的结果进行对比，如果有区别，它会重新请求数据。在 nuxt 项目中都是一套文件，没有特别指定是在浏览器端运行还是服务端运行，也就是 SSR 常说的同构，浏览器端编译虚拟 dom，也依赖于 vue 文件，因此模板是有的，而编译这个 dom，需要的是额外的数据，此数据是服务器端渲染之前请求而来的数据，如果数据不同步在浏览器端，编译出来的结果必然和服务器端编译结果不一致。

综上，服务器端异步获取的数据会同步在浏览器端，作对比，如果对比一致的话，浏览器端就会对对应的 dom 结点注册事件，达到交互作用。

## 三、慕课网美团项目实战

这个项目是慕课网在 2018 年 10 月份左右推出的课程，到现在很多写法 npm 包都更新迭代了，但核心的东西还在，课程里面页面结构设计、组件设计、数据结构设计、某些样式写法、业务逻辑的完备性等包括项目目录的管理都是值得学习的。

### 1. 主要业务模块

- 首页
- 全局模糊搜索
- 登录/注册
- 产品列表/地图服务
- 产品详情页展示
- 个人中心/购物车
- 订单

### 2.技术栈

![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326339353536626265393863363f773d3130323726683d35343426663d706e6726733d3533393430.png)

- 客户端页面整体采用饿了么 **element-ui** 框架构建页面，简洁，美观；
- **nuxt.js** 和 **koa2** 做 **SSR**；
- **Vuex**管理数据和状态同步；
- 前端使用 **Vue** 和 **Vue Cli**搭建；
- 后端使用 **node 的 koa2 框架** 搭建，数据库 **redis** 和 **mongodb**；
- 使用了数据对象模型管理工具 **mongoose**。

### 3. 项目运行

本项目提供开发时的源码，可以进行二次开发及优化，项目地址：
[传送门](https://github.com/Red-Asuka/meituan)

① **Star** 本仓库，然后 **Fork** 到自己 github，下载代码到本地

```js
$ git clone git@github.com:Red-Asuka/meituan.git
```

② 下载并配置好后端数据库文件，启动 MongoDB 和 Redis 服务（安装与配置教程自行百度）

③ 安装依赖并启动项目

```js
$ npm/cnpm install
$ npm/cnpm run dev

```

![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326361353333663036623665373f773d3138343726683d31323726663d706e6726733d3233393031.png)

### 4. 项目技术亮点

#### 1、极简的 dom 节点实现复杂的表单/页面结构

在构建页面时先整体将页面分成几个大的模块，整体要么 head、body、foot 下布局，要么左中右布局，然后从数据结构的角度去思考怎么简洁的设计页面的 dom 结构。有了整体思路后，可借助一些优秀的 UI 框架来快速完成页面的绘制。本项目中首页导航栏/主页菜单/城市服务页面/产品详情列表等每个复杂的页面 dom 节点几乎不超过 10 个，十分简洁。这样的设计个人觉得是非常值得学习的

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615161014.jpg)

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615160528.jpg)

#### 2、注册模块

##### 1.静态页面绘制

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615160622.jpg)
首先利用 element 的 form 表单组件稍加改造绘制页面，并且这个 form 组件提供了很好很方便的前端校验规则

```js
rules: {
          name: [{
            required: true,
            type: "string",
            message: "请输入昵称",
            trigger: "blur"
          }],
          email: [{
            required: true,
            type: "email",
            message: "请输入邮箱",
            trigger: "blur"
          }],
          pwd: [{
            required: true,
            message: "创建密码",
            trigger: "blur"
          }],
          cpwd: [{
              required: true,
              message: "确认密码",
              trigger: "blur"
            },
            {
              validator: (rule, value, callback) => {
                if (value === "") {
                  callback(new Error("请再次输入密码"));
                } else if (value !== this.ruleForm.pwd) {
                  callback(new Error("两次输入密码不一致"));
                } else {
                  callback();
                }
              },
              trigger: "blur"
            }
          ]
        }

```

##### 2. 数据库（Redis & MongoDB）& 腾讯邮箱 SMTP 服务相关配置

在 config.js 文件中进行配置工作

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615160749.jpg)

##### 3. 发送验证码和注册业务实现

首先需要调用第三方接口完成发送邮件的功能：配置 QQ 邮箱 SMTP 服务 createTransport()-->获取用户邮箱及验证码-->确定接收方，发送相关信息-->编写邮件中显示内容-->调用 sendMail()发送邮件-->存储注册用户信息-->接口响应

```
//码验证接口
router.post('/verify', async (ctx, next) => {
  let username = ctx.request.body.username
  const saveExpire = await Store.hget(`nodemail:${username}`, 'expire')
  //拦截频繁刷接口操作
  if (saveExpire && new Date().getTime() - saveExpire < 0) {
    ctx.body = {
      code: -1,
      msg: '请求过于频繁，1分钟1次'
    }
    return false
  }
  //发邮件功能
  let transporter = nodeMailer.createTransport({
    service: 'qq',
    auth: {
      user: Email.smtp.user,
      pass: Email.smtp.pass
    }
  })
  //确定接收方，发送相关信息
  let ko = {
    code: Email.smtp.code(),
    expire: Email.smtp.expire(),
    email: ctx.request.body.email,
    user: ctx.request.body.username
  }
  //邮件中显示内容定义
  let mailOptions = {
    from: `"认证邮件" <${Email.smtp.user}>`,
    to: ko.email,
    subject: '【高仿美团网全栈开发】注册码',
    html: `您正在【高仿美团网】网页中注册，您的邀请码是${ko.code}，5分钟内有效，请勿泄露。`
  }
  //发送邮件
  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error)
    } else {
      //存储注册方信息
      Store.hmset(`nodemail:${ko.user}`, 'code', ko.code, 'expire', ko.expire, 'email', ko.email)
    }
  })
  ctx.body = {
    code: 0,
    msg: '验证码已发送，可能会有延时，有效期5分钟'
  }
})
```

**注册后端接口**

从 redis 中获取 在 nodemail 发验证码的时候 的存储数据，并将存储数据与浏览器获取的数据进行对比

```js
router.post("/signup", async ctx => {
  //关键代码
  const { username, password, email, code } = ctx.request.body;
  if (code) {
    const saveCode = await Store.hget(`nodemail:${username}`, "code"); //验证码
    const saveExpire = await Store.hget(`nodemail:${username}`, "expire"); //过期时间
    // ...
  } else {
    ctx.body = {
      // ...
    };
  }
});
```

#### 3、登录模块

##### 1.登录业务流程

- 在登录页面输入用户名和密码
- 调用服务端接口进行验证
- 验证失败，返回错误信息告知用户；验证通过，根据后台的响应状态跳转到项目主页
- ![](https://mediacat.ufile.ucloud.com.cn/github%2F68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f342f342f313731343431383034653332646137633f773d38313226683d33373926663d706e6726733d3531323936.png)

##### 2. md5 密码加密

```javascript
this.$axios.post("/users/signin", {
  username: window.encodeURIComponent(self.username),
  password: CryptoJS.MD5(self.password).toString()
});
```

##### 3. 请求成功跳转到主页面

```javascript
location.href = "/";
```

##### 4. 用户数据&状态

![](https://mediacat.ufile.ucloud.com.cn/github%2F68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326235343935636637623630353f773d38393826683d33303526663d706e6726733d3238343436.png)
浏览器发送一个 `request` 请求，根据 `cookie` ，服务器通过 `passport` 与 `redis`来验证当前是否是登录状态，返回 `username`。本项目用的是`koa-generic-session`npm 包进行 cookie 的相关操作。

#### 3、城市服务

![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326262663732373532316133373f773d3135353026683d38353126663d706e6726733d313134323733.png)
![](https://mediacat.ufile.ucloud.com.cn/github%2F68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326234343135313262633139313f773d3133393826683d34363126663d706e6726733d323233373133.png)
城市定位实现原理：

浏览器在发出请求的时候，会有一个 `request` ，在服务器端可以拿到 `requset.ip`，然后就可以取数据中心作映射，根据 `ip` 来定位城市，服务器拿到 `city`后再下发给浏览器。

原本实现方式： 当页面渲染完了，向服务器发送请求，甚至可以发一个空内容，然后按照上述实现原理来获取 `city`。即在 **mounted** 事件之后，向服务器发送请求，然后服务器下发城市名称。（页面发送请求渲染，然后又异步请求获取城市名，共两次请求）

缺点：网络请求浪费，影响用户体验，异步获取的城市会 “闪” 一下。

项目实现方式：当浏览器去请求文档的时候，服务端 ip 已经知道了，那个时候就可以拿到对应的城市，立即返回数据给浏览器。做法就是通过 `vuex` 来同步状态，然后通过 `SSR` 异步请求就能得到数据。

#### 4、首页搜索模块

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615160858.jpg)
后台接口没啥好说的，都是调用线上的接口，就是根据输入内容，获取相关最热门的吃喝玩乐，返回 name 和 type，完成实时搜索。
在客户端每输入一个字母都进行一次请求，会造成浪费性能,因此引入`lodash`插件，使用`debounce`做一个延时处理。

```js
import _ from "lodash";
input: _.debounce(async function() {
  let self = this;
  let city = self.$store.state.geo.position.city.replace("市", "");
  self.searchList = [];
  let {
    status,
    data: { top }
  } = await self.$axios.get("/search/top", {
    params: {
      input: self.search,
      city
    }
  });
  self.searchList = top.slice(0, 10);
}, 300);
```

<a href="https://segmentfault.com/a/1190000015312430">参考：由浅入深学习 lodash 的 debounce 函数</a>

#### 5、产品详情模块

**产品列表页**

![](https://mediacat.ufile.ucloud.com.cn/github%2F68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326261616361363435373661303f773d3135333426683d38313826663d706e6726733d343136333637.png)
**产品详情页**

![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f31392f313732326261636366353031616363333f773d3135353726683d38393726663d706e6726733d353430323437.png)
每一个产品列表对应着多个 `item` ，每个 `item` 与详情页是一对一关系，而上述两个页面路由是没有关联关系的。由于本项目没有 **产品库**，因此路由没有根据 `id`关联产品详情，依旧是根据搜索关键词 `keyword`。另外，产品列表页和产品详情页之间做了**登录拦截**。

接着，就是从产品详情页是跳转到购物车了

购物车页面如下图所示，可以看到，页面路由依旧是没有任何关联，但从下图地址栏可见，有一个重要的`id`属性。因为**产品详情页不能与购物车创建一对一映射关系**，即在进入产品详情页时，购物车页面是不存在的。当点击购买跳转到购物车时才会创建一个购物车。另外，产品详情页和购物车之间同样做了**登录拦截**。

#### 6、购物车相关

父组件`pages/cart.vue`通过**asyncData**获取数据(接口：`/cart/getCart`)
传给子组件 `list.vue` 所有订单数据，由子组件全部渲染出来，通过`cartData`变量联系，如果我在子组件中更改了购买商品的数量，也就是 cartData 中的值被更改了，那么，我们在父组件监听的 total(所有订单总价),也会重新计算

另外，购物车会创建一个订单，创建成功后才会跳转支付页面，但需考虑支付的是哪一个订单，于是支付和订单之间有一个依赖逻辑联系，但是支付和购物车之间是没有任何依赖的，虽然支付的动作是由购物车发起的，**但是购物车和支付之间的桥梁是订单**。

![](https://mediacat.ufile.ucloud.com.cn/github/68747470733a2f2f757365722d676f6c642d63646e2e786974752e696f2f323032302f352f32302f313732333133356634613133653234313f773d3132393826683d32383626663d706e6726733d3230323036.png)

## 页面全家福

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615161014.jpg)

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615161106.jpg)

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615161120.jpg)

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615161133.jpg)

![](https://mediacat.ufile.ucloud.com.cn/github/QQ截图20200615161151.jpg)

## 免责声明

本项目为仿做项目,仅做练手和学习使用,非官方网站,禁止用于商业目的,产生的一切侵权著作法律后果,与本作者无关。

转载使用请注明出处，谢谢！

`Copyright (c) 2020 Red-Asuka`
