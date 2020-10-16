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