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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const response = await api.eventsGet();
            setEventList(response);
        } catch (error) {
            console.error('Error fetching events:', error);
            setErrorMessage('Failed to fetch events. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleEventClick = (eventId: string) => {
        router.push(`/events/${eventId}`);
    };

    const formatDescription = (description: string) => {
        // Split the description into lines, preserving original line breaks
        const lines = description.split('\n');

        return lines.map((line, index) => {
            // Trim each line to remove any leading/trailing whitespace
            const trimmedLine = line.trim();
            if (trimmedLine === 'Schedule:') {
                // Make "Schedule:" bold
                return (
                    <React.Fragment key={index}>
                        <strong>{trimmedLine}</strong>
                        <br />
                    </React.Fragment>
                );
            } else if (/^\d{1,2}:\d{2}\s?[AP]M/.test(trimmedLine)) {
                // Make time entries bold
                const [time, ...rest] = trimmedLine.split(' - ');
                return (
                    <React.Fragment key={index}>
                        <strong>{time}</strong> - {rest.join(' - ')}
                        <br />
                    </React.Fragment>
                );
            } else {
                // Regular line
                return (
                    <React.Fragment key={index}>
                        {trimmedLine}
                        <br />
                    </React.Fragment>
                );
            }
        });
    };

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
                    <span>Home</span>
                </GoBackButton>
                <PlanetOverlay>
                    <Image
                        src="/planet.svg"
                        alt="Planet"
                        width={200}
                        height={200}
                    />
                </PlanetOverlay>
            </Header>
            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
            <EventList>
                {isLoading ? (
                    <LoadingIndicator>Loading events...</LoadingIndicator>
                ) : eventList.length > 0 ? (
                    eventList.map((event) => (
                        <EventCard
                            key={event.id}
                            eventId={event.id ?? ''}
                            eventName={event.name ?? ''}
                            eventStartDate="July 8, 2024"
                            eventEndDate="July 11, 2024"
                            eventUrl={event.url ?? '#'}
                            eventDescription={formatDescription(
                                event.description ?? '',
                            )}
                            onClick={() => handleEventClick(event.id ?? '')}
                        />
                    ))
                ) : (
                    <NoEventsMessage>No events available.</NoEventsMessage>
                )}
            </EventList>
            <SVGIconSpace>
                <Image
                    src="/proof-summer-icon.svg"
                    alt="proof-summer"
                    width={187}
                    height={104}
                />
            </SVGIconSpace>
        </MainContainer>
    );
};

const MainContainer = styled.div`
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

const EventList = styled.div`
    display: flex;
    flex-direction: column;
    padding: 20px;
`;

const ErrorMessage = styled.div`
    color: #ff6b6b;
    background-color: rgba(255, 107, 107, 0.1);
    border: 1px solid #ff6b6b;
    border-radius: 4px;
    padding: 10px;
    margin: 20px;
    text-align: center;
`;

const LoadingIndicator = styled.div`
    color: #000;
    font-size: 18px;
    text-align: center;
    padding: 20px;
`;

const NoEventsMessage = styled.div`
    color: #000;
    font-size: 18px;
    text-align: center;
    padding: 20px;
`;

const SVGIconSpace = styled.div`
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding: 20px;
`;

export default withAuth(EventsPage);
