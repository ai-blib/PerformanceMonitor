export class LCPTracker {
    private lcp: number | null = null;
    private observer: PerformanceObserver;

    constructor() {
        this.observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
            this.lcp = lastEntry.startTime;
        });

        // Start observing the LCP entries
        this.observer.observe({type: 'largest-contentful-paint', buffered: true});

        // Stop observing and log LCP when the page is about to unload
        // window.addEventListener('beforeunload', () => this.stopTracking());
    }

    public stopTracking() {

            this.observer.disconnect();
            this.logLCP();

    }

    private logLCP() {
        if (this.lcp !== null) {
            console.log('参考值LCP:', this.lcp);
        } else {
            console.log('LCP not recorded.');
        }
    }
}

