import { useEffect, useRef } from 'react';

const useWebSocket = (userId) => {
    const ws = useRef(null);

    useEffect(() => {
        if (!userId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use the same host as the current window, but point to port 8000 (backend)
        // In production, this might need to be adjusted based on the backend URL
        const backendHost = process.env.REACT_APP_BACKEND_URL
            ? process.env.REACT_APP_BACKEND_URL.replace(/^https?:\/\//, '')
            : 'localhost:8000';

        const socketUrl = `${protocol}//${backendHost}/api/ws/${userId}`;

        const connect = () => {
            ws.current = new WebSocket(socketUrl);

            ws.current.onopen = () => {
                console.log('[WS] Connected to online status tracking');
            };

            ws.current.onclose = () => {
                console.log('[WS] Disconnected from online status tracking. Retrying in 5s...');
                setTimeout(connect, 5000);
            };

            ws.current.onerror = (err) => {
                console.error('[WS] WebSocket error:', err);
                ws.current.close();
            };
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.onclose = null; // Prevent reconnect on unmount
                ws.current.close();
            }
        };
    }, [userId]);

    return ws.current;
};

export default useWebSocket;
