/**
 * InsuranceAnalytics
 *
 * Structured event logging for insurance conversion tracking.
 * Currently logs to console. Can be wired to an analytics SDK later.
 */

export type InsuranceEvent =
    | 'offer_shown'
    | 'offer_declined'
    | 'offer_timeout'
    | 'purchase_started'
    | 'purchase_completed'
    | 'purchase_failed'
    | 'purchase_cancelled';

interface InsuranceEventData {
    event: InsuranceEvent;
    timestamp: number;
    metadata?: Record<string, string | number | boolean>;
}

export class InsuranceAnalytics {
    private static events: InsuranceEventData[] = [];

    static track(event: InsuranceEvent, metadata?: Record<string, string | number | boolean>): void {
        const data: InsuranceEventData = {
            event,
            timestamp: Date.now(),
            metadata,
        };
        InsuranceAnalytics.events.push(data);
        console.log(`[InsuranceAnalytics] ${event}`, metadata || '');
    }

    static getEvents(): InsuranceEventData[] {
        return [...InsuranceAnalytics.events];
    }

    static clearEvents(): void {
        InsuranceAnalytics.events = [];
    }
}
