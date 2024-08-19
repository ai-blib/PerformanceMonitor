import {MetricType} from "web-vitals/src/types";


//计算性能指标的评级
export const getRating = (
    value: number,
    thresholds: number[], //评级范围
): MetricType['rating'] => {
    if (value > thresholds[1]) {
        return 'poor';
    }
    if (value > thresholds[0]) {
        return 'needs-improvement';
    }
    return 'good';
};

// 获取当前样式
export const getStyle=(element: Element, att: string)=> {
    // 优先使用 W3C 规范，如果不支持则回退到 IE 特定的 currentStyle
    // @ts-ignore
    const style = window.getComputedStyle ? window.getComputedStyle(element): element.currentStyle;
    // 如果使用了 currentStyle，则非空断言 `!` 确保类型安全
    return style ? style[att as any] : "";
}



