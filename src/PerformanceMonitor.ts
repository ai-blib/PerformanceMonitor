



/**
 * 性能指标类型定义
 */
interface PerformanceMetrics {
    fcp?: number;
    fmp?: number;
    tti?: number;
    plt?: number;
    resources?: Array<ResourceTiming>;
    customMeasurement?: number;
}

enum PerformanceMetricType {
    FCP = 'fcp',
    FMP = 'fmp',
    TTI = 'tti',
    PLT = 'plt'
}





/**
 * 资源加载时间类型定义
 */
interface ResourceTiming {
    name: string;
    startTime: number;
    duration: number;
}

/**
 * 回调函数类型定义
 */
type CallbackFunction = (value: any) => void;

/**
 * PerformanceMonitor 类，用于收集和发送前端性能数据
 */
class PerformanceMonitor {
    private readonly performanceMetrics: PerformanceMetrics; // 存储性能指标
    private readonly callbacks: { [key: string]: CallbackFunction | null }; // 存储各指标的回调函数

    constructor() {
        this.performanceMetrics = {};
        this.callbacks = {
            fcp: null,
            fmp: null,
            tti: null,
            plt: null,
            resource: null,
            customMeasurement: null
        };
        this.init();
    }

    /**
     * 初始化性能监控
     */
    private init(): void {
        if (window.PerformanceObserver) {
            this.setupPerformanceObservers();
        } else {
            console.warn('PerformanceObserver 不支持性能监控，使用 fallback 方法代替');
            this.fallbackMethods();
        }
        this.monitorPageLoadTime();
        this.monitorCustomPerformance();
    }

    /**
     * 设置 PerformanceObserver 以监控各种性能指标
     */
    private setupPerformanceObservers(): void {
        this.observePaint('first-contentful-paint', PerformanceMetricType.FCP);
        this.observePaint('largest-contentful-paint', PerformanceMetricType.FMP);
        this.observePaint('longtask', PerformanceMetricType.TTI);

        // this.observeLongTasks(PerformanceMetricType.TTI);
        this.observeResources();
    }

    /**
     * 观察指定的性能绘制事件
     * @param {string} type - 性能绘制类型
     * @param {string} metric - 性能指标名称
     */
    private observePaint(type: string, metric: PerformanceMetricType): void {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            for (const entry of entries) {
                if (entry.name === type) {
                    this.performanceMetrics[metric] = entry.startTime;
                    // console.log(`${metric.toUpperCase()}: ${entry.startTime} ms`);
                    if (this.callbacks[metric]) {
                        this.callbacks[metric]!(entry.startTime);
                    }
                }
            }


        });
        observer.observe({type, buffered: true});
    }


    /**
     * 观察资源加载时间
     */
    private observeResources(): void {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                this.performanceMetrics.resources = this.performanceMetrics.resources || [];
                this.performanceMetrics.resources.push({
                    name: entry.name,
                    startTime: entry.startTime,
                    duration: entry.duration
                });
                if (this.callbacks.resource) {
                    this.callbacks.resource!({
                        name: entry.name,
                        startTime: entry.startTime,
                        duration: entry.duration
                    });
                }
            });
        });
        observer.observe({type: 'resource', buffered: true});
    }

    /**
     * 监控页面加载时间 (PLT)
     */
    private monitorPageLoadTime(): void {
        window.addEventListener('load', () => {
            const timing = window.performance.timing;
            const plt = timing.loadEventEnd - timing.navigationStart;
            this.performanceMetrics.plt = plt;
            // console.log(`Page Load Time (PLT): ${plt} ms`);
            if (this.callbacks.plt) {
                this.callbacks.plt!(plt);
            }
        });
    }

    /**
     * 自定义性能测量（示例）
     */
    private monitorCustomPerformance(): void {
        window.addEventListener('load', () => {
            const start = performance.now();
            // 模拟一些操作
            for (let i = 0; i < 1000000; i++) {
            }
            const end = performance.now();
            const duration = end - start;
            this.performanceMetrics.customMeasurement = duration;
            // console.log(`Custom Performance Measurement: ${duration} ms`);
            if (this.callbacks.customMeasurement) {
                this.callbacks.customMeasurement!(duration);
            }
        });
    }

    /**
     * 备用方案：使用 performance.timing 进行性能监控
     */
    private fallbackMethods(): void {
        window.addEventListener('load', () => {
            const timing = window.performance.timing;
            // 模拟获取 FCP 和 FMP，实际上需要使用 polyfill 或更复杂的逻辑来准确测量
            const fcp = timing.domContentLoadedEventEnd - timing.navigationStart;
            const fmp = timing.domInteractive - timing.navigationStart;

            if (fcp) {
                this.performanceMetrics.fcp = fcp;
                // console.log(`Fallback FCP: ${fcp} ms`);
                if (this.callbacks.fcp) {
                    this.callbacks.fcp(fcp);
                }
            }

            if (fmp) {
                this.performanceMetrics.fmp = fmp;
                // console.log(`Fallback FMP: ${fmp.ts} ms`);
                if (this.callbacks.fmp) {
                    this.callbacks.fmp(fmp);
                }
            }
        });
    }

    /**
     * 设置回调函数
     * @param {string} metric - 性能指标名称
     * @param {function} callback - 回调函数
     */
    public setCallback(metric: keyof PerformanceMetrics, callback: CallbackFunction): void {
        if (this.callbacks.hasOwnProperty(metric)) {
            this.callbacks[metric] = callback;
        } else {
            console.warn(`Unknown metric: ${metric}`);
        }
    }

}

