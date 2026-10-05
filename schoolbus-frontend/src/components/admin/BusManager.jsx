import React, { useState, useEffect } from 'react';
import { getAllBuses, createBus } from '../../api/busApi';
import { Button, Input, Modal, Spinner } from '../common';

const BusManager = () => {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        plate_number: '',
        capacity: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Otobiisii hundaa argachuu
    const fetchBuses = async () => {
        setLoading(true);
        try {
            const data = await getAllBuses();
            setBuses(data || []);
        } catch (err) {
            console.error('Error fetching buses:', err);
            setError('Otobiisii argachuun hin dandaame');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuses();
    }, []);

    // Otobiisii haaraa galchuu
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const newBus = {
                plate_number: formData.plate_number,
                capacity: parseInt(formData.capacity) || 0,
            };
            await createBus(newBus);
            setIsModalOpen(false);
            setFormData({ plate_number: '', capacity: '' });
            fetchBuses(); // Refresh
        } catch (err) {
            setError(err.response?.data?.message || 'Galchuun hin dandaame');
        } finally {
            setSubmitting(false);
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
                <h3 className="text-lg font-semibold text-gray-700">🚌 Otobiisii (Buses)</h3>
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                    ➕ Haaraa
                </Button>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {buses.length === 0 ? (
                    <p className="text-gray-400 text-sm">Otobiisii hin jiru</p>
                ) : (
                    buses.map((bus) => (
                        <div
                            key={bus.id}
                            className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
                        >
                            <div>
                                <p className="font-semibold text-gray-800">{bus.plate_number}</p>
                                <p className="text-xs text-gray-500">
                                    Daraartuu: {bus.driver?.full_name || '--'} | 
                                    Ba'uu: {bus.capacity || '--'}
                                </p>
                            </div>
                            <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                    bus.driver_id ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}
                            >
                                {bus.driver_id ? '✅ Active' : '❌ Inactive'}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Haaraa */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="➕ Otobiisii Haaraa Galchuu"
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Plate Number (Lakkoofsa)"
                        name="plate_number"
                        value={formData.plate_number}
                        onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                        placeholder="AA-1234"
                        required
                    />
                    <Input
                        label="Ba'uu (Capacity)"
                        name="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="40"
                        required
                    />
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

export default BusManager;