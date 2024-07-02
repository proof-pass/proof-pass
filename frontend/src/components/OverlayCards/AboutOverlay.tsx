import React from 'react';
import styled from 'styled-components';
import OverlayCard from './OverlayCard';
import { AboutOverlayProps } from '@/types/aboutOverlayProps';

const AboutOverlay: React.FC<AboutOverlayProps> = ({ onClose }) => {
    return (
        <OverlayCard title="About the Project" onClose={onClose}>
            <ContentContainer>
                <ContentItem>
                    <Label>About:</Label>
                    <Content>Explore our amazing project!</Content>
                </ContentItem>
            </ContentContainer>
        </OverlayCard>
    );
};

const ContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

const ContentItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-color: #1e1e1e;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
`;

const Label = styled.strong`
    color: #ffffff;
    font-weight: 600;
    font-size: 16px;
`;

const Content = styled.div`
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
`;

export default AboutOverlay;
