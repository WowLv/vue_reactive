import Vue from 'Vue';

//options API
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

console.log(vm.students)
console.log(vm.students.push({
    id: 3,
    name: '张三'
}))