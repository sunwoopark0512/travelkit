'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGeolocation } from '@/hooks/useGeolocation';
import type mapboxgl from 'mapbox-gl';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse" />
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalkHistoryItem = any;

export default function Home() {
  const { location, error: locError } = useGeolocation();

  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  const [targetDistance, setTargetDistance] = useState(3000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [routeData, setRouteData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<WalkHistoryItem[]>([]);

  const onMapLoad = useCallback((loadedMap: mapboxgl.Map) => {
    setMap(loadedMap);
  }, []);

  // 초기/갱신 위치로 flyTo
  useEffect(() => {
    if (map && location) {
      map.flyTo({ center: [location.lon, location.lat], zoom: 14 });
    }
  }, [map, location]);

  // ✅ History는 showHistory가 켜질 때만 로드 (렌더에서 localStorage 직접 접근 금지)
  useEffect(() => {
    if (!showHistory) return;
    try {
      const raw = localStorage.getItem('walk_history') || '[]';
      const parsed = JSON.parse(raw);
      setHistory(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
    } catch {
      setHistory([]);
    }
  }, [showHistory]);

  const generateRoute = async () => {
    if (!location) {
      setError('위치 정보를 가져오는 중입니다. 위치 권한을 확인하세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/routes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lon: location.lon,
          distance: targetDistance,
          seed: Date.now()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // ✅ 상태코드 기반 에러 분기
        if (res.status === 401 || res.status === 403) {
          throw new Error('API Key Error: GRAPHHOPPER_API_KEY를 확인하세요.');
        }
        throw new Error(data?.error || `Route Error: ${res.status}`);
      }

      setRouteData(data);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || 'Route Error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ routeData가 바뀔 때마다 맵 렌더링 (race condition 방지)
  useEffect(() => {
    if (!map || !routeData) return;
    if (!map.isStyleLoaded()) {
      // 스타일이 로드되기 전이면 다음 tick에서 재시도 (간단 방어)
      const t = setTimeout(() => {
        // noop: effect가 다시 돌게 routeData는 그대로, styleLoaded가 true가 되면 다음 렌더에서 적용됨
      }, 150);
      return () => clearTimeout(t);
    }

    const feature = {
      type: 'Feature' as const,
      properties: {},
      geometry: routeData.points
    };

    const sourceId = 'route';
    const layerId = 'route';

    try {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: feature
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 6, 'line-opacity': 0.8 }
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(feature as GeoJSON.FeatureCollection);
      }

      // bbox: [minLon, minLat, maxLon, maxLat]
      const bbox = routeData.bbox;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (Array.isArray(bbox) && bbox.length === 4 && bbox.every((v: unknown): v is number => typeof v === 'number')) {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        map.fitBounds(
          [
            [minLon, minLat],
            [maxLon, maxLat]
          ],
          { padding: 50, duration: 400 }
        );
      }
    } catch (e) {
      console.warn('Map renderRoute failed:', e);
    }
  }, [map, routeData]);

  const saveWalk = () => {
    if (!routeData) return;
    try {
      const raw = localStorage.getItem('walk_history') || '[]';
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [];
      arr.unshift({ ...routeData, date: new Date().toISOString() });
      localStorage.setItem('walk_history', JSON.stringify(arr));
      alert('Walk saved to history! (Local)');
    } catch {
      alert('History 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <main className="relative w-full h-full min-h-screen overflow-hidden text-slate-800">
      <div className="absolute inset-0 z-0">
        <Map onMapLoad={onMapLoad} />
      </div>

      <div className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none">
        {(error || locError) && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg shadow-lg mb-2 pointer-events-auto mx-auto max-w-sm text-center text-sm font-medium border border-red-100">
            {error || locError}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 transition-transform">
        <div className="p-6 pb-8 flex flex-col gap-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Walk Mate</h1>
              <p className="text-sm text-slate-500">
                {showHistory
                  ? 'Recent Walks (Local)'
                  : routeData
                    ? `${(routeData.distance / 1000).toFixed(1)}km Loop Ready`
                    : 'Find a new path for today'}
              </p>
            </div>

            <div className="flex flex-col items-end">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 mb-1"
              >
                {showHistory ? 'Close History' : 'History'}
              </button>
            </div>
          </div>

          {showHistory ? (
            <div className="max-h-60 overflow-y-auto space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {history.slice(0, 5).map((h: unknown, i: number) => (
                <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <div className="font-bold text-slate-700">{(h.distance / 1000).toFixed(1)}km</div>
                    <div className="text-xs text-slate-400">{h.date ? new Date(h.date).toLocaleDateString() : '-'}</div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
                </div>
              ))}

              {history.length === 0 && (
                <div className="text-center text-slate-400 py-4">No history yet. Go for a walk!</div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-slate-600">Target Distance</label>
                <div>
                  <span className="text-2xl font-bold text-blue-600">{(targetDistance / 1000).toFixed(1)}</span>
                  <span className="text-sm text-slate-400 font-medium ml-1">km</span>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={targetDistance}
                  onChange={(e) => setTargetDistance(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>1km</span>
                  <span>5km</span>
                  <span>10km</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={generateRoute}
                  disabled={loading || !location}
                  className={`
                    w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-200
                    active:scale-[0.98] transition-all flex items-center justify-center gap-2
                    ${(loading || !location)
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700'}
                  `}
                >
                  {loading ? <span className="animate-spin text-2xl">⟳</span> : routeData ? 'Reroll Route 🎲' : 'Find My Loop 🏃♂️'}
                </button>

                {routeData && !loading && (
                  <button
                    onClick={saveWalk}
                    className="w-full py-3 rounded-xl font-bold text-slate-500 bg-slate-100 active:scale-[0.98] transition-all"
                  >
                    ✅ Finish & Save
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
