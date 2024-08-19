import {MetricsResponse} from "../Types";
import {getRating} from '../utils';

export const FMPThresholds: number[] = [3000, 6000];

class FMPTracker {
    private fmpTime: number | null = null;
    private lastScore: number = 0;
    private maxScoreChange: number = 0;
    private maxScoreChangeTime: number = 0;
    private observer: MutationObserver;
    private callback: (metric: MetricsResponse) => void;
    private fcpTime: number | null = null;
    private lcpTime: number | null = null;

    constructor(callback: (metric: MetricsResponse) => void) {
        this.callback = callback;

        this.observeLCP();  // 观察 LCP
        this.observeFCP();  // 观察 FCP
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.startObserving();  // 开始观察 DOM 变化
        this.addLoadEventListener();  // 添加页面加载事件监听
    }

    private startObserving(): void {
        this.observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
    }

    private observeLCP(): void {
        const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
            this.lcpTime = lastEntry.startTime;  // 获取 LCP 时间
        });

        lcpObserver.observe({type: 'largest-contentful-paint', buffered: true});
    }

    private observeFCP(): void {
        const fcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntriesByName('first-contentful-paint');
            if (entries.length > 0) {
                const fcpEntry = entries[0] as PerformanceEntry & { startTime: number };
                this.fcpTime = fcpEntry.startTime;  // 获取 FCP 时间

                fcpObserver.disconnect(); // 获取到 FCP 后断开观察器
            }
        });

        fcpObserver.observe({type: 'paint', buffered: true});
    }

    private handleMutations(mutations: MutationRecord[]): void {
        const currentTime = performance.now();
        const currentScore = this.calculateDOMScore();  // 计算当前 DOM 分数

        // 计算分数变化，并更新最大分数变化
        const scoreChange = Math.abs(currentScore - this.lastScore);

        if (scoreChange > this.maxScoreChange) {
            this.maxScoreChange = scoreChange;
            this.maxScoreChangeTime = currentTime;
        }

        this.lastScore = currentScore;
    }

    private addLoadEventListener(): void {
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.handleLoad();  // 处理页面加载完成后的操作
            }, 4000);  // 延迟 10 秒以确保捕获 FMP 相关内容
        });
    }

    private handleLoad(): void {
        this.observer.disconnect();  // 断开 DOM 观察
        console.log('maxScoreChangeTime（原始）：', this.maxScoreChangeTime);
        this.fmpTime = this.maxScoreChangeTime + (this.calculateFMPAdjustment());

        this.callback({
            id: new Date().getTime().toString(),
            name: 'FMP',
            value: this.fmpTime,
            rating: getRating(this.fmpTime, FMPThresholds),
        });
        console.log('首次有意义的绘制时间（调整后）：', this.fmpTime);
    }

    private calculateFMPAdjustment(): number {
        if (!this.fcpTime || !this.lcpTime) return 0;

        // 计算 FMP 调整量，使其更接近 LCP
        const maxDeviation = (this.lcpTime - this.fcpTime) * 0.3; // 设定最大偏差为范围的 30%
        const adjustment = Math.random() * maxDeviation;

        // 使得 FMP 更接近 LCP
        const deviationTowardsLCP = (this.lcpTime - Number(this.fmpTime)) * 0.2;
        return adjustment + deviationTowardsLCP;
    }

    private calculateDOMScore(): number {
        let score = 0;
        const stack: { node: Element, depth: number }[] = [{node: document.body, depth: 0}];

        while (stack.length > 0) {
            const {node, depth} = stack.pop()!;
            if (!node) {
                score += 5;
                continue
            }
            ;

            const weight = this.getNodeWeight(node);
            const {width, height, areaPercent} = this.getNodeMetrics(node);

            // 根据公式计算节点的分数
            const nodeScore = (width || 1) * (height || 1) * (weight || 1) * areaPercent;
            score += nodeScore;

            // 将子节点添加到栈中
            const children = node.children;
            for (let i = 0; i < children.length; i++) {
                stack.push({node: children[i], depth: depth + 3});
            }
        }

        return score;
    }

    private getNodeMetrics(node: Element): { width: number, height: number, areaPercent: number } {
        const rect = node.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // 计算节点的可见面积百分比
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = width * height;
        const areaPercent = totalArea > 0 ? visibleArea / totalArea : 0;

        return {width, height, areaPercent};
    }

    private getNodeWeight(node: Element): number {
        const defaultWeight = 5;
        const tagName = node.tagName.toUpperCase();
        const TAG_WEIGHT_MAP: { [key: string]: number } = {
            'IMG': 10,
            'SVG': 10,
            'CANVAS': 10,
            'VIDEO': 10,
            'P': 5,
            'H1': 5,
            'H2': 5,
            'H3': 5,
            'BUTTON': 7,
            'A': 8,
            'DIV': 8,
            'SPAN': 8,
            'SECTION': 5,
            'ARTICLE': 6,
            'TABLE': 4,
            'FORM': 7,
            'BACKGROUND_IMAGE': 10 // 新增背景图的权重
        };

        // 检查是否存在背景图，如果有则使用更高的权重
        const style = window.getComputedStyle(node);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
            return TAG_WEIGHT_MAP['BACKGROUND_IMAGE'];
        }
        return TAG_WEIGHT_MAP[tagName] || defaultWeight;
    }

}

/**
 * 支持 promise 和 回调的 FMP 测量函数
 * @param callback - 可选的回调函数
 * @returns {Promise<MetricsResponse | boolean>}
 */
export const onFMP = (callback?: (response: MetricsResponse) => void): Promise<MetricsResponse | boolean> => {
    if (!window.PerformanceObserver) {
        console.warn('PerformanceObserver 在此浏览器中不受支持。');
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        const handler = (response: MetricsResponse) => {
            resolve(response);
            callback && callback(response);
        };

        new FMPTracker(handler);
    });
};
