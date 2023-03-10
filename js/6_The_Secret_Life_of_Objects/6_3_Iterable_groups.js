/*
Iterable groups
Make the Group class from the previous exercise iterable.
Refer to the section about the iterator interface earlier in the
chapter if you aren’t clear on the exact form of the interface anymore.

If you used an array to represent the group’s members,
don’t just return the iterator created by calling the
Symbol.iterator method on the array.
That would work, but it defeats the purpose of this exercise.

for (let value of Group.from(["a", "b", "c"])) {
  console.log(value);
}
// → a
// → b
// → c
 */
"use strict";
class Group {
    constructor(){
        this.values = [];
    }
    add(item){
        if (!this.values.includes(item))
            this.values.push(item);
    }
    delete(item){
        let index = this.values.indexOf(item);
        if (index !== -1)
            this.values.splice(index,1);
    }
    has(item){
        return this.values.includes(item);
    }
    static from(temp){
        let group = new Group();
        for (let i = 0; i < temp?.length; i++)
            group.add(temp[i]);
        return group;
    }
}
/*
Could you extract iterator to separated class GroupIterator.
Please give your variables self explanatory names.
this.current is what? Current group, item, index?
 */
class GroupIterator extends Group{
    constructor(group){
        super();
        this.values = group.values;
    }
    [Symbol.iterator]() {
        this.currentItem = -1;
        return this;
    }
    next() {
        if (this.currentItem === this.values[this.values.length -1])
            return {done: true};
        this.currentItem = this.values[this.values.indexOf(this.currentItem) + 1];
        return {value: this.currentItem, done: false};
    }

}
for (let value of new GroupIterator(Group.from([10, 20, 30]))) {
    console.log(value);
}