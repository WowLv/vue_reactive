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

export default proxyData;