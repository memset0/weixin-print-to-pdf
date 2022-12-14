# weixin-printer

一键把微信公众号文章打印出来的油猴脚本！支持敲多的自定义配置。

![](https://static.memset0.cn/img/v5/2022/10/04/633b16a0182db.png)

## 使用方法

**Step 1.**：安装 Tamper Monkey 或者 Script Cat (Recommended) 插件，作为油猴脚本的运行时支持。

**Step 2.**：打开 [Greasy Fork 中本项目的地址](https://greasyfork.org/zh-CN/scripts/452438-%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7-pdf-%E5%AF%BC%E5%87%BA%E8%84%9A%E6%9C%AC)，点击那个**大大的绿色的安装按钮**，在弹出的页面中点击确认。

**Step 3.**：打开一篇微信公众号文章，可以看到如下图位置出现了 `Print Content` 和 `Print Pictures`，分别对应两种打印模式，点击即可呼出浏览器自带的打印对话框，选择打印为 PDF 即可。

> 本插件的开发在 Edge 浏览器中进行，由于不同浏览器自带的 PDF 打印逻辑略有不同，可能存在潜在兼容性问题，建议使用 Edge 浏览器重试，或 [创建 Issue](https://github.com/memset0/weixin-print-to-pdf/issues/new) 以反馈问题。

## 打印模式一（Content）

这一模式用于打印一般公众号推文，文章内容将会被依次呈现。

如果你应用了 `filter` 或 `filterJS` 配置项，点击 `Preview Filters` 可以看到元素的选择情况，其中背景呈红色的元素不会出现在打印结果中。

如果需要控制分页逻辑，你可能需要使用 CSS 语法并将其添加到 `customCSS` 选项中。

## 打印模式二（Pictures）

这一模式将只打印图片，且每张图片会自动缩放到 A4 纸大小。主要用于以逐张单页截图为内容的公众号推文。

设置项中的 `filter` 和 `filterJS` 选项不会在此启用，如需筛选页面，请使用浏览器自带的页面选择器。

## 设置

|  配置项   |                                                            说明                                                            |
|:---------:|:--------------------------------------------------------------------------------------------------------------------------:|
|   width   |                                            页面宽度，默认为 797，对应 A4 纸宽度                                            |
|  height   |                                           页面高度，默认为 1123，对应 A4 纸高度                                            |
|  margin   |                        页边距，默认为 0，支持用空格分隔以分别设置四个方向的页边距，具体语法类似 CSS                        |
|   zoom    |                                                 缩放比例，默认为 1（100%）                                                 |
|  filter   |                 （仅 Content 模式）按行元素过滤器，使用类似于打印页面选择器的语法，允许自定义被打印的元素区间                  |
| filterJS  | （仅 Content 模式）JS 过滤器，将会提供 DOM Node 类型的 element，返回非零值表示删除；也支持通过这一功能对 DOM Tree 进行修改 |
| customCSS |                                           自定义 CSS 样式，将会被应用到打印页面                                            |
