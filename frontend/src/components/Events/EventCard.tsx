import React, { useState } from 'react';
import styled from 'styled-components';
import Image from 'next/image';
import { EventCardProps } from '@/types/eventCardProps';

const EventCard: React.FC<EventCardProps> = ({
    eventId,
    eventName,
    eventDate,
    eventUrl,
    eventDescription,
    requestTicketCredentialsLabel,
    onClick,
    onScanQRCode,
    hasTicket,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHostLoggedIn, setIsHostLoggedIn] = useState(false);
    const [adminCode, setAdminCode] = useState('');

    const toggleExpansion = () => setIsExpanded(!isExpanded);

    const handleHostLogin = () => {
        if (adminCode === 'correct-admin-code') {
            setIsHostLoggedIn(true);
        } else {
            alert('Invalid admin code');
        }
    };

    const handleScanQRCode = (eventId: string) => {
        if (isHostLoggedIn) {
            onScanQRCode(eventId, adminCode);
        } else {
            onScanQRCode(eventId);
        }
    };

    return (
        <Card $isExpanded={isExpanded}>
            <CardHeader onClick={toggleExpansion}>
                <EventName>{eventName}</EventName>
                <DateAndArrow>
                    <EventDate>{eventDate}</EventDate>
                    <ArrowIcon>
                        <Image
                            src="/down-arrow.svg"
                            alt="Expand"
                            width={16}
                            height={16}
                            style={{
                                transform: isExpanded
                                    ? 'rotate(180deg)'
                                    : 'rotate(0deg)',
                                transition: 'transform 0.3s ease',
                            }}
                        />
                    </ArrowIcon>
                </DateAndArrow>
            </CardHeader>
            <CardBody $isExpanded={isExpanded}>
                <EventUrl href={eventUrl} target="_blank">
                    Event Link
                </EventUrl>
                <EventDescription>{eventDescription}</EventDescription>
                <ButtonGroup>
                <RequestTicketCredentialsButton
                    onClick={() => onClick(eventId)}
                    disabled={hasTicket}
                >
                    {hasTicket ? "Ticket Obtained" : requestTicketCredentialsLabel}
                </RequestTicketCredentialsButton>
                    <ScanQRCodeButton onClick={() => handleScanQRCode(eventId)}>
                        Scan QR Code
                    </ScanQRCodeButton>
                </ButtonGroup>
                {!isHostLoggedIn && (
                    <HostLoginContainer>
                        <AdminCodeInput
                            type="text"
                            placeholder="Enter admin code"
                            value={adminCode}
                            onChange={(e) => setAdminCode(e.target.value)}
                        />
                        <HostLoginButton onClick={handleHostLogin}>
                            Host Login
                        </HostLoginButton>
                    </HostLoginContainer>
                )}
            </CardBody>
        </Card>
    );
};

const Card = styled.div<{ $isExpanded: boolean }>`
    background-color: #1e1e1e;
    color: #fff;
    border-radius: 16px;
    margin: 24px 0;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    transform: ${(props) => (props.$isExpanded ? 'scale(1.02)' : 'scale(1)')};
    &:hover {
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
    }
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
`;

const EventName = styled.h4`
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    background: linear-gradient(45deg, #ff6b6b, #feca57);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
`;

const DateAndArrow = styled.div`
    display: flex;
    align-items: center;
`;

const EventDate = styled.span`
    color: rgba(255, 255, 255, 0.7);
    margin-right: 12px;
    font-size: 14px;
`;

const ArrowIcon = styled.div`
    display: flex;
    align-items: center;
`;

const CardBody = styled.div<{ $isExpanded: boolean }>`
    display: ${(props) => (props.$isExpanded ? 'block' : 'none')};
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
`;

const EventUrl = styled.a`
    color: #4ecdc4;
    text-decoration: none;
    margin-bottom: 16px;
    display: inline-block;
    font-weight: 500;
    &:hover {
        text-decoration: underline;
    }
`;

const EventDescription = styled.p`
    margin: 16px 0;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
`;

const ButtonGroup = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 24px;
`;

const Button = styled.button`
    border: none;
    border-radius: 12px;
    padding: 12px 24px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    &:active {
        transform: translateY(0);
    }
`;

const RequestTicketCredentialsButton = styled(Button)<{ disabled: boolean }>`
    background: ${props => props.disabled ? '#888' : 'linear-gradient(45deg, #ff6b6b, #feca57)'};
    color: white;
    opacity: ${props => props.disabled ? 0.7 : 1};
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};

    &:hover {
        transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
        box-shadow: ${props => props.disabled ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.2)'};
    }
`;

const ScanQRCodeButton = styled(Button)`
    background: linear-gradient(45deg, #4ecdc4, #45b7d8);
    color: white;
`;

const HostLoginContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin-top: 24px;
`;

const AdminCodeInput = styled.input`
    padding: 12px;
    margin-bottom: 12px;
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

const HostLoginButton = styled(Button)`
    background: linear-gradient(45deg, #45b7d8, #4ecdc4);
    color: white;
`;

export default EventCard;
