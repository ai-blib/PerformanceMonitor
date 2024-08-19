/**
 * FCP:（First Contentful Paint）是指浏览器从用户开始加载页面到首次渲染出有实质性内容（如文字、图片、canvas、SVG等）的时间
 * LCP 最大内容绘制 (LCP) 指标会根据页面首次开始加载的时间点来报告可视区域内可见的最大图像或者文本块完成渲染的相对时间。
 * FID 测量从用户第一次与页面交互（例如当他们单击链接、点按按钮或使用由 JavaScript 驱动的自定义控件）直到浏览器对交互作出响应，并实际能够开始处理事件处理程序所经过的时间。
 * TTFB:（Time to First Byte）是指浏览器从用户开始加载页面到接收到第一个字节的时间。
 * FMP（First Meaningful Paint），即首次绘制有意义内容的时间，
 */
import {onLCP} from 'web-vitals';

import {onFMP} from './Tracker/FMPTracker';
import {onFCP} from './Tracker/FCPTracker';
import {onTTI} from './Tracker/TTITracker';

import {onPLT} from './Tracker/PLTTracker';
import {LCPTracker} from './Tracker/LCPTracker'
import {onResourceLoad} from './Tracker/ResourceTracker';


/**
 * Promise.all() 方法返回一个 Promise，
 * 只有当所有 Promise 都成功时才成功，
 * 只要有一个失败，就直接失败。
 */

(() => {
    let lcpTracker = new LCPTracker()
    onResourceLoad().then((res) => {
        console.log(`资源加载`, res)
    })
    Promise.all([onFMP(), onFCP(), onTTI(), onPLT(),onResourceLoad()]).then((res) => {
        let obj = res.reduce((acc, cur) => {
            if (cur instanceof Array){
                // @ts-ignore
                acc['资源'] = cur
                return acc
            }
            // @ts-ignore
            acc[cur.name] = cur.value
            return acc
        }, {})
        console.log(`指标`, obj)
        lcpTracker.stopTracking()


    })
})()


