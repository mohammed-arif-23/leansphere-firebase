import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, properties } = body;

    if (!event) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    // Get IP address from headers (NextRequest doesn't have ip property)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = (forwarded?.split(',')[0] || realIp) ?? 'unknown';

    // Log analytics event (in production, you'd send to your analytics service)
    console.log('Analytics Event:', {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip,
      }
    });

    // Here you would typically send to your analytics service:
    // - Google Analytics 4
    // - Mixpanel
    // - Amplitude
    // - PostHog
    // etc.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}
