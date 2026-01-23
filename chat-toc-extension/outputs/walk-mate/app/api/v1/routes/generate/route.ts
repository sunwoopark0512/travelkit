import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lat, lon, distance, seed } = body;

        if (!lat || !lon || !distance) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const apiKey = process.env.GRAPHHOPPER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // GraphHopper Round Trip API
        // Doc: https://docs.graphhopper.com/#operation/getRoute
        const params = new URLSearchParams({
            key: apiKey,
            profile: 'foot',
            'ch.disable': 'true',
            algorithm: 'round_trip',
            'round_trip.distance': distance.toString(),
            'round_trip.seed': (seed || Date.now()).toString(),
            points_encoded: 'false', // Get explicit coordinates for easy debugging/rendering
        });

        // We only need one point for round trip
        const url = `https://graphhopper.com/api/1/route?${params.toString()}&point=${lat},${lon}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.message) {
            return NextResponse.json({ error: data.message }, { status: response.status });
        }

        const path = data.paths[0];

        return NextResponse.json({
            route_id: `gh-${Date.now()}`,
            distance: path.distance,
            time: path.time,
            points: path.points, // GeoJSON-like { type: 'LineString', coordinates: [...] }
            bbox: path.bbox,
        });

    } catch (error) {
        console.error('Route generation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
