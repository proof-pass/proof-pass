import { NextApiRequest, NextApiResponse } from 'next';
import { jwtDecode } from 'jwt-decode';
import cookie from 'js-cookie';

const TOKEN_NAME = 'auth_token';

interface JWTPayload {
    sub: string;
    iat: number;
    exp: number;
}

export const setToken = (token: string) => {
    cookie.set(TOKEN_NAME, token, { expires: 1 }); // Expires in 1 day
};

export const getToken = (): string | undefined => {
    return cookie.get(TOKEN_NAME);
};

export const removeToken = () => {
    cookie.remove(TOKEN_NAME);
};

export const isAuthenticated = (): boolean => {
    const token = getToken();
    if (!token) return false;

    try {
        const decoded: JWTPayload = jwtDecode(token);
        return !!decoded;
    } catch (error) {
        console.error('Failed to decode token', error);
        return false;
    }
};

export const withAuth = (
    handler: (req: NextApiRequest, res: NextApiResponse) => void,
) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const token = getToken();
        if (!token) {
            res.writeHead(302, { Location: '/' });
            res.end();
            return;
        }

        try {
            const decoded: JWTPayload = jwtDecode(token);
            if (!decoded) {
                res.writeHead(302, { Location: '/' });
                res.end();
                return;
            }
        } catch (error) {
            res.writeHead(302, { Location: '/' });
            res.end();
            return;
        }

        return handler(req, res);
    };
};
