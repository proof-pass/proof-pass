import React, { useState } from 'react';
import styled from 'styled-components';
import Image from 'next/image';
import LoginForm from '../components/LoginForm';
import PasswordVerification from '../components/PasswordVerification';
import { useRouter } from 'next/router';

const HomePage: React.FC = () => {
    const [showPasswordVerification, setShowPasswordVerification] = useState(false);
    const [encryptedInternalNullifier, setEncryptedInternalNullifier] = useState('');
    const router = useRouter();

    const handlePasswordVerificationRequired = (nullifier: string) => {
        setEncryptedInternalNullifier(nullifier);
        setShowPasswordVerification(true);
    };

    const handlePasswordVerified = () => {
        setShowPasswordVerification(false);
        router.push('/dashboard');
    };

    return (
        <Container>
            <Header>
                <PlanetOverlay>
                    <Image src="/planet.svg" alt="Planet" width={200} height={200} />
                </PlanetOverlay>
                <Title>Proof Pass</Title>
            </Header>
            <Card>
                {showPasswordVerification ? (
                    <PasswordVerification
                        encryptedInternalNullifier={encryptedInternalNullifier}
                        onPasswordVerified={handlePasswordVerified}
                    />
                ) : (
                    <>
                        <Instruction>
                            Enter your email to log in or register
                        </Instruction>
                        <LoginForm
                            onPasswordVerificationRequired={handlePasswordVerificationRequired}
                        />
                    </>
                )}
            </Card>
            <LogoContainer>
                <TopLogo>
                    <Image src="/proof-summer-icon.svg" alt="Proof Summer" width={187} height={104} />
                </TopLogo>
                <BottomLogos>
                    <Image src="/nebra-logo.svg" alt="Nebra" width={80} height={30} />
                    <Image src="/galxe-logo.svg" alt="Galxe" width={80} height={30} />
                </BottomLogos>
            </LogoContainer>
        </Container>
    );
};

const Container = styled.main`
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
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200%;
    height: 200%;
    display: flex;
    justify-content: center;
    align-items: center;
    
    & > div {
        width: 100% !important;
        height: 100% !important;
    }
    
    img {
        object-fit: cover;
        width: 100% !important;
        height: 100% !important;
    }
`;

const Title = styled.h1`
    font-size: 28px;
    font-weight: 800;
    color: #FF8151;
    margin: 0;
    z-index: 2;
    position: relative;
`;

const Card = styled.div`
    background-color: #fff;
    color: #000;
    padding: 24px;
    width: 100%;
    flex-grow: 1;
`;

const Instruction = styled.p`
    margin: 16px 0 20px;
    line-height: 1.6;
    color: #A3AAB8;
    font-size: 14px;
    text-align: center;
`;

const LogoContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: auto;
    padding: 20px;
`;

const TopLogo = styled.div`
    margin-bottom: 20px;
`;

const BottomLogos = styled.div`
    display: flex;
    justify-content: center;
    gap: 40px;
`;

export default HomePage;
