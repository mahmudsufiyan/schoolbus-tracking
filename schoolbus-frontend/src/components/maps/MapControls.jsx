import React from 'react';
import { useMap } from 'react-leaflet';
import { Button } from '../common';

const MapControls = () => {
    const map = useMap();

    const handleZoomIn = () => {
        map.zoomIn();
    };

    const handleZoomOut = () => {
        map.zoomOut();
    };

    const handleLocate = () => {
        map.locate({ setView: true, maxZoom: 16 });
    };

    const handleReset = () => {
        map.setView([9.0320, 38.7469], 13); // Default - sub-city keessan bakka isaatti jijjiiru
    };

    return (
        <div className="absolute bottom-20 right-4 z-10 flex flex-col gap-1">
            {/* Zoom In */}
            <Button
                onClick={handleZoomIn}
                variant="secondary"
                size="sm"
                className="!p-2 !rounded-full shadow-lg bg-white hover:bg-gray-100 text-gray-700 w-10 h-10"
            >
                ➕
            </Button>

            {/* Zoom Out */}
            <Button
                onClick={handleZoomOut}
                variant="secondary"
                size="sm"
                className="!p-2 !rounded-full shadow-lg bg-white hover:bg-gray-100 text-gray-700 w-10 h-10"
            >
                ➖
            </Button>

            {/* Locate Me */}
            <Button
                onClick={handleLocate}
                variant="secondary"
                size="sm"
                className="!p-2 !rounded-full shadow-lg bg-white hover:bg-gray-100 text-gray-700 w-10 h-10"
            >
                📍
            </Button>

            {/* Reset */}
            <Button
                onClick={handleReset}
                variant="secondary"
                size="sm"
                className="!p-2 !rounded-full shadow-lg bg-white hover:bg-gray-100 text-gray-700 w-10 h-10"
            >
                🏠
            </Button>
        </div>
    );
};

export default MapControls;