import observe from "./observe";

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

export default defineReactiveData;