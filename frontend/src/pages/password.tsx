import React, { useState } from 'react';
import styled from 'styled-components';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { setupUserCredentials } from '@/utils/utils';
import { DefaultApi, Configuration } from '@/api';
import { getToken } from '@/utils/auth';

const PasswordSetup: React.FC = () => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const togglePasswordVisibility = (e: React.MouseEvent) => {
        e.preventDefault();
        setPasswordVisible(!passwordVisible);
    };

    const handleSavePasswordAndCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length === 0) {
            setMessage('Please enter a password');
            return;
        }

        try {
            const {
                encryptedInternalNullifier,
                encryptedIdentitySecret,
                identityCommitment,
            } = setupUserCredentials(password);

            const authToken = getToken();

            if (authToken) {
                const config = new Configuration({
                    accessToken: authToken,
                });

                const authenticatedApi = new DefaultApi(config);

                await authenticatedApi.userUpdatePut({
                    userUpdate: {
                        identityCommitment: identityCommitment,
                        encryptedIdentitySecret: encryptedIdentitySecret,
                        encryptedInternalNullifier: encryptedInternalNullifier,
                    },
                });

                router.push('/dashboard');
            } else {
                throw new Error('No auth token available');
            }
        } catch (error) {
            console.error('Error saving user credentials:', error);
            setMessage('Error saving user credentials. Please try again.');
        }
    };

    return (
        <Container>
            <Header>
                <PlanetOverlay>
                    <Image
                        src="/planet.svg"
                        alt="Planet"
                        width={200}
                        height={200}
                    />
                </PlanetOverlay>
            </Header>
            <Card>
                <Instruction>
                    Please write it down and save it somewhere safe, as there is
                    no way to recover it!
                </Instruction>
                <Form onSubmit={handleSavePasswordAndCredentials}>
                    <PasswordInput>
                        <Input
                            type={passwordVisible ? 'text' : 'password'}
                            id="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <VisibilityToggle onClick={togglePasswordVisibility}>
                            <Image
                                src={
                                    passwordVisible
                                        ? '/hidden-icon.svg'
                                        : '/visible-icon.svg'
                                }
                                alt={
                                    passwordVisible
                                        ? 'hide password'
                                        : 'reveal password'
                                }
                                width={20}
                                height={20}
                            />
                        </VisibilityToggle>
                    </PasswordInput>
                    <Button type="submit">Save Password</Button>
                    {message && <Message>{message}</Message>}
                </Form>
            </Card>
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

const Card = styled.div`
    background-color: #fff;
    color: #000;
    padding: 24px;
    width: 100%;
    flex-grow: 1;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

const Instruction = styled.p`
    margin: 16px 0 20px;
    line-height: 1.6;
    color: #a3aab8;
    font-size: 14px;
    text-align: center;
`;

const PasswordInput = styled.div`
    display: flex;
    align-items: center;
    border-radius: 8px;
    border: 1px solid #d4d4d4;
    background-color: #f5f5f5;
    padding: 0 12px;
`;

const Input = styled.input`
    flex: 1;
    padding: 12px;
    background: transparent;
    border: none;
    color: #000;
    font-size: 16px;
    outline: none;
    &::placeholder {
        color: #a3aab8;
    }
    &:focus {
        outline: none;
    }
`;

const VisibilityToggle = styled.button`
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
`;

const Button = styled.button`
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    background-color: #ff8151;
    color: white;
    font-size: 16px;
    &:hover {
        opacity: 0.9;
    }
`;

const Message = styled.p`
    color: #ff6b6b;
    font-size: 14px;
    margin: 0;
    text-align: center;
`;

export default PasswordSetup;
