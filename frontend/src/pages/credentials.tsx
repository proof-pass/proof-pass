import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import Image from 'next/image';
import withAuth from '@/components/withAuth';
import { DefaultApi, Configuration, FetchAPI, TicketCredential } from '@/api';
import { getToken } from '@/utils/auth';
import { decryptValueUtf8 } from '@/utils/utils';
import JsonDisplay from '@/components/JsonDisplay';

const CredentialsPage: React.FC = () => {
    const router = useRouter();
    const [ticketCredentials, setTicketCredentials] = useState<
        TicketCredential[]
    >([]);
    const [eventNames, setEventNames] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [displayedCredentials, setDisplayedCredentials] = useState<
        Record<string, Record<string, unknown> | null>
    >({});
    const api = useMemo(() => {
        const token = getToken();
        const customFetch: FetchAPI = async (
            input: RequestInfo,
            init?: RequestInit,
        ) => {
            if (!init) init = {};
            if (!init.headers) init.headers = {};
            if (token)
                (init.headers as Record<string, string>)['Authorization'] =
                    `Bearer ${token}`;
            return fetch(input, init);
        };

        const config = new Configuration({
            accessToken: token,
            fetchApi: customFetch,
        });

        return new DefaultApi(config);
    }, []);

    useEffect(() => {
        const fetchTicketCredentials = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const credentials = await api.userMeTicketCredentialsGet();
                setTicketCredentials(credentials);

                const uniqueEventIds = Array.from(
                    new Set(
                        credentials.map((cred) => cred.eventId).filter(Boolean),
                    ),
                );
                const names: Record<string, string> = {};
                await Promise.all(
                    uniqueEventIds.map(async (eventId) => {
                        if (eventId) {
                            const event = await api.eventsEventIdGet({
                                eventId,
                            });
                            names[eventId] = event.name ?? 'Unknown Event';
                        }
                    }),
                );
                setEventNames(names);
            } catch (error) {
                console.error('Error fetching ticket credentials:', error);
                setError(
                    'Failed to fetch ticket credentials. Please try again later.',
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchTicketCredentials();
    }, [api]);

    const handleDisplayCredential = (ticket: TicketCredential) => {
        const eventId = ticket.eventId || 'unknown';
        if (ticket.data) {
            try {
                const hashedPassword = localStorage.getItem('auth_password');
                if (!hashedPassword) {
                    throw new Error('Authentication password not found');
                }
                const decryptedData = decryptValueUtf8(ticket.data, hashedPassword);
                const parsedData = JSON.parse(decryptedData);
                const finalData = JSON.parse(parsedData);
                setDisplayedCredentials((prev) => ({
                    ...prev,
                    [eventId]: finalData,
                }));
            } catch (error) {
                console.error(
                    'Error decrypting or parsing ticket data:',
                    error,
                );
                setError(
                    'Failed to display ticket credential. Please try again.',
                );
                setDisplayedCredentials((prev) => ({
                    ...prev,
                    [eventId]: null,
                }));
            }
        } else {
            setError('No ticket data available for this event.');
            setDisplayedCredentials((prev) => ({
                ...prev,
                [eventId]: null,
            }));
        }
    };

    return (
        <PageContainer>
            <Header>
                <PlanetOverlay>
                    <Image
                        src="/planet.svg"
                        alt="Planet"
                        width={200}
                        height={200}
                    />
                </PlanetOverlay>
                <GoBackButton onClick={() => router.push('/dashboard')}>
                    <Image
                        src="/left-arrow.svg"
                        alt="go back"
                        width={20}
                        height={20}
                    />
                    <span>Homepage</span>
                </GoBackButton>
            </Header>
            <MainContainer>
                <Title>Ticket Credentials</Title>
                {isLoading ? (
                    <LoadingIndicator>Loading...</LoadingIndicator>
                ) : error ? (
                    <ErrorMessage>{error}</ErrorMessage>
                ) : (
                    <CredentialSection>
                        {ticketCredentials.length > 0 ? (
                            ticketCredentials.map((ticket, index) => (
                                <CredentialItem key={index}>
                                    <p>
                                        Event:{' '}
                                        {eventNames[ticket.eventId ?? ''] ??
                                            'Unknown Event'}
                                    </p>
                                    <p>
                                        Issued At:{' '}
                                        {new Date(
                                            ticket.issuedAt ?? '',
                                        ).toLocaleString()}
                                    </p>
                                    <p>
                                        Expires At:{' '}
                                        {new Date(
                                            ticket.expireAt ?? '',
                                        ).toLocaleString()}
                                    </p>
                                    <DisplayCredentialButton
                                        onClick={() =>
                                            handleDisplayCredential(ticket)
                                        }
                                    >
                                        Display Credential
                                    </DisplayCredentialButton>
                                    {displayedCredentials[
                                        ticket.eventId || 'unknown'
                                    ] !== undefined && (
                                        <CredentialDisplay>
                                            <JsonDisplay
                                                data={
                                                    displayedCredentials[
                                                        ticket.eventId ||
                                                            'unknown'
                                                    ]
                                                }
                                            />
                                        </CredentialDisplay>
                                    )}
                                </CredentialItem>
                            ))
                        ) : (
                            <NoCredentialText>
                                No ticket credentials found. Please go to the
                                Events page to request a ticket credential.
                            </NoCredentialText>
                        )}
                    </CredentialSection>
                )}
            </MainContainer>
            <Footer>
                <Image
                    src="/proof-summer-icon.svg"
                    alt="Proof Summer"
                    width={187}
                    height={104}
                />
            </Footer>
        </PageContainer>
    );
};

const PageContainer = styled.div`
    min-height: 100vh;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    max-width: 480px;
    margin: 0 auto;
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

const GoBackButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: #ff8151;
    font-size: 16px;
    font-weight: bold;
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 2;

    span {
        margin-left: 10px;
    }
`;

const MainContainer = styled.main`
    color: #000;
    padding: 24px;
    flex-grow: 1;
`;

const Title = styled.h1`
    font-size: 28px;
    font-weight: 800;
    color: #ff8151;
    margin: 0 0 24px 0;
    text-align: center;
`;

const CredentialSection = styled.div`
    margin: 24px 0;
`;

const CredentialItem = styled.div`
    background-color: #f5f5f5;
    padding: 16px;
    margin: 16px 0;
    border-radius: 8px;
    color: #000;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
`;

const NoCredentialText = styled.p`
    color: #a3aab8;
    font-size: 16px;
`;

const LoadingIndicator = styled.div`
    color: #000;
    font-size: 18px;
    text-align: center;
    margin-top: 20px;
`;

const ErrorMessage = styled.div`
    color: #ff6b6b;
    font-size: 18px;
    text-align: center;
    margin-top: 20px;
`;

const DisplayCredentialButton = styled.button`
    background-color: #5eb7ff;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    margin-top: 8px;
    &:hover {
        opacity: 0.9;
    }
`;

const CredentialDisplay = styled.div`
    background-color: #f0f0f0;
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
    overflow-x: auto;
    width: 100%;

    pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
    }
`;

const Footer = styled.footer`
    display: flex;
    justify-content: center;
    padding: 20px;
`;

export default withAuth(CredentialsPage);
