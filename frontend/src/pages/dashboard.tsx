import React, { useState } from 'react';
import styled from 'styled-components';
import AboutOverlay from '../components/OverlayCards/AboutOverlay';
import ProfileOverlay from '@/components/OverlayCards/ProfileOverlay';
import { useRouter } from 'next/router';
import { IndexMenuItemsProps } from '@/types/indexMenuItemsProps';
import withAuth from '@/components/withAuth';
import Image from 'next/image';

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
            <Header>
                <PlanetOverlay>
                    <Image src="/planet.svg" alt="Planet" width={200} height={200} />
                </PlanetOverlay>
                <Nav>
                    {menuData.map((item, index) => (
                        <MenuItem
                            key={index}
                            label={item.label}
                            onClick={() => handleMenuItemClick(item.label)}
                        />
                    ))}
                </Nav>
            </Header>
            <Content>
                {/* Placeholder for future development */}
            </Content>
            <Footer>
                <Image src="/proof-summer-icon.svg" alt="Proof Summer" width={187} height={104} />
            </Footer>
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
    background-color: #fff;
    color: #000;
    max-width: 480px;
    min-height: 100vh;
    margin: 0 auto;
    padding: 0;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
`;

const Header = styled.header`
    background-color: #FFD166;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    height: 100px; 
`;

const PlanetOverlay = styled.div`
    position: absolute;
    top: 0;
    right: -50%;
    width: 150%;
    height: 200%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    overflow: hidden;
    
    & > div {
        width: 100% !important;
        height: 100% !important;
    }
    
    img {
        object-fit: cover;
        object-position: left center;
        width: 100% !important;
        height: 100% !important;
        transform: translateX(-25%);
    }
`;

const Nav = styled.nav`
    display: flex;
    justify-content: space-around;
    font-size: 16px;
    color: #000;
    font-weight: 400;
    line-height: 150%;
    width: 100%;
    z-index: 2;
`;

const NavItem = styled.span`
    font-family: Inter, sans-serif;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 8px;
    white-space: nowrap;
    cursor: pointer;
    color: #000;
    &:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 8px;
    }
`;

const Content = styled.main`
    flex-grow: 1;
    padding: 20px;
`;

const Footer = styled.footer`
    display: flex;
    justify-content: center;
    padding: 20px;
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
