import { Event } from '@/api';

export interface EventCardProps {
    eventId: string;
    eventName: string;
    eventDate: string;
    eventUrl: string;
    eventDescription: string;
    requestTicketCredentialsLabel: string;
    onClick: (eventId: string) => void;
    onScanQRCode: (eventId: string, adminCode?: string) => void;
    fetchEventDetails: (eventId: string) => Promise<Event>;
}