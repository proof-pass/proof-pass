import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import OverlayCard from './OverlayCard';
import { ProfileOverlayProps } from '@/types/profileOverlayProps';
import { DefaultApi, Configuration, User } from '@/api';
import { useRouter } from 'next/router';
import { getToken, removeToken } from '@/utils/auth';
import { decryptValue } from '@/utils/utils';

const ProfileOverlay: React.FC<ProfileOverlayProps> = ({
    onClose,
    logoutButtonLabel,
}) => {
    const [userDetails, setUserDetails] = useState<User | null>(null);
    const [showIdentitySecret, setShowIdentitySecret] = useState(false);
    const [showInternalNullifier, setShowInternalNullifier] = useState(false);
    const [decryptedIdentitySecret, setDecryptedIdentitySecret] = useState('');
    const [decryptedInternalNullifier, setDecryptedInternalNullifier] =
        useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleLogout = useCallback(() => {
        removeToken();
        localStorage.removeItem('auth_password');
        router.push('/');
    }, [router]);

    useEffect(() => {
        const fetchUserDetails = async () => {
            const token = getToken();
            if (token) {
                try {
                    const config = new Configuration({
                        accessToken: token,
                    });
                    const api = new DefaultApi(config);
                    const response = await api.userMeGet();
                    setUserDetails(response);
                } catch (error) {
                    console.error('Error fetching user details:', error);
                    setMessage(
                        'Error fetching user details. Please try logging in again.',
                    );
                    handleLogout();
                }
            } else {
                router.push('/');
            }
        };

        fetchUserDetails();
    }, [router, handleLogout]);

    const handleToggleIdentitySecret = () => {
        const hashedPassword = localStorage.getItem('auth_password');
        if (userDetails && userDetails.encryptedIdentitySecret) {
            if (showIdentitySecret) {
                setShowIdentitySecret(false);
            } else {
                console.log(userDetails);
                if (userDetails.isEncrypted === true) {
                    const decryptedHex = decryptValue(
                        userDetails.encryptedIdentitySecret,
                        hashedPassword!,
                    );
                    setDecryptedIdentitySecret(BigInt(decryptedHex).toString());
                } else {
                    setDecryptedIdentitySecret(
                        BigInt(userDetails.encryptedIdentitySecret).toString(),
                    );
                }

                setShowIdentitySecret(true);
            }
        }
    };

    const handleToggleInternalNullifier = () => {
        const hashedPassword = localStorage.getItem('auth_password');
        if (userDetails && userDetails.encryptedInternalNullifier) {
            if (showInternalNullifier) {
                setShowInternalNullifier(false);
            } else {
                if (userDetails.isEncrypted === true) {
                    const decryptedHex = decryptValue(
                        userDetails.encryptedInternalNullifier,
                        hashedPassword!,
                    );
                    setDecryptedInternalNullifier(
                        BigInt(decryptedHex).toString(),
                    );
                } else {
                    setDecryptedInternalNullifier(
                        BigInt(userDetails.encryptedInternalNullifier).toString(),
                    );
                }
                setShowInternalNullifier(true);
            }
        }
    };

    return (
        <OverlayCard
            title="Profile"
            description="This is your profile page. You can view your account details here."
            onClose={onClose}
            onLogout={handleLogout}
            logoutButtonLabel={logoutButtonLabel}
        >
            {userDetails ? (
                <DetailsContainer>
                    <DetailItem>
                        <Label>Email:</Label> {userDetails.email}
                    </DetailItem>
                    <DetailItem>
                        <Label>Identity Commitment:</Label>
                        <DetailContent>
                            {userDetails.identityCommitment ?? ''}
                        </DetailContent>
                    </DetailItem>
                    <DetailItem>
                        <Label>Identity Secret:</Label>
                        <SecretValue>
                            <SecretContent>
                                {showIdentitySecret
                                    ? decryptedIdentitySecret
                                    : '******'}
                            </SecretContent>
                            <RevealButton onClick={handleToggleIdentitySecret}>
                                {showIdentitySecret ? 'Hide' : 'Show'}
                            </RevealButton>
                        </SecretValue>
                    </DetailItem>
                    <DetailItem>
                        <Label>Internal Nullifier:</Label>
                        <SecretValue>
                            <SecretContent>
                                {showInternalNullifier
                                    ? decryptedInternalNullifier
                                    : '******'}
                            </SecretContent>
                            <RevealButton
                                onClick={handleToggleInternalNullifier}
                            >
                                {showInternalNullifier ? 'Hide' : 'Show'}
                            </RevealButton>
                        </SecretValue>
                    </DetailItem>
                </DetailsContainer>
            ) : (
                <p>Loading user details...</p>
            )}
            {message && <Message>{message}</Message>}
        </OverlayCard>
    );
};

const DetailsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

const DetailItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-color: #f5f5f5;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
`;

const SecretValue = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 16px;
    color: #000;
    overflow-x: hidden;
`;

const RevealButton = styled.button`
    background-color: #5eb7ff;
    color: #fff;
    border: none;
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s ease;
    min-width: 80px; // Set a minimum width
    flex-shrink: 0; // Prevent button from shrinking

    &:hover {
        opacity: 0.9;
    }

    @media (max-width: 480px) {
        padding: 6px 12px;
        font-size: 14px;
    }
`;

const SecretContent = styled.span`
    overflow-x: auto;
    white-space: nowrap;
`;

const Label = styled.strong`
    color: #000;
    font-weight: 600;
    font-size: 16px;
`;

const DetailContent = styled.div`
    overflow-x: auto;
    white-space: nowrap;
    max-width: 100%;
    padding-bottom: 8px;
    color: #000;

    &::-webkit-scrollbar {
        height: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #e0e0e0;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: #a3aab8;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #8c8c8c;
    }
`;

const Message = styled.p`
    color: #ff6b6b;
    font:
        500 14px/150% 'Inter',
        sans-serif;
    margin: 0;
`;

export default ProfileOverlay;
