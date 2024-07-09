import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { DefaultApi, Configuration } from '@/api';
import { setToken } from '@/utils/auth';
import { setAuthPassword, hashPassword } from '@/utils/utils';

interface LoginFormProps {
    onPasswordVerificationRequired: (nullifier: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
    onPasswordVerificationRequired,
}) => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [stage, setStage] = useState('email');

    const router = useRouter();

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isCountingDown && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown((prevCountdown) => prevCountdown - 1);
            }, 1000);
        } else if (countdown === 0) {
            setIsCountingDown(false);
            setCountdown(30);
        }

        return () => {
            clearTimeout(timer);
        };
    }, [isCountingDown, countdown]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && stage === 'email') {
            e.preventDefault();
            handleRequestCode();
        }
    };

    const handleRequestCode = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        setIsCountingDown(true);
        try {
            const api = new DefaultApi();
            await api.userRequestVerificationCodePost({
                userEmailVerificationRequest: { email: email },
            });
            setMessage(
                'Verification code sent to your email. Please also make sure to check your spam or junk folder.',
            );
            setStage('confirmation-code');
        } catch (error) {
            setMessage('Failed to send verification code.');
            setIsCountingDown(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = () => {
        setStage('email');
        setEmail('');
        setCode('');
        setMessage('');
        setCountdown(30);
        setIsCountingDown(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, id } = e.target;
        if (id === 'email') {
            setEmail(value);
        } else if (id === 'confirmation-code') {
            setCode(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const api = new DefaultApi();
            const response = await api.userLoginPost({
                userLogin: { email, code },
            });

            if (response && response.token) {
                setToken(response.token);

                const userDetails =
                    await checkIdentityCommitmentAndSetNullifier(
                        response.token,
                    );
                if (userDetails === null) {
                    // User is not encrypted, already redirected to dashboard
                    return;
                } else if (
                    userDetails &&
                    userDetails.encryptedInternalNullifier
                ) {
                    onPasswordVerificationRequired(
                        userDetails.encryptedInternalNullifier,
                    );
                } else {
                    router.push('/password');
                }
            }
        } catch (error) {
            setMessage('Failed to log in. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const checkIdentityCommitmentAndSetNullifier = async (token: string) => {
        const config = new Configuration({
            accessToken: token,
        });
        const authenticatedApi = new DefaultApi(config);

        const response = await authenticatedApi.userMeGet();

        if (!response.isEncrypted) {
            // Set a default empty password for future encryption/decryption
            setAuthPassword(hashPassword(''));
            router.push('/dashboard');
            return null;
        }

        return response;
    };

    return (
        <Form onSubmit={handleSubmit}>
            {stage === 'email' ? (
                <>
                    <Input
                        id="email"
                        type="email"
                        placeholder="enter email address"
                        value={email}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                    <Button
                        type="button"
                        onClick={handleRequestCode}
                        disabled={isSubmitting}
                    >
                        Send Code
                    </Button>
                </>
            ) : stage === 'confirmation-code' ? (
                <>
                    <Input
                        id="confirmation-code"
                        type="text"
                        placeholder="enter confirmation code"
                        value={code}
                        onChange={handleInputChange}
                    />
                    <Button type="submit" disabled={isSubmitting}>
                        Verify Now
                    </Button>
                    {isCountingDown ? (
                        <CountdownButton disabled>
                            Resend ({countdown})
                        </CountdownButton>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleResendCode}
                            disabled={isSubmitting}
                        >
                            Resend Code
                        </Button>
                    )}
                </>
            ) : null}
            {message && <Message>{message}</Message>}
        </Form>
    );
};

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

const Input = styled.input`
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #d4d4d4;
    background-color: #f5f5f5;
    color: #000;
    font-size: 16px;
    &::placeholder {
        color: #a3aab8;
    }
    &:focus {
        outline: none;
        border-color: #5eb7ff;
    }
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
    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const CountdownButton = styled(Button)`
    background-color: #a3aab8;
    opacity: 0.7;
    cursor: not-allowed;
`;

const Message = styled.p`
    color: #ff6b6b;
    font-size: 14px;
    margin: 0;
    text-align: center;
`;

export default LoginForm;
