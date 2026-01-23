'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
}

const Map: React.FC<MapProps> = ({ onMapLoad }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapCallback = useRef(onMapLoad);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mapCallback.current = onMapLoad;
  }, [onMapLoad]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // ✅ 토큰 없으면 지도 생성 자체를 중단 + 안내 오버레이
    if (!token || token.includes('YOUR_MAPBOX_TOKEN')) {
      setError('Mapbox Token이 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_MAPBOX_TOKEN을 설정하세요.');
      return;
    }

    // ✅ container 없거나 이미 생성됐으면 종료
    if (!mapContainer.current) return;
    if (mapInstance.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [126.9780, 37.5665],
      zoom: 13,
      attributionControl: false
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    // (선택) 내장 위치 추적 UI
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      })
    );

    map.on('error', (e) => {
      // ✅ 토큰이 잘못된 경우도 여기서 잡히는 경우가 있음
      console.warn('Mapbox error', e?.error);
    });

    map.on('load', () => {
      mapInstance.current = map;
      mapCallback.current?.(map);
    });

    return () => {
      try {
        mapInstance.current?.remove();
      } catch {
        // ignore
      } finally {
        mapInstance.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 text-white p-6 text-center">
        <h3 className="text-xl font-bold text-red-400 mb-2">Configuration Required</h3>
        <p className="mb-4 text-slate-300">{error}</p>
        <div className="bg-slate-800 p-3 rounded text-xs text-left font-mono text-slate-300">
          NEXT_PUBLIC_MAPBOX_TOKEN=pk...
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full absolute top-0 left-0" />;
};

export default Map;
