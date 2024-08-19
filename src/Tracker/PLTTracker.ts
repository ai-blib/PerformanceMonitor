//前端性能指标 PLT（Page Load Time）通常指的是页面完全加载所花费的时间，从导航开始到 load 事件触发的时间


import {MetricsResponse} from "../Types";
import {getRating} from "../utils";

// 评级范围
export const PLTThresholds: number[] = [3000, 6000];

class PLTTracker {
    private navigationStart: number;
    private loadEventEnd: number | null = null;
    private readonly callback: (metric: MetricsResponse) => void;

    constructor(callback: (metric: MetricsResponse) => void) {
        this.callback = callback;
        this.navigationStart = performance.timing.navigationStart;
        this.addLoadEventListener();
    }

    /**
     * 添加页面加载完成的事件监听器
     */
    private addLoadEventListener(): void {
        window.addEventListener('load', ()=>{
            setTimeout(()=>{
                this.calculatePLT()
            },5000)
        });
    }

    /**
     * 计算 PLT
     */
    private calculatePLT(): void {
        this.loadEventEnd = performance.timing.loadEventEnd;
        const plt = this.loadEventEnd - this.navigationStart;
        this.callback({
            id: new Date().getTime().toString(),
            name: 'PLT',
            value: plt,
            rating: getRating(plt, PLTThresholds),
        });
    }

}

/**
 * 并返回指标值  支持promise 和 回调
 * @param callback
 */
export const onPLT = (callback?: (metric: MetricsResponse) => void): Promise<MetricsResponse | boolean> => {


    if (!window.performance) {
        console.warn('performance is not supported in this browser.')
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const handler = (response: MetricsResponse) => {
            resolve(response);
            callback && callback(response);
        }
        // 实例化FMPTracker
        new PLTTracker(handler);
    })
}