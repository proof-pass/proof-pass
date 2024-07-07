import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import Image from 'next/image';
import withAuth from '@/components/withAuth';
import {
    DefaultApi,
    Event,
    Configuration,
    FetchAPI,
    TicketCredential,
} from '@/api';
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
import { setToken } from '@/utils/auth';

const EventDetailPage: React.FC = () => {
    const router = useRouter();
    const { eventId, jwt, proof } = router.query;
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [hasTicket, setHasTicket] = useState(false);
    const [isGeneratingProof, setIsGeneratingProof] = useState<
        Record<string, boolean>
    >({});
    const [qrCodeValue, setQrCodeValue] = useState<Record<string, string>>({});
    const [proofGenerated, setProofGenerated] = useState<
        Record<string, boolean>
    >({});
    const [ticketCredential, setTicketCredential] =
        useState<TicketCredential | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [eventNotFound, setEventNotFound] = useState(false);

    const handleError = (message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    const api = useMemo(() => {
        const token = getToken() || (jwt as string);
        console.log('Token:', token);
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
    }, [jwt]);

    const handleQuickLogin = useCallback(
        async (jwt: string, proof: string) => {
            try {
                if (jwt && proof) {
                    console.log('Quick login with proof:', proof);
                    setToken(jwt);

                    let ticketCredential;

                    try {
                        ticketCredential =
                            await api.eventsEventIdRequestTicketCredentialPost({
                                eventId: eventId as string,
                            });
                    } catch (error) {
                        console.log(
                            'Failed to request new ticket credential, checking for existing one',
                        );
                        // If the request fails, check if the user already has a ticket credential
                        const credentials =
                            await api.userMeTicketCredentialsGet();
                        ticketCredential = credentials.find(
                            (cred) => cred.eventId === eventId,
                        );
                    }

                    if (ticketCredential) {
                        // If we have a ticket credential (either new or existing), proceed
                        setHasTicket(true);
                        setTicketCredential(ticketCredential);
                        setQrCodeValue((prev) => ({
                            ...prev,
                            [eventId as string]: proof,
                        }));
                        setProofGenerated((prev) => ({
                            ...prev,
                            [eventId as string]: true,
                        }));
                    } else {
                        throw new Error(
                            'Failed to find or request ticket credential',
                        );
                    }

                    window.history.replaceState(
                        {},
                        document.title,
                        `/events/${eventId}`,
                    );
                }
            } catch (error) {
                console.error('Error during quick login:', error);
                setErrorMessage('Failed to perform quick login');
            }
        },
        [eventId, api],
    );

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (eventId) {
                try {
                    const eventDetails = await api.eventsEventIdGet({
                        eventId: eventId as string,
                    });
                    if (!eventDetails) {
                        setEventNotFound(true);
                    } else {
                        setEvent(eventDetails);
                    }

                    if (jwt && proof) {
                        // Handle quick login
                        await handleQuickLogin(jwt as string, proof as string);
                    } else {
                        // Normal flow: check for existing ticket
                        const credentials =
                            await api.userMeTicketCredentialsGet();
                        const eventTicket = credentials.find(
                            (cred) => cred.eventId === eventId,
                        );
                        if (eventTicket) {
                            setHasTicket(true);
                            setTicketCredential(eventTicket);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching event details:', error);
                    setErrorMessage('Failed to fetch event details');
                    setEventNotFound(true);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchEventDetails();
    }, [eventId, jwt, proof, api, handleQuickLogin]);

    const handleRequestCredential = async () => {
        try {
            const ticketCredential =
                await api.eventsEventIdRequestTicketCredentialPost({
                    eventId: eventId as string,
                });

            if (ticketCredential) {
                await api.userMeTicketCredentialPut({
                    putTicketCredentialRequest: {
                        eventId: ticketCredential.eventId ?? '',
                        data: ticketCredential.credential ?? '',
                        issuedAt: ticketCredential.issuedAt ?? new Date(),
                        expireAt: ticketCredential.expireAt ?? new Date(),
                    },
                });
                setHasTicket(true);
                setTicketCredential(ticketCredential);
            } else {
                throw new Error('Failed to request ticket credential');
            }
        } catch (error) {
            console.error('Error requesting credential:', error);
            handleError("You haven't registered for this event");
        }
    };

    const handleGenerateProof = async () => {
        if (!ticketCredential) {
            setErrorMessage('No ticket credential available');
            return;
        }
        const eventId = ticketCredential.eventId || 'unknown';
        setIsGeneratingProof((prev) => ({ ...prev, [eventId]: true }));
        setErrorMessage(null);
        try {
            console.log('Generate proof for:', ticketCredential);
            if (!ticketCredential.data) {
                throw new Error('Ticket data is missing');
            }
            const proofData = await generateProof(ticketCredential, api);
            setQrCodeValue((prev) => ({
                ...prev,
                [eventId]: proofData,
            }));
            setProofGenerated((prev) => ({
                ...prev,
                [eventId]: true,
            }));
        } catch (error) {
            console.error('Error generating proof:', error);
            handleError(
                `Failed to generate proof: ${error instanceof Error ? error.message : String(error)}`,
            );
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
            console.log('User details fetched successfully:', userDetails);
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

            const contextString = `Event Ticket: ${ticket.eventId || 'unknown'}`;
            const contextID = credential.computeContextID(contextString);

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

            cred.attachments['chain_id'] = event?.chainId || '0';
            cred.attachments['context_id'] = event?.contextId || 'unknown';
            cred.attachments['issuer_key_id'] = event?.issuerKeyId || 'unknown';

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
                ),
                identityCommitment: identityCommitment,
            });
            console.log('Signature added to the credential');

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

            console.log('Proof:', proof);
            const proofString = JSON.stringify(proof);
            console.log('Proof converted to string successfully:', proofString);

            return proofString;
        } catch (error) {
            console.error('Error generating proof:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
            throw error;
        }
    };

    const handleHostCheckIn = () => {
        router.push(`/events/${eventId}/checkin`);
    };

    if (isLoading) return <div>Loading...</div>;
    if (eventNotFound)
        return <EventNotFoundMessage>No event found</EventNotFoundMessage>;
    if (!event) return null;

    return (
        <MainContainer>
            <Header>
                <GoBackButton onClick={() => router.push('/events')}>
                    <Image
                        src="/left-arrow.svg"
                        alt="Go back"
                        width={20}
                        height={20}
                    />
                    <span>Events</span>
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
            {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}
            <EventDetailsContainer>
                {eventNotFound ? (
                    <EventNotFoundMessage>No event found</EventNotFoundMessage>
                ) : (
                    <>
                        <EventHeader>
                            <EventName>{event?.name}</EventName>
                            <HostCheckInButton onClick={handleHostCheckIn}>
                                Event Host Check In
                            </HostCheckInButton>
                        </EventHeader>
                        <Separator />
                        <EventDate>
                            Start: July 8, 2024 - End: July 11, 2024
                        </EventDate>
                        <EventLink href="#">Event Link</EventLink>
                        <EventDescription expanded={isDescriptionExpanded}>
                            {event?.description}
                        </EventDescription>
                        <ExpandButton
                            onClick={() =>
                                setIsDescriptionExpanded(!isDescriptionExpanded)
                            }
                        >
                            {isDescriptionExpanded ? 'Show less' : 'Show more'}
                        </ExpandButton>
                        {!hasTicket ? (
                            <>
                                <RequestCredentialButton
                                    onClick={handleRequestCredential}
                                >
                                    Request Credential
                                </RequestCredentialButton>
                            </>
                        ) : (
                            <>
                                <CredentialObtainedMessage>
                                    Ticket Credential Obtained 🎉
                                </CredentialObtainedMessage>
                                {!proofGenerated[
                                    ticketCredential?.eventId || 'unknown'
                                ] ? (
                                    <GenerateProofButton
                                        onClick={handleGenerateProof}
                                        disabled={
                                            isGeneratingProof[
                                                ticketCredential?.eventId ||
                                                    'unknown'
                                            ]
                                        }
                                    >
                                        {isGeneratingProof[
                                            ticketCredential?.eventId ||
                                                'unknown'
                                        ] ? (
                                            <LoadingContent>
                                                <LoadingSpinner />
                                                <span>Generating...</span>
                                            </LoadingContent>
                                        ) : (
                                            'Generate Proof'
                                        )}
                                    </GenerateProofButton>
                                ) : (
                                    <>
                                        <ProofMessage>
                                            Proof generated, show QR code below
                                            at gate to check in. Screenshot the QR before the event as
                                            internet could be spotty!
                                        </ProofMessage>
                                        {qrCodeValue && ticketCredential && (
                                            <QRCodeContainer>
                                                <QRCode
                                                    value={
                                                        qrCodeValue[
                                                            ticketCredential.eventId ||
                                                                'unknown'
                                                        ] || ''
                                                    }
                                                    size={256}
                                                />
                                            </QRCodeContainer>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </EventDetailsContainer>
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

const ErrorBanner = styled.div`
    background-color: #ff6b6b;
    color: white;
    padding: 10px;
    text-align: center;
    font-weight: bold;
`;

const EventNotFoundMessage = styled.div`
    text-align: center;
    padding: 20px;
    font-size: 18px;
    color: #ff6b6b;
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

const EventDetailsContainer = styled.div`
    padding: 20px;
`;

const EventHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

const EventName = styled.h1`
    font-size: 18px;
    font-weight: 800;
    color: #ff8151;
    margin: 0;
`;

const EventDate = styled.p`
    font-size: 12px;
    color: #a3aab8;
    margin-bottom: 10px;
    font-weight: 600;
`;

const EventLink = styled.a`
    color: #5eb7ff;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    display: block;
    margin-bottom: 10px;
`;

const EventDescription = styled.p<{ expanded: boolean }>`
    font-size: 16px;
    line-height: 1.5;
    color: rgba(100, 100, 100, 0.8);
    margin-bottom: 20px;
    max-height: ${(props) => (props.expanded ? 'none' : '100px')};
    overflow: hidden;
    transition: max-height 0.3s ease;
`;

const HostCheckInButton = styled.button`
    background-color: #5eb7ff;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    padding: 4px 12px;
`;

const RequestCredentialButton = styled.button`
    background-color: #ff8151;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 16px;
    font-weight: 700;
    padding: 15px 32px;
    width: 100%;
    margin-top: 32px;
`;

const Separator = styled.hr`
    border: none;
    height: 1px;
    background-color: #d4d4d4;
    margin: 10px 0;
`;

const CredentialObtainedMessage = styled.p`
    font-size: 18px;
    color: #000;
    margin-bottom: 20px;
    text-align: center;
`;

const GenerateProofButton = styled.button`
    background-color: #5eb7ff;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    padding: 12px 24px;
    margin-bottom: 20px;
    width: 100%;
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};
    display: flex;
    justify-content: center;
    align-items: center;
`;

const LoadingContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`;

const LoadingSpinner = styled.div`
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top: 2px solid #4ecdc4;
    animation: spin 1s linear infinite;
    margin-right: 10px;

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;

const ProofMessage = styled.p`
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 20px;
    color: rgba(144, 151, 166, 0.6);
    text-align: center;
`;

const QRCodeContainer = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
`;

const SVGIconSpace = styled.div`
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding: 20px;
`;

const ExpandButton = styled.button`
    background: none;
    border: none;
    color: #5eb7ff;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    margin-bottom: 20px;
`;

export default withAuth(EventDetailPage, true);
