import { MetricsResponse } from "../Types";
import { getRating } from "../utils";

// 评级范围（可以自定义）
export const ResourceLoadTimeThresholds: number[] = [1000, 3000, 5000];

// 资源类型枚举
type ResourceType = "img" | "script" | "stylesheet" | "fetch" | "xmlhttprequest" | "other";

class ResourceLoadTracker {
    private readonly callback: (metric: MetricsResponse[]) => void;

    constructor(callback: (metric: MetricsResponse[]) => void) {
        this.callback = callback;
        this.addLoadEventListener();
    }

    /**
     * 添加页面加载完成的事件监听器
     */
    private addLoadEventListener(): void {
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.trackResourceLoad();
            }, 5000); // 延迟5秒等待所有资源加载完毕
        });
    }

    /**
     * 监控资源加载时间并输出结果
     */
    private trackResourceLoad(): void {
        const resources = performance.getEntriesByType('resource');
        const resourceMetrics: MetricsResponse[] = resources.map(resource => {
            const loadTime = resource.responseEnd - resource.startTime;
            const resourceType: ResourceType = this.getResourceType(resource);

            return {
                id: resource.name,
                name: 'Resource Load Time',
                value: loadTime,
                rating: getRating(loadTime, ResourceLoadTimeThresholds),
                type: resourceType,
            };
        });

        // 按加载时间从大到小排序
        resourceMetrics.sort((a, b) => b.value - a.value);

        // 调用回调函数返回结果
        this.callback(resourceMetrics);
    }

    /**
     * 获取资源类型
     */
    private getResourceType(resource: PerformanceResourceTiming): ResourceType {
        const url = resource.name;
        if (resource.initiatorType) {
            return resource.initiatorType as ResourceType;
        }
        if (url.endsWith('.js')) {
            return "script";
        } else if (url.endsWith('.css')) {
            return "stylesheet";
        } else if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.webp')) {
            return "img";
        } else {
            return "other";
        }
    }
}

/**
 * 监控资源加载时间并返回指标值 支持 promise 和 回调
 * @param callback
 */
export const onResourceLoad = (callback?: (metric: MetricsResponse[]) => void): Promise<MetricsResponse[] | boolean> => {
    if (!window.performance) {
        console.warn('Performance API is not supported in this browser.');
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const handler = (response: MetricsResponse[]) => {
            resolve(response);
            callback && callback(response);
        };
        // 实例化 ResourceLoadTracker
        new ResourceLoadTracker(handler);
    });
};
