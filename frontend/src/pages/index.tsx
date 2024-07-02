import React, { useState } from 'react';
import styled from 'styled-components';
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
            <Card>
                {showPasswordVerification ? (
                    <PasswordVerification
                        encryptedInternalNullifier={encryptedInternalNullifier}
                        onPasswordVerified={handlePasswordVerified}
                    />
                ) : (
                    <>
                        <Header>
                            <Title>Proof Pass</Title>
                            <Instruction>
                                Enter your email to log in or register
                            </Instruction>
                        </Header>
                        <LoginForm
                            onPasswordVerificationRequired={
                                handlePasswordVerificationRequired
                            }
                        />
                    </>
                )}
            </Card>
        </Container>
    );
};

const Container = styled.main`
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    background-color: #121212;
    padding: 20px;
    font-family: 'Inter', sans-serif;
`;

const Card = styled.div`
    background-color: #1e1e1e;
    color: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-width: 400px;
`;

const Header = styled.header`
    text-align: center;
    margin-bottom: 24px;
`;

const Title = styled.h1`
    font-size: 28px;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(45deg, #ff6b6b, #feca57);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
`;

const Instruction = styled.p`
    margin: 16px 0 0;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
`;

export default HomePage;
