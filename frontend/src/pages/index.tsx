import React, { useState } from 'react';
import styled from 'styled-components';
import Image from 'next/image';
import LoginForm from '../components/LoginForm';
import PasswordVerification from '../components/PasswordVerification';
import { useRouter } from 'next/router';

const HomePage: React.FC = () => {
    const [showPasswordVerification, setShowPasswordVerification] =
        useState(false);
    const [encryptedInternalNullifier, setEncryptedInternalNullifier] =
        useState('');
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
                            onPasswordVerificationRequired={
                                handlePasswordVerificationRequired
                            }
                        />
                    </>
                )}
            </Card>
            <LogoContainer>
                <TopLogo>
                    <Image
                        src="/proof-summer-icon.svg"
                        alt="Proof Summer"
                        width={187}
                        height={104}
                    />
                </TopLogo>
                <BottomLogos>
                    <Image
                        src="/nebra-logo.svg"
                        alt="Nebra"
                        width={80}
                        height={30}
                    />
                    <Image
                        src="/galxe-logo.svg"
                        alt="Galxe"
                        width={80}
                        height={30}
                    />
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
    background-color: #ffd166;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    width: 100%;
    min-height: 100px;
    background-image: url('/planet-center.svg');
    background-size: cover;
    background-position: center;
`;

const Title = styled.h1`
    font-size: 28px;
    font-weight: 800;
    color: #ff8151;
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
    color: #a3aab8;
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
