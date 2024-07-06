import React from 'react';
import styled from 'styled-components';
import { EventCardProps } from '@/types/eventCardProps';

const EventCard: React.FC<EventCardProps> = ({
    eventName,
    eventStartDate,
    eventEndDate,
    eventUrl,
    eventDescription,
    onClick
}) => {
    return (
        <CardContainer onClick={onClick}>
            <EventHeader>
                <EventName>{eventName}</EventName>
                <EventLink href={eventUrl}>Event Link</EventLink>
            </EventHeader>
            <EventDate>{eventStartDate} - {eventEndDate}</EventDate>
            <EventDescription>{eventDescription}</EventDescription>
        </CardContainer>
    );
};

const CardContainer = styled.div`
    background-color: #fff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: pointer;
`;

const EventHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

const EventName = styled.h2`
    font-size: 20px;
    font-weight: 700;
    color: #FF8151;
    margin: 0;
`;

const EventLink = styled.a`
    color: #5EB7FF;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
`;

const EventDate = styled.p`
    font-size: 12px;
    color: #A3AAB8;
    margin-bottom: 10px;
`;

const EventDescription = styled.p`
    font-size: 14px;
    color: rgba(100, 100, 100, 0.8);
    line-height: 1.4;
`;

export default EventCard;