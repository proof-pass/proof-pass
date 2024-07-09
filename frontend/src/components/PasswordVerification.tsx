import React, { useState } from 'react';
import styled from 'styled-components';
import Image from 'next/image';
import { decryptValue, hashPassword, setAuthPassword } from '@/utils/utils';
import { useRouter } from 'next/router';

interface PasswordVerificationProps {
    encryptedInternalNullifier: string;
    is_encrypted: boolean;
    onPasswordVerified: () => void;
}

const PasswordVerification: React.FC<PasswordVerificationProps> = ({
    encryptedInternalNullifier,
    is_encrypted,
    onPasswordVerified,
}) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();

    React.useEffect(() => {
        if (!is_encrypted) {
            setAuthPassword('');
            onPasswordVerified();
        }
    }, [is_encrypted, onPasswordVerified]);

    if (!is_encrypted) {
        return null;
    }

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
        <Card>
            <Form onSubmit={handleVerifyAndCachePassword}>
                <Instruction>
                    Please enter your password below to continue to your
                    dashboard
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
        </Card>
    );
};

const Card = styled.div`
    background-color: #fff;
    color: #000;
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

export default PasswordVerification;
