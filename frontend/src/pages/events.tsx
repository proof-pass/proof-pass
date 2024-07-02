import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import EventCard from '@/components/Events/EventCard';
import withAuth from '@/components/withAuth';
import { DefaultApi, Event, Configuration, FetchAPI } from '@/api';
import { getToken } from '@/utils/auth'; 

const EventsPage: React.FC = () => {
    const router = useRouter();
    const [eventList, setEventList] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Memoize the API instance with the auth token
    // to prevent re-creating the API instance on every render

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
        setError(null);
        try {
            const response = await api.eventsGet();
            setEventList(response);
        } catch (error) {
            console.error('Error fetching events:', error);
            setError('Failed to fetch events. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [api]);

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
            
            // Step 1: Request the ticket credential
            const ticketCredential = await api.eventsEventIdRequestTicketCredentialPost({
                eventId: eventId
            });
            console.log('Ticket credential requested successfully:', ticketCredential);
            
            // Step 2: Store the ticket credential
            if (ticketCredential) {
                await api.userMeTicketCredentialPut({
                    putTicketCredentialRequest: {
                        id: ticketCredential.id ?? '',
                        eventId: ticketCredential.eventId ?? '',
                        data: ticketCredential.credential ?? '',
                        issuedAt: ticketCredential.issuedAt ?? new Date(),
                        expireAt: ticketCredential.expireAt ?? new Date(),
                    }
                });
                console.log('Ticket credential stored successfully');
            } else {
                throw new Error('Failed to request ticket credential');
            }
            
            // Refresh the event list
            await fetchEvents();
        } catch (error) {
            console.error('Error requesting or storing ticket credential:', error);
            setError('Failed to request or store ticket credential. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [api, fetchEvents]);

    const handleScanQRCode = useCallback((eventId: string) => {
        console.log('Initiate QR Code Scan for event:', eventId);
        router.push(`/scan-qr?eventId=${eventId}`);
    }, [router]);

    return (
        <MainContainer>
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
                ) : error ? (
                    <ErrorMessage>{error}</ErrorMessage>
                ) : eventList.length > 0 ? (
                    eventList.map((event) => (
                        <EventCard
                            key={event.id ?? ''}
                            eventId={event.id ?? ''}
                            eventName={event.name ?? ''}
                            eventDate={new Date().toLocaleDateString()} 
                            eventUrl={event.url ?? ''}
                            eventDescription={event.description ?? ''}
                            requestTicketCredentialsLabel="Request Credential"
                            onClick={handleRequestTicketCredential}
                            onScanQRCode={handleScanQRCode}
                            fetchEventDetails={fetchEventDetails}
                        />
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

const ErrorMessage = styled.div`
    color: #ff6b6b;
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