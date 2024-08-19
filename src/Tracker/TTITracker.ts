//计算规则:
// 从起始点（一般选择 FCP 或 FMP）时间开始，向前搜索一个不小于 5s 的静默窗口期。静默窗口期：窗口所对应的时间内没有 Long Task，且进行中的网络请求数不超过 2 个。
// 找到静默窗口期后，从静默窗口期向后搜索到最近的一个 Long Task，Long Task 的结束时间即为 TTI。
// 如果没有找到 Long Task，以起始点时间作为 TTI。
// 如果 2、3 步骤得到的 TTI < DOMContentLoadedEventEnd，以 DOMContentLoadedEventEnd 作为TTI。

// 良好 - 无需处理 = TTI 小于或等于 2.5 秒。
// 可以接受，但考虑改进 = TTI 在 2.5 秒到 3.2 秒之间。
// 超出推荐时间 = TTI 在 3.2 秒到 4.5 秒之间。
// 远远超出推荐时间 = TTI 高于 4.5 秒。
import {MetricsResponse} from "../Types";
import {onFCP} from './FCPTracker';
import {getRating} from "../utils";

export const TTIThresholds: number[] = [2500, 3200];

const QuietWindowDuration = 5000; // 静默窗口持续时间

class TTITracker {
    private fcpTime: number | null = null;
    private fmpTime: number | null = null;
    private ttiTime: number | null = null;
    private longTasks: PerformanceEntry[] = [];
    private networkRequests: PerformanceEntry[] = [];
    private observer: PerformanceObserver | undefined;
    private callback: (metric: MetricsResponse) => void;

    constructor(callback: (metric: MetricsResponse) => void) {
        this.callback = callback;
        this.initPerformanceObserver();
        this.addLoadEventListener();
    }

    /**
     * 初始化 PerformanceObserver 以监听长任务和网络请求
     */
    private initPerformanceObserver(): void {
        this.observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'longtask') {
                    this.longTasks.push(entry);
                } else if (entry.entryType === 'resource') {
                    this.networkRequests.push(entry);
                }
            });
        });
        this.observer.observe({entryTypes: ['longtask', 'resource']});
    }

    /**
     * 添加页面加载完成的事件监听器
     */
    private addLoadEventListener(): void {
        console.log('load')
        window.addEventListener('load', () => {

            setTimeout(() => {
                this.calculateTTI()
            }, 8000)
        });
    }

    /**
     * 计算 TTI
     */
    private calculateTTI(): void {
        this.observer?.disconnect();

        // 使用 FMP 作为起始点，如果没有 FMP，则使用 FCP
        const startTime = this.fmpTime || this.fcpTime;

        if (!startTime) {
            console.warn('没有FMP或者FCP，无法计算TTI');
            return;
        }

        const quietWindow = this.findQuietWindow(startTime, QuietWindowDuration);
        if (!quietWindow) {
            console.log('没有静默窗口期');
            this.ttiTime = startTime;
        } else {
            const lastLongTask = this.findLastLongTaskBefore(quietWindow.end);
            console.log('静默窗口期：', lastLongTask)
            // @ts-ignore
            this.ttiTime = lastLongTask ? lastLongTask?.duration + lastLongTask?.startTime  : (startTime);
        }
        //


        /**
         * timing.navigationStart :浏览器处理当前网页的启动时间
         * domContentLoadedEventEnd:返回当前网页所有需要执行的脚本执行完成时的Unix毫秒时间戳
         */
        const timing = window.performance.timing;
        const domContentLoadedEventEnd = timing.domContentLoadedEventEnd - timing.navigationStart;

        if (Number(this.ttiTime) < domContentLoadedEventEnd) {
            this.ttiTime = domContentLoadedEventEnd;
        }

        if (!this.ttiTime) return console.warn('没有TTI');
        this.callback({
            id: new Date().getTime().toString(),
            name: 'TTI',
            value: this.ttiTime,
            rating: getRating(this.ttiTime, TTIThresholds),
        })
    }

    /**
     * 查找从指定时间开始的静默窗口期
     * @param startTime 开始时间
     * @param duration 静默窗口期持续时间（毫秒）
     * @returns 静默窗口期的起始和结束时间
     */
    private findQuietWindow(startTime: number, duration: number): { start: number; end: number } | null {
        for (let time = startTime; time < performance.now() - duration; time += 50) {
            const endTime = time + duration;
            const longTaskDuringWindow = this.longTasks.find(task => task.startTime < endTime && task.startTime >= time);
            // @ts-ignore
            const activeNetworkRequests = this.networkRequests.filter(request => request.startTime < endTime && request.responseEnd > time);

            if (!longTaskDuringWindow && activeNetworkRequests.length <= 2) {
                return {start: time, end: endTime};
            }
        }
        return null;
    }

    /**
     * 查找静默窗口期前最近的一个长任务
     * @param endTime 静默窗口期的结束时间
     * @returns 最近的一个长任务
     */
    private findLastLongTaskBefore(endTime: number): PerformanceEntry | null {
        for (let i = this.longTasks.length - 1; i >= 0; i--) {
            if (this.longTasks[i].startTime < endTime) {
                return this.longTasks[i];
            }
        }
        return null;
    }

    /**
     * 设置 FCP 时间
     * @param time FCP 时间
     */
    public setFCPTime(time: number): void {
        this.fcpTime = time;
    }


}


/**
 * 并返回指标值  支持promise 和 回调
 * @param callback
 */
export const onTTI = (callback?: (metric: MetricsResponse) => void): Promise<MetricsResponse | boolean> => {
    if (!window.performance) {
        console.warn('performance is not supported in this browser.')
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const handler = (response: MetricsResponse) => {
            resolve(response);
            callback && callback(response);
        }
        // 获得FCP 的回调值，运行TTI的任务
        onFCP((metric) => {
            new TTITracker(handler).setFCPTime(metric.value)
        });
    })
}