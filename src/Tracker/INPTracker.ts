import {onINP as INP} from 'web-vitals';
import {MetricsResponse} from "../Types";


/**
 * INP:与下一次绘制的交互INP（Interaction to Next Paint） 会在页面生命周期内观察用户与网页进行的所有点击、点按和键盘互动的延迟时间，并报告最长持续时间。INP 较低意味着页面始终能够快速响应大多数用户互动
 *
 * 为确保提供良好的响应速度的用户体验，建议衡量的是实际记录的网页加载的第 75 个百分位：
 *
 * INP 等于或小于 200 毫秒表示您的网页具有良好的响应速度。
 * 如果 INP 介于 200 毫秒到 500 毫秒之间，则意味着您网页的响应能力需要改进。
 * INP 大于 500 毫秒表示网页响应速度慢
 */


/**
 * FCPTracker 类用于跟踪 First Contentful Paint (FCP) 性能指标。
 * 它初始化时需要一个回调函数，当 FCP 事件发生时，这个回调函数会被调用。
 */
class INPTracker {
    private readonly callback: (metric: MetricsResponse) => void;

    /**
     * 构造函数初始化 FCPTracker 实例。
     * @param callback 当 FCP 事件发生时调用的回调函数，接收 FCP 指标作为参数。
     */
    constructor(callback: (metric: MetricsResponse) => void) {
        this.callback = callback;
        this.startTracking();
    }

    /**
     * 开始跟踪 FCP 事件。
     * 通过调用 `FCP` 函数来设置监听器，当 FCP 事件发生时，回调函数会被调用。
     */
    private startTracking(): void {
        // 监听 FCP 事件
        INP((metric) => {
            this.callback({
                id: metric.id,
                name: metric.name,
                rating: metric.rating,
                value: metric.value
            })
        })
    }
}


/**
 * 并返回指标值  支持promise 和 回调
 * @param callback
 */
export const onINP = (callback?: (metric: MetricsResponse) => void): Promise<MetricsResponse | boolean> => {


    if (!window.PerformanceObserver) {
        console.warn('PerformanceObserver is not supported in this browser.')
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const handler = (response: MetricsResponse) => {
            resolve(response);
            callback && callback(response);
        }
        // 实例化FMPTracker
        new INPTracker(handler);
    })
}
