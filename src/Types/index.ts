// 指标返回
export interface MetricsResponse {
    id: string;   // 标识
    name: string |"FCP"; // 指标名称
    rating: string; // 评级
    value: number; // 指标值
}