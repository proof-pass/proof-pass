import React, { useState } from 'react';
import styled from 'styled-components';
import AboutOverlay from '../components/OverlayCards/AboutOverlay';
import ProfileOverlay from '@/components/OverlayCards/ProfileOverlay';
import { useRouter } from 'next/router';
import { IndexMenuItemsProps } from '@/types/indexMenuItemsProps';
import withAuth from '@/components/withAuth';

const menuData = [
    { label: 'About' },
    { label: 'Credentials' },
    { label: 'Events' },
    { label: 'Profile' },
];

const DashboardPage: React.FC = () => {
    const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
    const router = useRouter();

    const handleMenuItemClick = (label: string) => {
        switch (label) {
            case 'About':
            case 'Profile':
                setActiveOverlay(label);
                break;
            case 'Events':
                router.push('/events');
                break;
            case 'Credentials':
                router.push('/credentials');
                break;
        }
    };

    const handleCloseOverlay = () => {
        setActiveOverlay(null);
    };

    const handleLogout = () => {
        router.push('/');
    };

    return (
        <DashboardContainer>
            <Nav>
                {menuData.map((item, index) => (
                    <MenuItem
                        key={index}
                        label={item.label}
                        onClick={() => handleMenuItemClick(item.label)}
                    />
                ))}
            </Nav>
            {activeOverlay && (
                <OverlayContainer>
                    {activeOverlay === 'About' && (
                        <AboutOverlay onClose={handleCloseOverlay} />
                    )}
                    {activeOverlay === 'Profile' && (
                        <ProfileOverlay
                            onClose={handleCloseOverlay}
                            onLogout={handleLogout}
                            logoutButtonLabel="Logout"
                        />
                    )}
                </OverlayContainer>
            )}
        </DashboardContainer>
    );
};

const MenuItem: React.FC<IndexMenuItemsProps> = ({ label, onClick }) => {
    return <NavItem onClick={onClick}>{label}</NavItem>;
};

const DashboardContainer = styled.div`
    min-height: 100vh;
    color: #fff;
    position: relative;
    max-width: 480px;
    margin: 0 auto;
    padding: 20px;
`;

const Nav = styled.nav`
    display: flex;
    justify-content: space-around;
    font-size: 16px;
    color: var(--info-base, #fff);
    font-weight: 400;
    line-height: 150%;
    padding: 20px 0;
`;

const NavItem = styled.span`
    font-family: Inter, sans-serif;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 8px;
    white-space: nowrap;
    cursor: pointer;
    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
`;

const OverlayContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    padding: 20px;
`;

export default withAuth(DashboardPage);
