export interface EventCardProps {
   eventId: string;
   eventName: string;
   eventStartDate: string;
   eventEndDate: string;
   eventUrl: string;
   eventDescription: string;
   onClick: () => void;
}