import React, { useState } from 'react';
import styled from 'styled-components';
import Image from 'next/image';
import { decryptValue, hashPassword, setAuthPassword } from '@/utils/utils';
import { useRouter } from 'next/router';

interface PasswordVerificationProps {
    encryptedInternalNullifier: string;
    onPasswordVerified: () => void;
}

const PasswordVerification: React.FC<PasswordVerificationProps> = ({
    encryptedInternalNullifier,
    onPasswordVerified,
}) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const togglePasswordVisibility = (e: React.MouseEvent) => {
        e.preventDefault();
        setPasswordVisible(!passwordVisible);
    };

    const handleVerifyAndCachePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length === 0) {
            setMessage('Please enter a password');
            return;
        }

        try {
            const hashedPassword = hashPassword(password);
            const decryptedInternalNullifier = decryptValue(
                encryptedInternalNullifier,
                hashedPassword,
            );

            if (decryptedInternalNullifier) {
                setAuthPassword(hashedPassword);
                onPasswordVerified();
                router.push('/dashboard');
            } else {
                throw new Error('Failed to decrypt internal nullifier');
            }
        } catch (error) {
            setMessage('Incorrect password. Please try again.');
            setPassword('');
        }
    };

    return (
        <Form onSubmit={handleVerifyAndCachePassword}>
            <Instruction>
                Please enter your password below to continue to your dashboard
            </Instruction>
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
            <Button type="submit">Continue</Button>
            {message && <Message>{message}</Message>}
        </Form>
    );
};

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

export default PasswordVerification;
