---
layout: post
title: "out of core sorting, rust实现"
date: "2018-12-07 11:34:56 +0800"
category: rust
author: linzihao
---

这篇文章通过实现out of core算法，熟悉rust关于硬盘IO的操作。  

### out of core 算法简介
当需要sort的数据不能全部放在内存里面的时候，就需要用到out of core sorting算法。  
先定义几个符号
- B: 内存中可以存放的Page数量
- N: 需要排序的数据总共需要多少个Page存放

基本思路是
- 从硬盘中读取B这么多的数据
- 在内存中把读入的数据进行排序，然后写出到硬盘中，作为下一个phase的中间结果。
- 所有的输入数据都在内存里排序了一遍并且写出到硬盘，叫做一个phase。
- 第一个phase完成之后，会有N/B个中间文件，每一个中间文件都是排序好的。
- stream B个中间文件，在内存中做linear merge，然后写出到硬盘，作为下一个phase的中间结果。
- 第二个phase完成之后，会有N/B/B个中间文件，每一个中间文件都是排序号的。
- 不断的重复直到只剩下一个中间文件，这个就是最终的排序结果

在所有的out of core算法中，最优先优化的是phase的数量，一个phase里面需要写入N个page和写出N个page。  
硬盘IO是最慢的，所以要优先减少phase的数量。   
out of core还可以推广到其他的外部储存设备，例如sort网络上的数据，网络IO也是很慢，需要尽量减少。  

### MVP(minimal viable product)
首先实现一个简化版并且没有优化的out of core sorting算法  
定义一个Sorter作为总调度，记录所有的中间文件和处理各个phase。  
```
pub struct Sorter {
    filename: String,
    max_mem_size: u64,
    used_mem_size: u64,
    mem: Vec<String>,
    intermediate_filenames: Vec<String>,
}

impl Sorter {
  
    pub fn new(filename: String, max_mem_size: u64) -> Self {
        Sorter {
            filename,
            max_mem_size,
            used_mem_size: 0,
            intermediate_filenames: Vec::new(),
            mem: Vec::new(),
        }
    }
    
    fn process_init_phase(&mut self) {
        // TODO
    }

    fn process_phase(&mut self) {
        // TODO
    }
  
}
```
