import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import Image from 'next/image';
import withAuth from '@/components/withAuth';
import { DefaultApi, Configuration, FetchAPI, TicketCredential } from '@/api';
import { getToken } from '@/utils/auth';
import QRCode from 'react-qr-code';
import {
    prepare,
    credential,
    credType,
    errors,
    user,
    utils,
    issuer,
} from '@galxe-identity-protocol/sdk';
import { ethers } from 'ethers';
import { decryptValue } from '@/utils/utils';

const CredentialsPage: React.FC = () => {
    const router = useRouter();
    const [ticketCredentials, setTicketCredentials] = useState<
        TicketCredential[]
    >([]);
    const [eventNames, setEventNames] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [qrCodeValues, setQrCodeValues] = useState<Record<string, string>>(
        {},
    );
    const [isGeneratingProof, setIsGeneratingProof] = useState<
        Record<string, boolean>
    >({});

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

    useEffect(() => {
        const fetchTicketCredentials = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const credentials = await api.userMeTicketCredentialsGet();
                setTicketCredentials(credentials);

                const uniqueEventIds = Array.from(
                    new Set(
                        credentials.map((cred) => cred.eventId).filter(Boolean),
                    ),
                );
                const names: Record<string, string> = {};
                await Promise.all(
                    uniqueEventIds.map(async (eventId) => {
                        if (eventId) {
                            const event = await api.eventsEventIdGet({
                                eventId,
                            });
                            names[eventId] = event.name ?? 'Unknown Event';
                        }
                    }),
                );
                setEventNames(names);
            } catch (error) {
                console.error('Error fetching ticket credentials:', error);
                setError(
                    'Failed to fetch ticket credentials. Please try again later.',
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchTicketCredentials();
    }, [api]);

    const handleGenerateProof = async (ticket: TicketCredential) => {
        const eventId = ticket.eventId || 'unknown';
        setIsGeneratingProof((prev) => ({ ...prev, [eventId]: true }));
        setError(null);
        try {
            console.log('Generate proof for:', ticket);
            const proofData = await generateProof(ticket, api);
            setQrCodeValues((prev) => ({
                ...prev,
                [eventId]: proofData,
            }));
        } catch (error) {
            console.error('Error generating proof:', error);
            setError('Failed to generate proof. Please try it again.');
        } finally {
            setIsGeneratingProof((prev) => ({ ...prev, [eventId]: false }));
        }
    };

    const generateProof = async (
        ticket: TicketCredential,
        api: DefaultApi,
    ): Promise<string> => {
        try {
            await prepare();

            const provider = new ethers.JsonRpcProvider(
                'https://cloudflare-eth.com',
            );

            const u = new user.User();
            const userDetails = await api.userMeGet();

            if (
                !userDetails.encryptedIdentitySecret ||
                !userDetails.encryptedInternalNullifier
            ) {
                throw new Error('User details are incomplete');
            }

            const hashedPassword = localStorage.getItem('auth_password');
            if (!hashedPassword) {
                throw new Error('Authentication password not found');
            }

            const decryptedIdentitySecret = decryptValue(
                userDetails.encryptedIdentitySecret,
                hashedPassword,
            );
            const decryptedInternalNullifier = decryptValue(
                userDetails.encryptedInternalNullifier,
                hashedPassword,
            );

            const identitySlice: user.IdentitySlice = {
                identitySecret: BigInt(decryptedIdentitySecret),
                internalNullifier: BigInt(decryptedInternalNullifier),
                domain: 'evm',
            };

            u.addIdentitySlice(identitySlice);
            console.log(
                'User set up successfully with decrypted identity slice.',
            );

            const identityCommitment = u.getIdentityCommitment('evm');
            if (!identityCommitment) {
                throw new Error('Failed to get identity commitment');
            }
            console.log('Identity commitment:', identityCommitment.toString());

            if (!ticket.data) {
                throw new Error('Ticket data is missing');
            }
            const ticketData = JSON.parse(ticket.data);
            console.log('Ticket data parsed:', ticketData);

            const unitTypeSpec = credType.primitiveTypes.unit;
            const unitType = errors.unwrap(
                credType.createTypeFromSpec(unitTypeSpec),
            );
            console.log('Credential type created successfully.');

            // Currently, the context string is hardcoded to "Event Ticket: <event_id>"
            // so that the context ID is deterministic for the same event ID
            // const contextString = ticketData.header.context;
            const contextString = `Event Ticket: ${ticket.eventId || 'unknown'}`;
            const contextID = credential.computeContextID(contextString);

            // Create a credential object from the ticket data
            const cred = errors.unwrap(
                credential.Credential.create(
                    {
                        type: unitType,
                        contextID: contextID,
                        userID: BigInt(ticketData.header.id),
                    },
                    {}, // Empty object for unit type
                ),
            );
            console.log('Credential object created successfully:', cred);

            // Add the event ID as an attachment to uniquely identify the credential
            cred.attachments['event_id'] = ticket.eventId || 'unknown';

            // Add a signature to the credential
            const dummyIssuerEvmAddr =
                '0x15f4a32c40152a0f48E61B7aed455702D1Ea725e';
            const dummyKey = utils.decodeFromHex(
                '0xfd60ceb442aca7f74d2e56c1f0e93507798e8a6e02c4cd1a5585a36167fa7b03',
            );
            const myIssuer = new issuer.BabyzkIssuer(
                dummyKey,
                BigInt(dummyIssuerEvmAddr),
                BigInt(1),
            ); // mainnet
            myIssuer.sign(cred, {
                sigID: BigInt(100),
                expiredAt: BigInt(
                    Math.ceil(new Date().getTime() / 1000) + 7 * 24 * 60 * 60,
                ), // 7 days from now
                identityCommitment: identityCommitment,
            });
            console.log('Signature added to the credential');

            // Set up proof generation parameters
            const externalNullifier =
                utils.computeExternalNullifier(contextString);
            const expiredAtLowerBound = BigInt(
                Math.ceil(new Date().getTime() / 1000) + 3 * 24 * 60 * 60,
            );
            const equalCheckId = BigInt(0);
            const pseudonym = BigInt('0xdeadbeef');
            console.log('Proof generation parameters set up successfully.');

            console.log('Downloading proof generation gadgets...');
            const proofGenGadgets =
                await user.User.fetchProofGenGadgetsByTypeID(
                    cred.header.type,
                    provider,
                );
            console.log('Proof generation gadgets downloaded successfully.');

            // Generate the proof using genBabyzkProofWithQuery
            const proof = await u.genBabyzkProofWithQuery(
                identityCommitment,
                cred,
                proofGenGadgets,
                `
        {
          "conditions": [],
          "options": {
            "expiredAtLowerBound": "${expiredAtLowerBound}",
            "externalNullifier": "${externalNullifier}",
            "equalCheckId": "${equalCheckId}",
            "pseudonym": "${pseudonym}"
          }
        }
        `,
            );
            console.log('Proof generated successfully.');

            console.log('Generating proof with the following parameters:');
            console.log('Type ID:', cred.header.type.toString());
            console.log('Context ID:', contextID.toString());
            console.log('Context String:', contextString);
            console.log('Issuer ID:', BigInt(dummyIssuerEvmAddr).toString());

            const proofString = JSON.stringify(proof);
            console.log('Proof converted to string successfully.');

            return proofString;
        } catch (error) {
            console.error('Error generating proof:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
            throw new Error('Failed to generate proof');
        }
    };

    const handleDownloadQR = (eventId: string | undefined) => {
        const id = eventId || 'unknown';
        const svg = document.getElementById(`qr-code-${id}`);

        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new window.Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = 'qr-code.png';
                downloadLink.href = pngFile;
                downloadLink.click();
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        }
    };

    return (
        <PageContainer>
            <Header>
                <PlanetOverlay>
                    <Image
                        src="/planet.svg"
                        alt="Planet"
                        width={200}
                        height={200}
                    />
                </PlanetOverlay>
                <GoBackButton onClick={() => router.push('/dashboard')}>
                    <Image
                        src="/left-arrow.svg"
                        alt="go back"
                        width={20}
                        height={20}
                    />
                    <span>Homepage</span>
                </GoBackButton>
            </Header>
            <MainContainer>
                <Title>Ticket Credentials</Title>
                {isLoading ? (
                    <LoadingIndicator>Loading...</LoadingIndicator>
                ) : error ? (
                    <ErrorMessage>{error}</ErrorMessage>
                ) : (
                    <CredentialSection>
                        {ticketCredentials.length > 0 ? (
                            ticketCredentials.map((ticket, index) => (
                                <CredentialItem key={index}>
                                    <p>
                                        Event:{' '}
                                        {eventNames[ticket.eventId ?? ''] ??
                                            'Unknown Event'}
                                    </p>
                                    <p>
                                        Issued At:{' '}
                                        {new Date(
                                            ticket.issuedAt ?? '',
                                        ).toLocaleString()}
                                    </p>
                                    <p>
                                        Expires At:{' '}
                                        {new Date(
                                            ticket.expireAt ?? '',
                                        ).toLocaleString()}
                                    </p>
                                    <GenerateProofButton
                                        onClick={() =>
                                            handleGenerateProof(ticket)
                                        }
                                        loading={
                                            !!isGeneratingProof[
                                                ticket.eventId || 'unknown'
                                            ]
                                        }
                                        disabled={
                                            !!isGeneratingProof[
                                                ticket.eventId || 'unknown'
                                            ]
                                        }
                                    >
                                        {isGeneratingProof[
                                            ticket.eventId || 'unknown'
                                        ]
                                            ? 'Generating...'
                                            : 'Generate Proof'}
                                    </GenerateProofButton>
                                    {qrCodeValues[ticket.eventId ?? ''] && (
                                        <QRCodeContainer>
                                            <QRCode
                                                id={`qr-code-${ticket.eventId || 'unknown'}`}
                                                value={
                                                    qrCodeValues[
                                                        ticket.eventId || ''
                                                    ] || ''
                                                }
                                                size={256}
                                            />
                                            <DownloadButton
                                                onClick={() =>
                                                    handleDownloadQR(
                                                        ticket.eventId ||
                                                            'unknown',
                                                    )
                                                }
                                            >
                                                <Image
                                                    src="/download-icon.svg"
                                                    alt="Download QR"
                                                    width={24}
                                                    height={24}
                                                />
                                            </DownloadButton>
                                        </QRCodeContainer>
                                    )}
                                </CredentialItem>
                            ))
                        ) : (
                            <NoCredentialText>
                                No ticket credentials found. Please go to the
                                Events page to request a ticket credential.
                            </NoCredentialText>
                        )}
                    </CredentialSection>
                )}
            </MainContainer>
            <Footer>
                <Image
                    src="/proof-summer-icon.svg"
                    alt="Proof Summer"
                    width={187}
                    height={104}
                />
            </Footer>
        </PageContainer>
    );
};

const PageContainer = styled.div`
    min-height: 100vh;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    max-width: 480px;
    margin: 0 auto;
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

const MainContainer = styled.main`
    color: #000;
    padding: 24px;
    flex-grow: 1;
`;

const Title = styled.h1`
    font-size: 28px;
    font-weight: 800;
    color: #ff8151;
    margin: 0 0 24px 0;
    text-align: center;
`;

const CredentialSection = styled.div`
    margin: 24px 0;
`;

const CredentialItem = styled.div`
    background-color: #f5f5f5;
    padding: 16px;
    margin: 16px 0;
    border-radius: 8px;
    color: #000;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
`;

const GenerateProofButton = styled.button<{ loading?: boolean }>`
    background-color: ${({ loading }) => (loading ? '#A3AAB8' : '#FF8151')};
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    cursor: ${({ loading }) => (loading ? 'not-allowed' : 'pointer')};
    font-weight: 600;
    transition: all 0.3s ease;
    margin-top: 8px;
    &:hover {
        opacity: ${({ loading }) => (loading ? 1 : 0.9)};
    }
`;

const QRCodeContainer = styled.div`
    display: flex;
    align-items: space-between;
    margin-top: 16px;
    position: relative;
    width: 100%;
`;

const DownloadButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    padding: 8px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease;

    &:hover {
        background-color: rgba(0, 0, 0, 0.2);
    }
`;

const NoCredentialText = styled.p`
    color: #a3aab8;
    font-size: 16px;
`;

const LoadingIndicator = styled.div`
    color: #000;
    font-size: 18px;
    text-align: center;
    margin-top: 20px;
`;

const ErrorMessage = styled.div`
    color: #ff6b6b;
    font-size: 18px;
    text-align: center;
    margin-top: 20px;
`;

const Footer = styled.footer`
    display: flex;
    justify-content: center;
    padding: 20px;
`;

export default withAuth(CredentialsPage);
