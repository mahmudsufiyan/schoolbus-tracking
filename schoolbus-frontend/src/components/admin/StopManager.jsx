import React, { useState, useEffect } from 'react';
import { getAllStops, createStop, deleteStop } from '../../api/stopApi';
import { getAllBuses } from '../../api/busApi';
import { Button, Input, Modal, Spinner } from '../common';

const StopManager = () => {
    const [stops, setStops] = useState([]);
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        stop_name: '',
        stop_order: '',
        latitude: '',
        longitude: '',
        bus_id: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stopsData, busesData] = await Promise.all([
                getAllStops(),
                getAllBuses(),
            ]);
            setStops(stopsData || []);
            setBuses(busesData || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Buufata argachuun hin dandaame');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const newStop = {
                stop_name: formData.stop_name,
                stop_order: parseInt(formData.stop_order),
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                bus_id: parseInt(formData.bus_id) || null,
            };
            await createStop(newStop);
            setIsModalOpen(false);
            setFormData({ stop_name: '', stop_order: '', latitude: '', longitude: '', bus_id: '' });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Galchuun hin dandaame');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (stopId) => {
        if (window.confirm('Sanyii! Buufata kana haquu barbaaddaa?')) {
            try {
                await deleteStop(stopId);
                fetchData();
            } catch (err) {
                alert('Haquun hin dandaame');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Spinner size="lg" color="blue" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-700">🚏 Buufata (Stops)</h3>
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                    ➕ Haaraa
                </Button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {stops.length === 0 ? (
                    <p className="text-gray-400 text-sm">Buufata hin jiru</p>
                ) : (
                    stops
                        .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0))
                        .map((stop) => (
                            <div
                                key={stop.id}
                                className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {stop.stop_order}. {stop.stop_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        📍 {stop.latitude}, {stop.longitude}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                        Bus: {stop.bus_id || '--'}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(stop.id)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Modal Haaraa */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="➕ Buufata Haaraa Galchuu"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Maqaa Buufataa"
                            name="stop_name"
                            value={formData.stop_name}
                            onChange={(e) => setFormData({ ...formData, stop_name: e.target.value })}
                            placeholder="Megenagna"
                            required
                        />
                        <Input
                            label="Jarjara (Order)"
                            name="stop_order"
                            type="number"
                            value={formData.stop_order}
                            onChange={(e) => setFormData({ ...formData, stop_order: e.target.value })}
                            placeholder="1, 2, 3..."
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Latitude"
                            name="latitude"
                            type="number"
                            step="0.000001"
                            value={formData.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                            placeholder="9.0320"
                            required
                        />
                        <Input
                            label="Longitude"
                            name="longitude"
                            type="number"
                            step="0.000001"
                            value={formData.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                            placeholder="38.7469"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-1">
                            Otobiisii filadhu
                        </label>
                        <select
                            name="bus_id"
                            value={formData.bus_id}
                            onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Otobiisii hin filanne</option>
                            {buses.map((bus) => (
                                <option key={bus.id} value={bus.id}>
                                    {bus.plate_number} {bus.driver ? `(${bus.driver.full_name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    {error && <p className="text-red-500 text-sm">❌ {error}</p>}
                    <div className="flex gap-2">
                        <Button type="submit" variant="success" loading={submitting} fullWidth>
                            ✅ Galchuu
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            ✕ Cufuu
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StopManager;