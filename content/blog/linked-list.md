+++
title = "Rust Data Structures: Linked List"
date = 2020-04-12
description = "An implementation of one of the most rudimentary data structures in computer science using Rust."
+++

Most programming languages (including Rust) have a basic array type that can hold types but it lack features that are often needed by a programmer such as insertion and deletion of elements without creating a new array. Arrays are still often useful however due to their \\(O(1)\\) indexing, space efficiency, and memory locality.<sup id="lab1">[1](#ref1)</sup> However if these benefits are not needed once can opt for a structure such as a linked list to gain the needed insertion and deletion. 

## [Basic Linked List](#basic-linked-list)

The first thing for any data structure is to implement how the data is stored, often in Rust (and languages such as C) data is stored in a `struct` which is linked to other `struct`s via pointers. 

```rust
struct List {}
```

In Rust however we use the smart pointer type of [`Box<T>`](https://doc.rust-lang.org/std/boxed/index.html) which prevents the dangers that raw pointer pose. This `Box<T>` will point to a type of `T` which will be our type that we define since the list needs to know about the next element. Unlike C we do not have `null` so we must wrap our `Box<T>` in an [`Option`](https://doc.rust-lang.org/std/option/index.html) so that we can know the end of the list has been reached. 

```rust
struct List {
    next: Option<Box<List>>,
    item: i32,
}
```

The `item` is the data that we store in this case a 32 bit int, but we will make this function generic later. 

Technically this is the full data structure but we need some way to use a data structure or it will be useless so we will start by defining an implementation for `List` that will create a new list.

```rust
impl List {
    fn new(value: i32) -> Self {
        List { next: None, item: value }
    }
}
```

This function will allow use to create a new `List` with a value for the first index. Next onto insertion, searching, deletion.

## [Insertion, Searching, and Deletion](#insertion-searching-and-deletion)

#### [Insert](#insert)

One of the reason not to opt for a linked list is that indexing the array is \\(O(n)\\), this also applies to insertion and deletion. However if the implementation of the linked list is slightly clever and all insertions are at the front of the list the insertion time goes to \\(O(1)\\).

This implementation is a bit tricky in Rust but to achieve an efficient program sometime ticks are needed. First we need to use the [`mem`](https://doc.rust-lang.org/std/mem/index.html) module so we include it at the top of our program with:

```rust
use std::mem;
```

Next we will define a new method for our `List` called `insert` which will have a mutable reference to self as well as our item we are inserting. This method will return our `List` so we can chain function call, we will see this later when testing the data structure.

```rust
impl List {
    fn insert(&mut self, item: i32) -> &mut List { }
}
```

First is the most complicated part of this, we need to replace `self` with a new object that contains the new item as we are inserting at the beginning of the list and the List owns the remainder of the items. To do this we use [`mem::replace`](https://doc.rust-lang.org/std/mem/fn.replace.html) which takes a mutable reference and replaces it with an owned value while returning mutable reference, perfect for what we need!

```rust 
let old = mem::replace(self, List::new(item));
```

So we just swapped in place our old `List` for a new `List` containing our item and got that old list back, now we need to append our old list as the next element of the new list.

```rust
self.next = Some(Box::new(old));
```

Putting this all together all we need to do is return a reference to self.

```rust 
fn insert(&mut self, item: i32) -> &mut List {
    use core::mem;
    let old = mem::replace(self, List::new(item));
    self.next = Some(Box::new(old));
    self
}
```

#### [Search](#search)

Our data structure is also not very helpful if we can not retrieve data from it easily, so let search it! Searching is \\(O(n)\\) as we have to access each element to get to the next. Also our searching algorithm will assume each element is unique and return the list at that point. 

```rust
impl List {
    fn search(&self, item: i32) -> Option<&List> {
        let mut list = self;
        loop {
            if list.item == item {
                return Some(list);
            }

            match &list.next {
                None => {return None},
                Some(next) => { list = &next },
            }
        }
    }
}
```

The search loops through the list to the end looking for a matching item and returns `Some(list)` if it finds an element that contains the item otherwise search returns `None`.

#### [Deletion](#deletion)

Once again at \\(O(n)\\) time we will delete an element. One issue however is that we can potentially delete the only element in the data structure, typically in C we would replace our list pointer with a null pointer but since we can not do that we must get creative. Unlike previous methods delete will take ownership of the list and return `Option<List>`. We also have an issue when it comes to ownership, how do we take 

## [Testing](#testing)

Now lets use our new data structure to store some data, delete an element, and then search to make sure it works like we would expect.

The first thing we want to do is make out list printable so we can make sure the state of our program is correct so add `#[derive(Debug)]` at the top of your `List` struct. Now lets write a simple linked list program.

```rust
let mut l = List::new(32);
l.insert(12).insert(14).insert(43);
println!("{:?}", l);
let l = l.delete(12).unwrap();
println!("{:?}", l);
println!{""}
```

## [Generic](#generic)

Going forward all the data structures will be implemented generically, to do this we need a type parameter on most of our functions. One thing we need our type to do however is be able to have partial equality so that we can find First looking at the struct we will add the type parameter.

```rust 
#[derive(Debug)]
struct List<T> {
    next: Option<Box<List<T>>>,
    item: T,
}
```

The rest of the implementation is basically replacing the `i32` type with the new `T` type.

## [Conclusion](#conclusion)

This is mostly just an academic exercise though since Rust comes with great [`std`](https://doc.rust-lang.org/std/) collections such as [`LinkedList`](https://doc.rust-lang.org/std/collections/struct.LinkedList.html) and [`Vec`](https://doc.rust-lang.org/std/collections/struct.LinkedList.html) which are often better implementations. The [`std::collections`](https://doc.rust-lang.org/std/collections/index.html#when-should-you-use-which-collection) gives a great overview of when to use each type of collection. The main benefits of a linked list is that 

## [Full Implementation](#full-implementation)

The full implementation is available on [GitHub Gist](http://s.com).

## [Footnotes](#footnotes)

<a name="ref1">1</a>: 
Skiena, Steven S. The Algorithm Design Manual. London: Springer, 2012. pp 66. [↩](#lab1)

<a name="ref2">2</a>: 
Skiena, Steven S. The Algorithm Design Manual. London: Springer, 2012. pp 70. [↩](#lab2)

\\[
    \frac{1}{2} (m_1 + m_2) v_0^2 \cos^2 \Theta + E = \frac{1}{2}
    m_1 v_1^2 + \frac{1}{2} m_2  \frac{(m_1 + m_2) v_0 \cos \Theta - m_1 v_1}{m_2}^2
\\]
