import { useState, useEffect } from 'react';

interface Location {
    lat: number;
    lon: number;
}

interface GeolocationState {
    location: Location | null;
    error: string | null;
    loading: boolean;
}

export const useGeolocation = () => {
    const [state, setState] = useState<GeolocationState>({
        location: null,
        error: null,
        loading: true,
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setState(s => ({ ...s, loading: false, error: 'Geolocation not supported' }));
            return;
        }

        const success = (position: GeolocationPosition) => {
            setState({
                location: {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                },
                error: null,
                loading: false,
            });
        };

        const error = (err: GeolocationPositionError) => {
            setState(s => ({ ...s, loading: false, error: err.message }));
        };

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        };

        // Get current position first for fast load
        navigator.geolocation.getCurrentPosition(success, error, options);

        // Then watch
        const watchId = navigator.geolocation.watchPosition(success, error, options);

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return state;
};
