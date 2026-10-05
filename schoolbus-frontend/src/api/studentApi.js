import apiClient from './axiosConfig';

// GET my children (Parent only)
export const getMyChildren = async () => {
    const response = await apiClient.get('/students/my-children');
    return response.data;
};

// GET all students (Admin only)
export const getAllStudents = async () => {
    const response = await apiClient.get('/students');
    return response.data;
};

// GET student by ID
export const getStudentById = async (id) => {
    const response = await apiClient.get(`/students/${id}`);
    return response.data;
};

// GET student QR code
export const getStudentQR = async (id) => {
    const response = await apiClient.get(`/students/${id}/qr`);
    return response.data;
};

// POST create student (Admin or Parent)
export const createStudent = async (studentData) => {
    const response = await apiClient.post('/students', studentData);
    return response.data;
};

// PUT update student (Admin or Parent)
export const updateStudent = async (id, studentData) => {
    const response = await apiClient.put(`/students/${id}`, studentData);
    return response.data;
};

// DELETE student (Admin only)
export const deleteStudent = async (id) => {
    const response = await apiClient.delete(`/students/${id}`);
    return response.data;
};

// POST scan student QR (Driver only)
export const scanStudentQR = async (id, otpToken) => {
    const response = await apiClient.post(`/students/${id}/scan`, { otpToken });
    return response.data;
};