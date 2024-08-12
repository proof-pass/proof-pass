/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { DefaultApi, Configuration, FetchAPI, CreateEventRequest } from '@/api';
import { getToken } from '@/utils/auth';
import { EventForm } from '../../components/Events/EventForm/EventForm';

const AddEventsPage: React.FC = () => {
    const router = useRouter();
    
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

    const handleSubmit = async (eventData: CreateEventRequest) => {
        try {
            await api.eventsPost({ createEventRequest: eventData });
            router.push('/events');
        } catch (error) {
            console.error('Error creating event:', error);
        }
    }

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
            <EventForm onSubmit={handleSubmit} />
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

const SVGIconSpace = styled.div`
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding: 20px;
`;

export default AddEventsPage;
