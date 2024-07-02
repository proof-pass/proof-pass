import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, removeToken } from '@/utils/auth';

const withAuth = (WrappedComponent: React.ComponentType) => {
    const Wrapper: React.FC = (props) => {
        const router = useRouter();

        useEffect(() => {
            if (!isAuthenticated()) {
                removeToken();
                localStorage.removeItem('auth_password');
                router.push('/');
            }
        }, [router]);

        return isAuthenticated() ? <WrappedComponent {...props} /> : null;
    };

    return Wrapper;
};

export default withAuth;
