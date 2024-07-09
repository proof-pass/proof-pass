import React from 'react';
import styled from 'styled-components';
import OverlayCard from './OverlayCard';
import { AboutOverlayProps } from '@/types/aboutOverlayProps';

const AboutOverlay: React.FC<AboutOverlayProps> = ({ onClose }) => {
    return (
        <OverlayCard title="About the Project" onClose={onClose}>
            <ContentContainer>
                <ContentItem>
                    <Content>
                        <p>
                            <strong>Proof Pass</strong> is a tangible ZKP-based
                            ticketing application powered by the{' '}
                            <strong>
                                <a
                                    href="https://docs.galxe.com/identity/introduction"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Galxe Identity Protocol
                                </a>
                            </strong>{' '}
                            and{' '}
                            <strong>
                                <a
                                    href="https://nebra.one"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    NEBRA UPA
                                </a>
                            </strong>
                        </p>
                        <p>
                            It bridges the gap of email-based ticketing and ZK
                            ticket verification, making event management more
                            secure and bringing ZKP technology closer to the end
                            users.
                        </p>
                    </Content>
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
    background-color: #f5f5f5;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
`;

const Label = styled.strong`
    color: #000;
    font-weight: 600;
    font-size: 16px;
`;

const Content = styled.div`
    font-size: 16px;
    color: #000;
    line-height: 1.5;
`;

export default AboutOverlay;
