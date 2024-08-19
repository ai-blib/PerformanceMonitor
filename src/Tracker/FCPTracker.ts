import {onFCP as FCP} from 'web-vitals';
import {MetricsResponse} from "../Types";

/**
 * FCPTracker 类用于跟踪 First Contentful Paint (FCP) 性能指标。
 * 它初始化时需要一个回调函数，当 FCP 事件发生时，这个回调函数会被调用。
 */
class FCPTracker {
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
        FCP((metric) => {
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

export const onFCP = (callback?: (metric: MetricsResponse) => void): Promise<MetricsResponse | boolean> => {

    if (!window.PerformanceObserver) {
        console.warn('PerformanceObserver is not supported in this browser.')
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const handler = (response: MetricsResponse) => {
            resolve(response);
            // 回调结果
            callback && callback(response);
        }
        // 实例化FMPTracker
        new FCPTracker(handler);
    })


}
