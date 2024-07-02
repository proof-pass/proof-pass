export interface OverlayCardProps {
    title: string;
    description?: string;
    onClose: () => void;
    imageUrl?: string;
    onLogout?: () => void;
    logoutButtonLabel?: string;
    children?: React.ReactNode;
}
