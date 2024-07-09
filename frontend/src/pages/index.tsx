import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Image from 'next/image';
import LoginForm from '../components/LoginForm';
import PasswordVerification from '../components/PasswordVerification';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getToken } from '@/utils/auth';
import { Configuration, DefaultApi } from '@/api';

const HomePage: React.FC = () => {
    const [showPasswordVerification, setShowPasswordVerification] = useState(false);
    const [encryptedInternalNullifier, setEncryptedInternalNullifier] = useState('');
    const [isEncrypted, setIsEncrypted] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const authToken = getToken();
                if (authToken) {
                    const config = new Configuration({
                        accessToken: authToken,
                    });
                    const authenticatedApi = new DefaultApi(config);
                    const userResponse = await authenticatedApi.userMeGet();
                    if (userResponse.isEncrypted !== undefined) {
                        setIsEncrypted(userResponse.isEncrypted);
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
    }, []);

    const handlePasswordVerificationRequired = (nullifier: string, isEncrypted: boolean) => {
        setEncryptedInternalNullifier(nullifier);
        setIsEncrypted(isEncrypted);
        setShowPasswordVerification(true);
    };

    const handlePasswordVerified = () => {
        setShowPasswordVerification(false);
        router.push('/dashboard');
    };

    return (
        <>
            <Head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
                />
                <title>Proof Pass</title>
            </Head>
            <Container>
                <Header>
                    <Title>Proof Pass</Title>
                </Header>
                <Card>
                    {showPasswordVerification ? (
                        <PasswordVerification
                            encryptedInternalNullifier={encryptedInternalNullifier}
                            onPasswordVerified={handlePasswordVerified}
                            is_encrypted={isEncrypted}
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
                        <Image
                            src="/proof-summer-icon.svg"
                            alt="Proof Summer"
                            width={187}
                            height={104}
                            style={{ width: '100%', height: 'auto' }}
                        />
                    </TopLogo>
                    <BottomLogos>
                        <Image
                            src="/nebra-logo.svg"
                            alt="Nebra"
                            width={80}
                            height={30}
                            style={{ width: '80px', height: 'auto' }}
                        />
                        <Image
                            src="/galxe-logo.svg"
                            alt="Galxe"
                            width={80}
                            height={30}
                            style={{ width: '80px', height: 'auto' }}
                        />
                    </BottomLogos>
                </LogoContainer>
            </Container>
        </>
    );
};

const Title = styled.h1`
    font-size: 28px;
    font-weight: 800;
    color: #ff8151;
    margin: 0;
    z-index: 2;
    position: relative;
`;

const Container = styled.main`
    background-color: #fff;
    color: #000;
    max-width: 480px;
    height: 100dvh;
    margin: 0 auto;
    padding: 0;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
`;

const Header = styled.header`
    background-color: #ffd166;
    padding: 2vh 20px; 
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 10.73vh; 
    background-image: url('/planet-center.svg');
    background-size: cover;
    background-position: center;
`;

const Card = styled.div`
    background-color: #fff;
    color: #000;
    padding: 16px 24px;
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const Instruction = styled.p`
    margin: 8px 0 12px;
    line-height: 1.4;
    color: #a3aab8;
    font-size: 14px;
    text-align: center;
`;

const LogoContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 8px 0; 
    margin-top: auto;
`;

const TopLogo = styled.div`
    margin-bottom: 8px; 
    width: 187px;
    height: auto;
`;

const BottomLogos = styled.div`
    display: flex;
    justify-content: center;
    gap: 20px; 
    img {
        width: 80px;
        height: auto;
    }
`;

export default HomePage;
