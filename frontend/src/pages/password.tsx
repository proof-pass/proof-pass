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
            <Card>
                <Header>
                    <Title>Set Up Password</Title>
                    <Instruction>
                        Please write it down and save it somewhere safe, as
                        there is no way to recover it!
                    </Instruction>
                </Header>
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

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 16px;
    background-color: #1e1e1e;
    color: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
`;

const Instruction = styled.p`
    margin: 0;
    line-height: 150%;
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
`;

const PasswordInput = styled.div`
    display: flex;
    align-items: center;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.1);
    padding: 0 12px;
`;

const Input = styled.input`
    flex: 1;
    padding: 12px;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 16px;
    outline: none;
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
    border-radius: 12px;
    padding: 12px 24px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    background: linear-gradient(45deg, #ff6b6b, #feca57);
    color: white;
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    &:active {
        transform: translateY(0);
    }
`;

const Message = styled.p`
    color: #ff6b6b;
    font-size: 14px;
    margin: 0;
`;

export default PasswordSetup;
