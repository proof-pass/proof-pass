import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import EventCard from '@/components/Events/EventCard';
import withAuth from '@/components/withAuth';
import { DefaultApi, Event, Configuration, FetchAPI, TicketCredential } from '@/api';
import { getToken } from '@/utils/auth';

const EventsPage: React.FC = () => {
    const router = useRouter();
    const [eventList, setEventList] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [userCredentials, setUserCredentials] = useState<TicketCredential[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [successMessageTimeout, setSuccessMessageTimeout] = useState<NodeJS.Timeout | null>(null);
    const [errorMessageTimeout, setErrorMessageTimeout] = useState<NodeJS.Timeout | null>(null);

    const api = useMemo(() => {
        const token = getToken();

        const customFetch: FetchAPI = async (input: RequestInfo, init?: RequestInit) => {
            if (!init) {
                init = {};
            }
            if (!init.headers) {
                init.headers = {};
            }

            if (token) {
                (init.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
            }

            return fetch(input, init);
        };

        const config = new Configuration({
            accessToken: token,
            fetchApi: customFetch
        });

        return new DefaultApi(config);
    }, []);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.eventsGet();
            setEventList(response);
        } catch (error) {
            console.error('Error fetching events:', error);
            setErrorMessage('Failed to fetch events. Please try again later.');
            const timeout = setTimeout(() => {
                setErrorMessage(null);
            }, 3000);
            setErrorMessageTimeout(timeout);
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => {
        const fetchUserCredentials = async () => {
            try {
                const credentials = await api.userMeTicketCredentialsGet();
                setUserCredentials(credentials);
            } catch (error) {
                console.error('Error fetching user credentials:', error);
            }
        };

        fetchUserCredentials();
    }, [api]);

    useEffect(() => {
        return () => {
            if (successMessageTimeout) {
                clearTimeout(successMessageTimeout);
            }
            if (errorMessageTimeout) {
                clearTimeout(errorMessageTimeout);
            }
        };
    }, [successMessageTimeout, errorMessageTimeout]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const fetchEventDetails = useCallback(async (eventId: string) => {
        try {
            const response = await api.eventsEventIdGet({ eventId });
            return response;
        } catch (error) {
            console.error('Error fetching event details:', error);
            throw error;
        }
    }, [api]);

    const handleRequestTicketCredential = useCallback(async (eventId: string) => {
        try {
            setIsLoading(true);
            setSuccessMessage(null);
            setErrorMessage(null);

            const existingCredentials = await api.userMeTicketCredentialsGet();
            const hasExistingCredential = existingCredentials.some(cred => cred.eventId === eventId);

            if (hasExistingCredential) {
                setErrorMessage('You already have a ticket for this event.');
                const timeout = setTimeout(() => {
                    setErrorMessage(null);
                }, 3000);
                setErrorMessageTimeout(timeout);
                return;
            }

            const ticketCredential = await api.eventsEventIdRequestTicketCredentialPost({
                eventId: eventId
            });

            if (ticketCredential) {
                await api.userMeTicketCredentialPut({
                    putTicketCredentialRequest: {
                        eventId: ticketCredential.eventId ?? '',
                        data: ticketCredential.credential ?? '',
                        issuedAt: ticketCredential.issuedAt ?? new Date(),
                        expireAt: ticketCredential.expireAt ?? new Date(),
                    }
                });

                const credentials = await api.userMeTicketCredentialsGet();
                setUserCredentials(credentials);
                await fetchEvents();

                setSuccessMessage('Ticket credential successfully retrieved!');

                const timeout = setTimeout(() => {
                    setSuccessMessage(null);
                }, 3000);
                setSuccessMessageTimeout(timeout);
            } else {
                throw new Error('Failed to request ticket credential');
            }
        } catch (error) {
            console.error('Error requesting or storing ticket credential:', error);
            setErrorMessage('You haven\'t registered for this event.');
            const timeout = setTimeout(() => {
                setErrorMessage(null);
            }, 3000);
            setErrorMessageTimeout(timeout);
        } finally {
            setIsLoading(false);
        }
    }, [api, fetchEvents]);

    const handleScanQRCode = useCallback((eventId: string, eventName: string) => {
        console.log('Initiate QR Code Scan for event:', eventId);
        router.push(`/scan-qr?eventId=${eventId}&eventName=${encodeURIComponent(eventName)}`);
    }, [router]);

    return (
        <MainContainer>
            {successMessage && (
                <Message success>{successMessage}</Message>
            )}
            {errorMessage && (
                <Message error>{errorMessage}</Message>
            )}
            <Header>
                <GoBackButton onClick={() => router.push('/dashboard')}>
                    <Image
                        src="/left-arrow.svg"
                        alt="go back"
                        width={20}
                        height={20}
                    />
                    <Title>Homepage</Title>
                </GoBackButton>
            </Header>
            <EventList>
                {isLoading ? (
                    <LoadingIndicator>Loading events...</LoadingIndicator>
                ) : eventList.length > 0 ? (
                    eventList.map((event) => (
                        <React.Fragment key={event.id ?? ''}>
                            <EventCard
                                eventId={event.id ?? ''}
                                eventName={event.name ?? ''}
                                eventDate={new Date().toLocaleDateString()} 
                                eventUrl={event.url ?? ''}
                                eventDescription={event.description ?? ''}
                                requestTicketCredentialsLabel={
                                    userCredentials.some(cred => cred.eventId === event.id)
                                        ? "Ticket Obtained"
                                        : "Request Credential"
                                }
                                hasTicket={userCredentials.some(cred => cred.eventId === event.id)}
                                onClick={handleRequestTicketCredential}
                                onScanQRCode={handleScanQRCode}
                                fetchEventDetails={fetchEventDetails}
                            />
                        </React.Fragment>
                    ))
                ) : (
                    <NoEventsMessage>No events available.</NoEventsMessage>
                )}
            </EventList>
        </MainContainer>
    );
};

const MainContainer = styled.div`
    background-color: #060708;
    display: flex;
    flex-direction: column;
    max-width: 480px;
    min-height: 100vh;
    margin: 0 auto;
    padding: 15px;
`;

const Message = styled.div<{ success?: boolean; error?: boolean }>`
    color: ${({ success }) => (success ? '#4ecdc4' : '#ff6b6b')};
    font-size: 14px;
    text-align: center;
    padding: 10px;
    margin-top: 10px;
    background-color: ${({ success }) => (success ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 107, 107, 0.1)')};
    border-radius: 4px;
`;

const Header = styled.header`
    display: flex;
    align-items: center;
    background-color: #060708;
    justify-content: center;
`;

const GoBackButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: #fff;
    font-size: 16px;
    margin-right: 10px;
`;

const Title = styled.span`
    font-size: 18px;
    font-weight: 600;
    background: linear-gradient(45deg, #ff6b6b, #feca57);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
`;

const EventList = styled.div`
    display: flex;
    flex-direction: column;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 24px 0;
`;

const LoadingIndicator = styled.div`
    color: #fff;
    font-size: 18px;
    text-align: center;
    padding: 20px;
`;

const NoEventsMessage = styled.div`
    color: #fff;
    font-size: 18px;
    text-align: center;
    padding: 20px;
`;

export default withAuth(EventsPage);