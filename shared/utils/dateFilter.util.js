
export function resolveDateRange(range, customStartDate = null, customEndDate = null) {
    const now = new Date();

    switch (range) {
        case 'ThisMonth': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            return { start, end: now };
        }
        case 'LastMonth': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // last day of previous month
            return { start, end };
        }
        case 'Last6Months': {
            const start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 0, 0, 0);
            return { start, end: now };
        }
        case 'CurrentYear': {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            return { start, end: now };
        }
        case 'Custom': {
            if (!customStartDate || !customEndDate) {
                const error = new Error('Custom range requires both a start and end date');
                error.statusCode = 400;
                throw error;
            }
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        default: {
            const error = new Error(`Unknown date range: ${range}`);
            error.statusCode = 400;
            throw error;
        }
    }
}