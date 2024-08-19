//首屏时间是指浏览器从响应用户输入网络地址，到首屏内容渲染完成的时间


import {MetricsResponse} from "../Types";
import {getRating} from "../utils";

// 评级范围
export const PLTThresholds: number[] = [3000, 6000];

class FSTTracker {
    private navigationStart: number;
    private firstScreenTime: number | null = null;
    private observer: MutationObserver;
    private imageLoadTimes: number[] = [];
    private stableDOMTimeout: number | null = null;
    private callback: (metric: MetricsResponse) => void;

    /**
     * FSTTracker 类的构造函数
     * @param callback - 事件回调函数
     */
    constructor(callback: (metric: MetricsResponse) => void) {
        this.callback = callback;
        this.navigationStart = performance.timing.navigationStart;
        this.observer = new MutationObserver(this.initDOMMutationObserver.bind(this));
        this.startDOMMutationObserver();
        this.initImageLoadListener();
        this.initDOMMutationObserver();
    }


    //开始监听
    private startDOMMutationObserver(): void {
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * 初始化图像加载监听器
     */
    private initImageLoadListener(): void {
        const images = document.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
            images[i].addEventListener('load', this.recordImageLoadTime.bind(this), {once: true});
            images[i].addEventListener('error', this.recordImageLoadTime.bind(this), {once: true});
        }

        if (images.length === 0) {
            this.initDOMMutationObserver();
        }
    }

    /**
     * 记录图像加载完成时间
     * @param event 事件对象
     */
    private recordImageLoadTime(event: Event): void {
        this.imageLoadTimes.push(performance.now());
        if (this.imageLoadTimes.length === document.getElementsByTagName('img').length) {
            this.calculateFSTWithImages();
        }
    }

    /**
     * 初始化 DOM 变动观察器
     */
    private initDOMMutationObserver(): void {
        if (this.stableDOMTimeout) {
            clearTimeout(this.stableDOMTimeout);
        }
        this.stableDOMTimeout = window.setTimeout(() => {
            this.recordStableDOMTime();
        }, 1000); // 假设 1 秒内没有 DOM 变化即为稳定状态

    }

    /**
     * 记录稳定状态的时间
     */
    private recordStableDOMTime(): void {
        this.firstScreenTime = performance.now() - this.navigationStart;
        console.log('First Screen Time (FST) without images:', this.firstScreenTime, 'ms');
        this.observer.disconnect();
    }

    /**
     * 计算包含图片的 FST
     */
    private calculateFSTWithImages(): void {
        if (this.imageLoadTimes.length > 0) {
            this.firstScreenTime = Math.max(...this.imageLoadTimes) - this.navigationStart;
            this.callback({
                id: new Date().getTime().toString(),
                name: 'FST',
                value: this.firstScreenTime,
                rating: getRating(this.firstScreenTime, PLTThresholds),
            });
            this.observer.disconnect();
        }
    }

    /**
     * 获取 FST 时间
     * @returns FST 时间
     */
    public getFSTTime(): number | null {
        return this.firstScreenTime;
    }
}

/**
 * 并返回指标值  支持promise 和 回调
 * @param callback
 */
export const onFst = (callback: (metric: MetricsResponse) => void): Promise<MetricsResponse | boolean> => {

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
        new FSTTracker(handler);
    })
}