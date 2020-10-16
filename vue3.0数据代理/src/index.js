// import { reactive } from '@vue/reactivity'
import { reactive } from '../vue3/reactivity/reactive'

const person = reactive({
    name: 'lv',
    age: 22,
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

person.name
person.info.idol.push({
    id: 3,
    name: 'Even You'
})
person.age = 23
console.log(person)