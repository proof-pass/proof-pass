import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { DefaultApi, Configuration } from '@/api';
import { setToken } from '@/utils/auth';

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
            setMessage('Verification code sent to your email.');
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
                if (userDetails && userDetails.encryptedInternalNullifier) {
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
        return response;
    };

    return (
        <Form onSubmit={handleSubmit}>
            {stage === 'email' ? (
                <>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
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
                        placeholder="Enter confirmation code"
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
    background-color: #1e1e1e;
    color: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
`;

const Input = styled.input`
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 16px;
    &:focus {
        outline: none;
        border-color: #4ecdc4;
    }
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
    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const CountdownButton = styled(Button)`
    background: linear-gradient(45deg, #4ecdc4, #45b7d8);
    opacity: 0.7;
    cursor: not-allowed;
`;

const Message = styled.p`
    color: #ff6b6b;
    font-size: 14px;
    margin: 0;
`;

export default LoginForm;
