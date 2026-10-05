// Email sirriidhaa mirkaneeffachuu
export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Foon bilbilaa 10 lakkoofsaa qofa qabaachuu mirkaneeffachuu (Akka biyyaatti jijjiiru)
export const validatePhone = (phone) => {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
};

// Password 6 ol ta'uu mirkaneeffachuu
export const validatePassword = (password) => {
    return password.length >= 6;
};

// Maqaa (Name) qullaa (empty) hin ta'uu mirkaneeffachuu
export const validateName = (name) => {
    return name.trim().length > 0;
};