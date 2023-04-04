export const TOKEN_KEY = 'billabee_token';

export const getToken = () => {
    if (typeof window !== 'undefined') return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
};
