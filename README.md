# vue_reactive

研究vue响应式原理



### Vue2.0



#### 响应式原理

> 提到响应式原理，我们先来了解一下 `Object.defineProperty`  （在一个对象上定义一个新属性，或者修改一个对象的现有属性，并返回此对象）

数据劫持

```javascript
function defineProperty() {
    var _obj = {}
    var a = 0

    Object.defineProperties(_obj, {
        a: {
            get() {
                console.log('get value')
            },
            set(newVal) {
                a = newVal
                var myDom = document.querySelector("#p_dom")
                myDom.innerHTML = a
                console.log('set value')
            }
        },
        b: {
            writable: true,
            enumerable: true,
            configurable: true
        }
    })
    return _obj
}

var obj = defineProperty()
console.log(obj.a)
obj.a = 1
obj.b = 2
for(i in obj) {
    console.log(`${i}: ${obj[i]}`)
}
```

有四个配置项: **value**、**writable**、**enumerable**、 **configurable**，默认都为false

结果如下

![1.png](https://github.com/WowLv/vue_reactive/blob/main/img/1.png)



#### vue 2.0数据劫持

在vue2.0中，其实是将我们的数据进行劫持、然后挂载，再监听，首先我们创建一个vue的实例化对象

```javascript
let vm = new Vue({
    el: '#app',
    data() {
        return {
            title: '学生列表',
            total: 2,
            teacher: ['张三', '李四'],
            students: [
                {
                    id: 1,
                    name: '小明'
                },
                {
                    id: 2,
                    name: '小红'
                }
            ]
        }
    }   
})
```

这里单独拿data()来说，vue2.0的做法是返回一个函数然后进行处理，当然理论上直接返回一个对象也是可以的，但官方不推荐这么做

```javascript
let vm = new Vue({
    el: '#app',
    data: {
    	...
    	//不推荐
    }  
})
```

接着，我们需要将原来的数据中的 ‘options’挂载到vm实例上，也就是vue实例中我们所写的一些属性，data(), computed,methods...（所谓的options API）

创建一个vue初始化方法，进行数据的挂载

> 这里用到前面提到的 `Object.defineProperty()`，需要注意的是我们的数据存还可能在对象和数组，对于数组，我们需要对原生方法进行重写，实现响应式

```javascript
// vue/index.js
import { initState } from './init'
function Vue(options) {
    this._init(options)
}
Vue.prototype._init = function(options) {
    let vm = this;
    vm.$options = options
    initState(vm)
}
export default Vue;

//  vue/init.js
//再将data()的数据赋给_data再给data，这也是Vue.js的做法
function initData(vm) {
    var data = vm.$options.data;
    
    data = vm._data = typeof data === 'function' ? data.call(vm) : data || {}   //判断data()是否以函数返回,return {}
    for(var key in data) {
        proxyData(vm, '_data', key)		//对每个属性进行劫持,使得vm.xxx就可以访问到
    }
    observe(vm._data)
}

//vue/proxy.js
function proxyData(vm, target, key) {
    //数据劫持，挂载到vm上
    Object.defineProperty(vm, key, {
        get() {
            // vm.title --> vm._data.title
            return vm[target][key];
        },
        set(newVal) {
            vm[target][key] = newVal;
        }
    })
}
```

这里可以打印看到成功挂载到vm实例上

![2.png](https://github.com/WowLv/vue_reactive/blob/main/img/2.png)

当数据类型时数组或对象时，我们需要额外的操作，所以我们需要对数据进行观察

```javascript
observe(vm._data)

function observe(data) {
    if(typeof data !== 'object' || data === null) return;
    return new Observer(data);
}
```

再判断是否为数组，分别进行响应式处理，如果是对象，需要注意的是可能存在多层嵌套，所以需要用到递归观察，在set()当中也需要对数据进行观察

```javascript
import defineReactiveData from './reactive'
function Observer(data) {
    //判断是数组还是对象
    if(Array.isArray(data)) {
        data.__proto__ = arrMethods;
        observeArr(data)
    }else {
        this.walk(data);
    }
}
Observer.prototype.walk = function(data) {
    var keys = Object.keys(data);
    for(var i = 0; i < keys.length; i++) {
        var key = keys[i],
            value = data[key]
        defineReactiveData(data, key, value)
    }
}

// vue/reactive.js
function defineReactiveData(data, key, value) {
    //递归观察
    observe(value);
    Object.defineProperty(data, key, {
        get() {
            console.log('响应式数据：获取 ', value)
            return value
        },
        set(newVal) {
            console.log('响应式数据：设置 ', newVal);
            if(value === newVal) return;
            observe(newVal)
            value = newVal;
        }
    })
}
```

测试一下效果

```javascript
 data() {
    return {
        title: '学生列表',
        total: 2,
        teacher: ['张三', '李四'],
        info: {
            a: {
                b: 'b'
            }
        },
        students: [
            {
                id: 1,
                name: '小明'
            },
            {
                id: 2,
                name: '小红'
            }
        ]
    }
}   

console.log(vm.total);
vm.total = 3;
console.log(vm.total);
console.log(vm.info.a.b);
```

可以看到，嵌套的对象也是响应式的

![3.png](https://github.com/WowLv/vue_reactive/blob/main/img/3.png)

最后就是对数组类型的劫持，首先我们列出会改变原数组的数组方法

```javascript
var ARR_METHODS = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
]
```

对原生数组方法进行重写，继续对参数进行观察

```javascript
var originArrMethods = Array.prototype,
    arrMethods = Object.create(originArrMethods)

ARR_METHODS.map(function(m) {
    arrMethods[m] = function() {
        var args = Array.prototype.slice.call(arguments),
            rt = originArrMethods[m].apply(this, args)  //方法仍用原来的
        console.log(`数组新方法`, args)
        
        var newArr;
        switch (m) {
            case 'push':
            case 'unshift':
                newArr = args
                break;
            case 'splice':
                newArr = args.slice(2)
                break;
            default:
                break;
        }
        newArr && observeArr(newArr)
        return rt;
    }
})

//  vue/observeArr.js
function observeArr(arr) {
    for (var i = 0; i < arr.length; i++) {
        observe(arr[i])
    }
}
```

再让我们测试一下

```javascript
console.log(vm.students)
console.log(vm.students.push({
    id: 3,
    name: '张三'
}))
```

可以看到数组类型也是响应式数据了

![4.png](https://github.com/WowLv/vue_reactive/blob/main/img/4.png)



到此，简易的vue数据劫持就算完成，总的来说，vue2.0用 `Object.defineProperty` 对所有数据进行劫持再进行操作，对数组类型方法进行重写以保持响应式



+ 另外

Vue 不能检测以下数组的变动：

1. 当你利用索引直接设置一个数组项时，例如：`vm.items[indexOfItem] = newValue`
2. 当你修改数组的长度时，例如：`vm.items.length = newLength`

解决：

```js
// Vue.set
Vue.set(vm.items, indexOfItem, newValue)

// Array.prototype.splice
vm.items.splice(indexOfItem, 1, newValue)
```



### Vue3.0

#### Proxy

> 与 `defineProperty` 不同的是， `proxy` 是返回一个代理对象，而后者是对对象数据进行劫持操作

```javascript
let target = {
    a: 1,
    b: 2
}
let obj = new Proxy(target, {
    get(target, prop) {
        return target[prop]
      //return Reflect.get(target, prop) //推荐, 函数式调用，返回Boolean类型,
    },
    set(target, prop, value) {
        target[prop] = value
      //Reflect.set(target, prop, value)
    }
})

console.log(obj)
```





#### handler的方法

+ `handler.getPrototypeOf()  ` :  获取原型
+ `Object.getPrototypeOf()` : 与`Object.prototype`、`obj.__proto__`相似
+ `handler.setPrototypeOf()  `  :  设置原型
+ `Object.setPrototypeOf()`
+ `handler.isExtensible()` : 获取对象可扩展性
+ `Object.isExtensible()` ： 判断可扩展性
+ `handler.preventExtensions()` : 禁止扩展属性
  + `Object.preventExtensions()`
+ `handler.getOwnPropertyDescriptor()`  : 获取自有属性
+ `Object.getOwnPropertyDescriptor()` : 获取对象自有属性，原型链上的不可获取
+ `handler.ownKeys()` : 获取自有属性名合集
+ `Object.getOwnPropertyNames()` 
  + `Object.getOwnPropertySymbols()`
+ `[[DefineOwnProperty]]` : 拦截对象操作

  + `Object.defineProperty()` : 对象拦截操作
  + `Object.defineProperties()` : 多对象拦截操作
+ `handler.has()` : `in` 操作符
+ `handler.get()` : 获取属性
+ `handler.set()` : 设置属性
+ `handler.deleteProperty()` : 删除属性, `delete` 操作符
+ `handler.apply()` : 函数调用操作，`function test() {}  test()`
+ `handler.construct()` :  `new` 操作符，` function Test() {}  new Test()`



#### Proxy实现

> 在代理对象中对方法进行重写，再返回

```javascript
function MyProxy(target, handler) {
    //深拷贝
    function deepClone(org, tar) {
        var tar = tar || {},
            toStr = Object.prototype.toString,
            arrType = '[object Array]'
        for(var key in org) {
            if(org.hasOwnProperty(key)) {
                if(typeof(org[key]) === 'object' && org[key] !== null) {
                    tar[key] = toStr.call(org[key]) === arrType ? [] : {};
                    deepClone(org[key], tar[key])
                }else {
                    tar[key] = org[key]
                }     
            }
        }
        return tar
    }

    var _target = deepClone(target)
    Object.keys(_target).forEach(key => {
        Object.defineProperty(_target, key, {
            get() {
                return handler.get && handler.get(target, key)
            },
            set(newVal) {
                handler.set && handler.set(target, key, newVal)
            }
        })
    })
    return _target
}

//进行一波测试
var target = {
    a: 1,
    b: 2
}
let obj = new MyProxy(target, {
    get(target, prop) {
        return `get ${target[prop]}`
    },
    set(target, prop, value) {
        target[prop] = value
        console.log(`set ${target[prop]}`)
    }
})
console.log(obj.a)
obj.b = 3
console.log(obj.b)

/*******result********/
//get 1
//set 3
//get 3
/*********************/
```



#### vue3.0 数据代理

首先，老样子，`webpack` 构造一下项目，vue3.0是以一个个单独包使用，也就是所谓的`Composition API` ，可以看到源码中大量的`export` 操作，这里我们下载`@vue/reactivity` 来进行分析

```js
import { reactive } from '@vue/reactivity'

const person = reactive({
    name: 'lv',
    age: '22',
    info: {
        job: 'web前端',
        idol: [
            {
                id: 1,
                name: '赵露思'
            },
            {
                id: 2,
                name: '欧阳娜娜'
            }
        ]
    },
    hobby: ['music', 'basketball']
})

console.log(person)
```

可以看到，vue3.0就是用`Proxy` 来代理数据的

![reactive-api](https://github.com/WowLv/vue_reactive/blob/main/img/5.png)

那让我们自己来试试，新建一个vue3文件夹，在底下新建`reactive.js` 和 `mutableHandler.js` ，然后我们也学着vue3新建一个shared文件，存在依赖和功能函数

reactive.js

```js
import { isObject } from '../shared/utils'
import { mutableHandler } from './mutableHandler'

function reactive(target) {
    return createReactiveObject(target, mutableHandler);
}

function createReactiveObject(target, baseHandler) {
    if(!isObject(target)) {
        return target
    }

    const observer = new Proxy(target, baseHandler);
    return observer
}

export {
    reactive
}

```

mutableHandler.js

这里还用到了`Reflect` : 是一个内置的对象，它提供拦截 JavaScript 操作的方法。这些方法与`proxy handler` 的方法相同。`Reflect`不是一个函数对象，里面都是静态函数，因此它是不可构造的

![Reflect](https://github.com/WowLv/vue_reactive/blob/main/img/6.png)

获取时需要判断值是否为对象再进行递归，而获取的时候我们用`hasOwnProperty` 方法进行判断是增加还是修改，这样我们就完成了基本的`Proxy` 的`get()` 和 `set()` 重写完成响应式，当然还有很多代理操作没有写上去，来日方长，咱慢慢研究

```js
import { isObject, hasOwnProperty, isEqual } from '../shared/utils'
import { reactive } from './reactive'

const get = createGetter(),
      set = createSetter()

function createGetter() {
    return function get(target, key, receiver) {
        const res = Reflect.get(target, key, receiver)
        console.log(`响应式获取 ${target[key]}`)
        // console.log(res)
        if(isObject(res)) {
           return reactive(res)
        }
        return res
    }
}

function createSetter() {
    return function set(target, key, value, receiver) {
        const isKeyExist = hasOwnProperty(target, key),
              oldValue = target[key],
              res = Reflect.set(target, key, value, receiver) //boolean

        if(!isKeyExist) {
            console.log(`响应式新增 ${key} = ${target[key]}`)
        }else if(!isEqual(value, oldValue)) {
            console.log(`响应式修改 ${key} = ${target[key]}`)
        }
        
        return res
    }
}

const mutableHandler = {
    get,
    set
}

export {
    mutableHandler
}
```

测试一波

```js
person.name
person.info.idol.push({
    id: 3,
    name: 'Even You'
})
person.age = 23
```

![proxy-test](https://github.com/WowLv/vue_reactive/blob/main/img/7.png)

nice~