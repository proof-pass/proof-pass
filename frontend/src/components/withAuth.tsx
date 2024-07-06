import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, removeToken } from '@/utils/auth';

const withAuth = (WrappedComponent: React.ComponentType, skipAuthCheck: boolean = false) => {
    const Wrapper: React.FC = (props) => {
        const router = useRouter();

        useEffect(() => {
            if (!skipAuthCheck && !isAuthenticated()) {
                removeToken();
                localStorage.removeItem('auth_password');
                router.push('/');
            }
        }, [router]);

        return (skipAuthCheck || isAuthenticated()) ? <WrappedComponent {...props} /> : null;
    };

    return Wrapper;
};

export default withAuth;