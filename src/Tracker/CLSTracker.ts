import {onFCP as CLS} from 'web-vitals';
import {MetricsResponse} from "../Types";

class CLSTracker {
    private readonly callback: (metric: MetricsResponse) => void;

    constructor(callback: (metric: MetricsResponse) => void) {
        this.callback = callback;
        this.startTracking();
    }

    private startTracking(): void {
        CLS((metric) => {
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
export const onCLS = (callback?: (metric: MetricsResponse) => void): Promise<MetricsResponse | boolean> => {

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
        new CLSTracker(handler);
    })
}