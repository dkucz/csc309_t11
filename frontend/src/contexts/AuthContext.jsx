import React, { createContext, useContext, useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';


const AuthContext = createContext(null);

// TODO: get the BACKEND_URL.

/*
 * This provider should export a `user` context state that is 
 * set (to non-null) when:
 *     1. a hard reload happens while a user is logged in.
 *     2. the user just logged in.
 * `user` should be set to null when:
 *     1. a hard reload happens when no users are logged in.
 *     2. the user just logged out.
 */
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const authFetch = (url, options = {}, token) => {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`
            }
        });
    }

    const ajax = (url, options) => {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers
            }
        });
    }

    const setTokenInStorage = (token) => {
        localStorage.setItem("token", token);
    }

    const setUserInStorage = (userData) => {
        localStorage.setItem("user", JSON.stringify(userData));
    }

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (token) {
            authFetch(`${VITE_BACKEND_URL}/user/me`, { method: "GET" }, token)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Unable to restore session");
                    }

                    return response.json();
                })
                .then((response) => {
                    setUser(response.user);
                    setUserInStorage(response.user);
                })
                .catch(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setUser(null);
                });
        } else {
            localStorage.removeItem("user");
            setUser(null);
        }

    }, []);

    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        navigate("/");
    };

    /**
     * Login a user with their credentials.
     *
     * @remarks Upon success, navigates to "/profile". 
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {string} - Upon failure, Returns an error message.
     */
    const login = async (username, password) => {
        const options = { 
            method: "POST", 
            headers: { "Content-Type": "application/json"}, 
            body: JSON.stringify({ username, password })
        };

        const url = `${VITE_BACKEND_URL}/login`;

        try {
            const response = await ajax(url, options);

            if (!response.ok) {
                const error = await response.json();
                return error.message;
            }

            const data = await response.json();
            setTokenInStorage(data.token);


            const userResponse = await authFetch(`${VITE_BACKEND_URL}/user/me`, { method: "GET" }, data.token);
            const userData = await userResponse.json();

            setUser(userData.user);
            setUserInStorage(userData.user);

            navigate("/profile");
        } catch (err) {
            return err.message;
        }
    };

    /**
     * Registers a new user. 
     * 
     * @remarks Upon success, navigates to "/".
     * @param {Object} userData - The data of the user to register.
     * @returns {string} - Upon failure, returns an error message.
     */
    const register = async (userData) => {
        // TODO: complete me
        const { username, firstname, lastname, password } = userData;

        const options = { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({
                username, firstname, lastname, password
            })
        }

        const url = `${VITE_BACKEND_URL}/register`;

        try {
            const response = await ajax(url, options);
            if (!response.ok) {
                const data = await response.json();
                return data.message;
            }

            navigate("/success");
        } catch (err) {
            return err.message;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
