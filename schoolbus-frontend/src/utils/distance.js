// Herrega fageenya lafaa (gidduu koordineetii lamaanii) meetiraan baasuu
export const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Rarii lafaa meetiraan (Radius of Earth)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Fageenya meetiraan
};

// Degree gara Radian jijjiiruu
const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};