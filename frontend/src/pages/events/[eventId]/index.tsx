/* eslint-disable @typescript-eslint/no-unused-vars */

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
import { decryptValue, decryptValueUtf8, encryptValue } from '@/utils/utils';
import { setToken } from '@/utils/auth';
import ZKEmailLoginForm from '@/components/ZKEmailLoginForm';
import { useZkEmailOAuth } from '@/utils/zkEmailOauth';

const EQUAL_CHECK_ID = BigInt(0);
const PSEUDONYM = BigInt(0);
const CIRCOM_WASM_URL = 'https://storage.googleapis.com/protocol-gadgets/unit/circom.wasm';
const CIRCUIT_FINAL_ZKEY_URL = 'https://storage.googleapis.com/protocol-gadgets/unit/circuit_final.zkey';

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
    const [isRequestingCredential, setIsRequestingCredential] = useState(false);
    const [showZKEmailForm, setShowZKEmailForm] = useState(false);
    const [isRequestingNFT, setIsRequestingNFT] = useState(false);
    const [nftMinted, setNftMinted] = useState(false);

    const {
        initOauthClient,
        handleZKEmailSubmit,
        handleResetEmailProcess,
        sessionData,
        emailWalletStatus,
        emailError,
        isEmailSent,
        isConnectingEmailWallet,
        checkConnectionStatus,
    } = useZkEmailOAuth();

    useEffect(() => {
        initOauthClient();
        checkConnectionStatus();
    }, [initOauthClient, checkConnectionStatus]);

    useEffect(() => {
        if (sessionData && emailWalletStatus === 'Connected') {
            setShowZKEmailForm(false);
        }
    }, [sessionData, emailWalletStatus]);

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
                    jwt = Buffer.from(jwt, "base64").toString();
                    console.log('Quick login with jwt:', jwt);

                    proof = Buffer.from(proof, "base64").toString();
                    console.log('Quick login with proof:', proof);
                    
                    setToken(jwt);

                    // Parse the proof from the URL
                    const parsedProof = JSON.parse(proof);
                    const proofString = JSON.stringify(parsedProof);

                    // Set the QR code value directly from the parsed proof
                    setQrCodeValue((prev) => ({
                        ...prev,
                        [eventId as string]: proofString,
                    }));

                    // Mark the proof as generated
                    setProofGenerated((prev) => ({
                        ...prev,
                        [eventId as string]: true,
                    }));

                    // Set hasTicket to true since we have a valid proof
                    setHasTicket(true);

                    // Remove the jwt and proof from the URL
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
        [eventId],
    );

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (eventId) {
                try {
                    const eventDetails = await api.eventsEventIdGet({
                        eventId: eventId as string,
                    });
                    console.log(
                        'Event details in fetchEventDetails:',
                        eventDetails,
                    );
                    if (!eventDetails) {
                        console.log('!eventDetails');
                        setEventNotFound(true);
                    } else {
                        console.log('eventDetails');
                        setEvent(eventDetails);
                    }

                    // Only perform quick login if both jwt and proof are present
                    if (jwt && proof) {
                        await handleQuickLogin(jwt as string, proof as string);
                    } else {
                        // Check for existing ticket credential only if not doing quick login
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
        setIsRequestingCredential(true);
        try {
            // First, request the ticket credential
            const unencryptedTicket =
                await api.eventsEventIdRequestTicketCredentialPost({
                    eventId: eventId as string,
                });

            console.log(
                'Unencrypted ticket credential received:',
                unencryptedTicket,
            );

            if (unencryptedTicket && unencryptedTicket.credential) {
                await prepare();

                const userDetails = await api.userMeGet();

                let encryptedCred = '';
                if (userDetails.isEncrypted === true) {
                    // Encrypt the ticket credential
                    const hashedPassword =
                        localStorage.getItem('auth_password');
                    if (!hashedPassword) {
                        throw new Error('Authentication password not found');
                    }

                    const credentialString = JSON.stringify(
                        unencryptedTicket.credential,
                    );
                    encryptedCred = encryptValue(
                        credentialString,
                        hashedPassword,
                    );
                } else {
                    encryptedCred = unencryptedTicket.credential;
                }

                // Store the encrypted ticket credential
                await api.userMeTicketCredentialPut({
                    putTicketCredentialRequest: {
                        eventId: unencryptedTicket.eventId!,
                        data: encryptedCred,
                        issuedAt: unencryptedTicket.issuedAt!,
                        expireAt: unencryptedTicket.expireAt!,
                    },
                });

                console.log('Encrypted ticket credential stored successfully');

                // Fetch the stored encrypted ticket credential
                const allTicketCredentials =
                    await api.userMeTicketCredentialsGet();
                const encryptedTicket = allTicketCredentials.find(
                    (ticket) => ticket.eventId === eventId,
                );

                if (encryptedTicket && encryptedTicket.data) {
                    setHasTicket(true);
                    setTicketCredential(encryptedTicket);
                    console.log(
                        'Encrypted ticket credential retrieved:',
                        encryptedTicket,
                    );
                } else {
                    throw new Error(
                        'Failed to retrieve stored encrypted ticket data',
                    );
                }
            } else {
                throw new Error(
                    'Failed to receive unencrypted ticket credential',
                );
            }
        } catch (error) {
            console.error('Error in ticket credential process:', error);
            handleError(
                error instanceof Error
                    ? error.message
                    : 'Failed in ticket credential process',
            );
        } finally {
            setIsRequestingCredential(false);
        }
    };

    const handleRequestNFT = async () => {
        setIsRequestingNFT(true);
        console.log('sessiondata', sessionData);
        try {
            const isCheckedIn = await checkUserCheckIn(eventId as string);
            if (!isCheckedIn) {
                handleError('You must have checked in during the event to claim the NFT');
                return;
            }

            if (!sessionData) {
                setShowZKEmailForm(true);
            } else {
                await mintProofOfAttendanceNFT();
            }
        } catch (error) {
            console.error('Error requesting NFT:', error);
            handleError('Failed to request Proof of Attendance NFT');
        } finally {
            setIsRequestingNFT(false);
        }
    };

    const checkUserCheckIn = async (eventId: string): Promise<boolean> => {
        // Mock API call to check user check-in
        return new Promise<boolean>((resolve) => {
            setTimeout(() => {
                resolve(true); // Assume the user has checked in for now
            }, 1000);
        });
    };

    const mintProofOfAttendanceNFT = async () => {
        if (!sessionData) {
            handleError('Email wallet not connected');
            return;
        }

        try {
            // Mock API call to mint NFT
            const nullifier = computeNullifier(sessionData.ephemeralPrivateKey, event?.contextId || '');
            // Mock the response to be successful
            const response = {
                success: true,
                error: null,
            };

            if (response.success) {
                console.log('NFT minted successfully');
                setNftMinted(true);
                handleError('Proof of Attendance NFT minted successfully!');
            } else {
                handleError('Failed to mint NFT: ' + response.error);
            }
        } catch (error) {
            console.error('Error minting NFT:', error);
            handleError('Failed to mint Proof of Attendance NFT');
        }
    };

    const computeNullifier = (internalNullifier: string, externalNullifier: string): string => {
        // Mock nullifier computation
        return `nullifier-${internalNullifier}-${externalNullifier}`;
    };

    const handleGenerateProof = async () => {
        if (qrCodeValue[eventId as string]) {
            // If we already have a QR code value (from quick login), just set it as generated
            setProofGenerated((prev) => ({
                ...prev,
                [eventId as string]: true,
            }));
            return;
        }

        if (!ticketCredential) {
            console.error('No ticket credential available');
            setErrorMessage('No ticket credential available');
            return;
        }

        setIsGeneratingProof((prev) => ({
            ...prev,
            [eventId as string]: true,
        }));
        setErrorMessage(null);
        try {
            console.log('Generate proof for:', ticketCredential);
            if (!ticketCredential.data) {
                console.error('Ticket data is missing');
                throw new Error('Ticket data is missing');
            }
            const proofData = await generateProof(ticketCredential, api);
            setQrCodeValue((prev) => ({
                ...prev,
                [eventId as string]: proofData,
            }));
            setProofGenerated((prev) => ({
                ...prev,
                [eventId as string]: true,
            }));
        } catch (error) {
            console.error('Error generating proof:', error);
            handleError(
                `Failed to generate proof: ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            setIsGeneratingProof((prev) => ({
                ...prev,
                [eventId as string]: false,
            }));
        }
    };

    const generateProof = async (
        ticket: TicketCredential,
        api: DefaultApi,
    ): Promise<string> => {
        try {
            await prepare();

            const userDetails = await api.userMeGet();

            if (
                !userDetails.encryptedIdentitySecret ||
                !userDetails.encryptedInternalNullifier
            ) {
                throw new Error('User details are incomplete');
            }
            console.log('User details fetched successfully:', userDetails);
            if (!ticket.data) {
                throw new Error('Ticket data is missing');
            }

            let decryptedIdentitySecret = '';
            let decryptedInternalNullifier = '';
            let decryptedTicketData = '';
            let ticketData;
            if (userDetails.isEncrypted === true) {
                const hashedPassword = localStorage.getItem('auth_password');
                console.log('In is encrypted Hash password:', hashedPassword);
                if (!hashedPassword) {
                    throw new Error('Authentication password not found');
                }
                decryptedIdentitySecret = decryptValue(
                    userDetails.encryptedIdentitySecret,
                    hashedPassword,
                );
                decryptedInternalNullifier = decryptValue(
                    userDetails.encryptedInternalNullifier,
                    hashedPassword,
                );

                // Decrypt the ticket data
                decryptedTicketData = decryptValueUtf8(
                    ticket.data,
                    hashedPassword,
                );
                console.log('Decrypted ticket data:', decryptedTicketData);

                try {
                    // Parse the decrypted ticket data, which is a string representation of JSON
                    ticketData = JSON.parse(decryptedTicketData);

                    // Parse the inner JSON string
                    ticketData = JSON.parse(ticketData);
                } catch (error) {
                    console.error(
                        'Error parsing decrypted ticket data:',
                        error,
                    );
                    throw new Error('Invalid ticket data format');
                }
            } else {
                console.log('In is not encrypted');
                decryptedIdentitySecret = userDetails.encryptedIdentitySecret;
                decryptedInternalNullifier =
                    userDetails.encryptedInternalNullifier;
                try {
                    // Parse the decrypted ticket data, which is a string representation of JSON
                    ticketData = JSON.parse(ticket.data);
                } catch (error) {
                    console.error(
                        'Error parsing decrypted ticket data:',
                        error,
                    );
                    throw new Error('Invalid ticket data format');
                }
            }

            console.log('Decrypted Identity Secret:', decryptedIdentitySecret);
            console.log(
                'Decrypted Internal Nullifier:',
                decryptedInternalNullifier,
            );
            console.log('Decrypted ticket data:', ticketData);

            let identitySecretBigInt: bigint | undefined;
            let internalNullifierBigInt: bigint | undefined;

            try {
                identitySecretBigInt = BigInt(decryptedIdentitySecret);
                internalNullifierBigInt = BigInt(decryptedInternalNullifier);

                console.log(
                    'Identity Secret as BigInt:',
                    identitySecretBigInt.toString(),
                );
                console.log(
                    'Internal Nullifier as BigInt:',
                    internalNullifierBigInt.toString(),
                );
            } catch (error) {
                console.error(
                    'Error converting decrypted values to BigInt:',
                    error,
                );
                throw new Error('Decrypted values are not valid numbers');
            }

            const identitySlice: user.IdentitySlice = {
                identitySecret: identitySecretBigInt,
                internalNullifier: internalNullifierBigInt,
                domain: 'evm',
            };

            const u = new user.User();
            u.addIdentitySlice(identitySlice);
            console.log(
                'User set up successfully with decrypted identity slice.',
            );

            const identityCommitment = u.getIdentityCommitment('evm');
            if (!identityCommitment) {
                throw new Error('Failed to get identity commitment');
            }
            console.log('Identity commitment:', identityCommitment.toString());
            console.log('Ticket credential:', ticket.data);

            if (!ticket.data) {
                throw new Error('Ticket data is missing');
            }

            console.log('Raw ticket data before decryption:', ticket.data);

            const unitTypeSpec = credType.primitiveTypes.unit;
            const unitType = errors.unwrap(
                credType.createTypeFromSpec(unitTypeSpec),
            );
            console.log('Credential type created successfully.');

            const contextString = event!.contextId!;
            const contextID = credential.computeContextID(contextString);

            console.log('Preparing to generate proof with the following data:');
            console.log(
                'Parsed ticket data:',
                JSON.stringify(ticketData, null, 2),
            );
            // Check if ticketData has the expected structure
            if (!ticketData || !ticketData.header || !ticketData.header.id) {
                console.error('Ticket data is missing expected properties');
                throw new Error('Invalid ticket data structure');
            }

            console.log(JSON.stringify(ticketData, null, 2));

            const cred = errors.unwrap(
                credential.Credential.unmarshal(
                    unitType,
                    JSON.stringify(ticketData, null, 2),
                ),
            );

            const externalNullifier =
                utils.computeExternalNullifier(contextString);

            const eventEndDate = event!.endDate!.getTime();
            // Set the expiration date to 24 hours after the event end date
            const expiredAtLowerBound = BigInt(1723899000);

            console.log('Proof generation parameters set up successfully.');

            console.log('Downloading proof generation gadgets...');
            // const proofGenGadgets =
            //     await user.User.fetchProofGenGadgetsByTypeID(
            //         cred.header.type,
            //         provider,
            //     );
            const proofGenGadgets = await user.User.fetchProofGenGadgetByURIs(CIRCOM_WASM_URL, CIRCUIT_FINAL_ZKEY_URL);

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
                    "equalCheckId": "${EQUAL_CHECK_ID}",
                    "pseudonym": "${PSEUDONYM}"
                }
                }
                `,
            );
            console.log('Proof generated successfully.');

            console.log('Generating proof with the following parameters:');
            console.log('Type ID:', cred.header.type.toString());
            console.log('Context ID:', contextID.toString());
            console.log('Context String:', contextString);
            // console.log('Issuer ID:', BigInt(dummyIssuerEvmAddr).toString());

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

    const formatDescription = (description: string) => {
        // Split the description into lines, preserving original line breaks
        const lines = description.split('\n');

        return lines.map((line, index) => {
            // Trim each line to remove any leading/trailing whitespace
            const trimmedLine = line.trim();
            if (trimmedLine === 'Schedule:') {
                // Make "Schedule:" bold
                return (
                    <React.Fragment key={index}>
                        <strong>{trimmedLine}</strong>
                        <br />
                    </React.Fragment>
                );
            } else if (/^\d{1,2}:\d{2}\s?[AP]M/.test(trimmedLine)) {
                // Make time entries bold
                const [time, ...rest] = trimmedLine.split(' - ');
                return (
                    <React.Fragment key={index}>
                        <strong>{time}</strong> - {rest.join(' - ')}
                        <br />
                    </React.Fragment>
                );
            } else {
                // Regular line
                return (
                    <React.Fragment key={index}>
                        {trimmedLine}
                        <br />
                    </React.Fragment>
                );
            }
        });
    };

    const handleZKEmailSubmitWrapper = async (email: string, username: string | null, isSignUp: boolean) => {
        const success = await handleZKEmailSubmit(email, username, isSignUp);
        if (success) {
            setShowZKEmailForm(false);
            checkConnectionStatus(); 
        }
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
                <EventHeader>
                    <EventName>{event?.name}</EventName>
                    <HostCheckInButton onClick={handleHostCheckIn}>
                        Event Host Check In
                    </HostCheckInButton>
                </EventHeader>
                <Separator />
                <EventInfoRow>
                    <EventDate>
                        Start: {event?.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'} - End: {event?.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A'}
                    </EventDate>
                    <EventLinkContainer>
                        <EventLink
                            href={event?.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Event Details
                            <ExternalLinkIcon>
                                <Image
                                    src="/link-icon.svg"
                                    alt="External Link"
                                    width={14}
                                    height={14}
                                />
                            </ExternalLinkIcon>
                        </EventLink>
                    </EventLinkContainer>
                </EventInfoRow>
                <EventDescription expanded={isDescriptionExpanded}>
                    {formatDescription(event?.description || '')}
                </EventDescription>
                <ExpandButton
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                    {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </ExpandButton>
                <EmailWalletStatus>
                    Email Wallet Status: {emailWalletStatus}
                </EmailWalletStatus>
                {!hasTicket ? (
                    <RequestCredentialButton
                        onClick={handleRequestCredential}
                        disabled={isRequestingCredential}
                    >
                        {isRequestingCredential ? (
                            <LoadingContent>
                                <LoadingSpinner />
                                <span>Requesting...</span>
                            </LoadingContent>
                        ) : (
                            'Request Credential'
                        )}
                    </RequestCredentialButton>
                ) : (
                    <>
                        <CredentialObtainedMessage>
                            Ticket Credential Obtained
                            <CelebrationIcon>
                                <Image
                                    src="/confirm-icon.svg"
                                    alt="Celebration"
                                    width={24}
                                    height={24}
                                />
                            </CelebrationIcon>
                        </CredentialObtainedMessage>
                        <RequestProofOfAttendanceNFTButton
                            onClick={handleRequestNFT}
                            disabled={isRequestingNFT || nftMinted}
                        >
                            {isRequestingNFT ? (
                                <LoadingContent>
                                    <LoadingSpinner />
                                    <span>Preparing...</span>
                                </LoadingContent>
                            ) : nftMinted ? (
                                'NFT Claimed'
                            ) : (
                                'Mint Proof of Attendance NFT'
                            )}
                        </RequestProofOfAttendanceNFTButton>
                        <NFTExplanation>
                            Only users who checked in during the event will have access to mint the Proof of Attendance NFT.
                        </NFTExplanation>
                        <GenerateProofButton
                            onClick={handleGenerateProof}
                            disabled={isGeneratingProof[eventId as string]}
                        >
                            {isGeneratingProof[eventId as string] ? (
                                <LoadingContent>
                                    <LoadingSpinner />
                                    <span>Generating...</span>
                                </LoadingContent>
                            ) : (
                                'Generate Proof'
                            )}
                        </GenerateProofButton>
                        {proofGenerated[eventId as string] && (
                            <>
                                <ProofMessage>
                                    Proof generated successfully. Use this QR code for event check-in:
                                </ProofMessage>
                                <QRCodeContainer>
                                    <QRCode value={qrCodeValue[eventId as string] || ''} />
                                </QRCodeContainer>
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
            {showZKEmailForm && (
                <ModalOverlay>
                    <ZKEmailLoginForm 
                        onSubmit={handleZKEmailSubmitWrapper} 
                        onClose={() => {
                            setShowZKEmailForm(false);
                            handleResetEmailProcess();
                            checkConnectionStatus();
                        }}
                        onReset={handleResetEmailProcess}
                        isLoading={isConnectingEmailWallet}
                        error={emailError}
                        isEmailSent={isEmailSent}
                    />
                </ModalOverlay>
            )}
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

const EventInfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

const EventDate = styled.p`
    font-size: 12px;
    color: #a3aab8;
    font-weight: 600;
    margin: 0;
`;

const EventLinkContainer = styled.div`
    display: flex;
    align-items: center;
`;

const EventLink = styled.a`
    color: #5eb7ff;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    display: flex;
    align-items: center;
`;

const ExternalLinkIcon = styled.span`
    display: inline-flex;
    align-items: center;
    margin-left: 5px;
`;

const CredentialObtainedMessage = styled.div`
    font-size: 18px;
    color: #000;
    margin-bottom: 20px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const CelebrationIcon = styled.span`
    margin-left: 8px;
    display: inline-flex;
    align-items: center;
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

const EventDescription = styled.div<{ expanded: boolean }>`
    margin-bottom: auto;
    font-size: 16px;
    line-height: 1.5;
    color: rgba(100, 100, 100, 0.8);
    max-height: ${(props) => (props.expanded ? 'none' : '200px')};
    overflow: hidden;
    transition: max-height 0.3s ease;
    white-space: pre-wrap; // Preserve line breaks and spaces

    strong {
        color: #000; // Make bold text darker for emphasis
    }
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
    cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
    font-size: 16px;
    font-weight: 700;
    padding: 15px 32px;
    width: 100%;
    margin-top: 32px;
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};
    transition: opacity 0.3s ease;
`;

const RequestProofOfAttendanceNFTButton = styled.button`
  align-self: stretch;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(255, 129, 81, 0) 0%, #ff8151 100%),
              linear-gradient(90deg, #5eb7ff 0%, rgba(56, 110, 153, 0) 100%);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  color: #fff;
  padding: 13px 32px;
  font: 700 16px Inter, sans-serif;
  border: none;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: opacity 0.3s ease;
  opacity: ${props => props.disabled ? 0.5 : 1};
  margin-top: 16px;
  width: 100%;

  &:hover {
    opacity: ${props => props.disabled ? 0.5 : 0.9};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 183, 255, 0.5);
  }
`;

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const NFTExplanation = styled.p`
    font-size: 14px;
    color: #666;
    margin-top: 10px;
    text-align: center;
`;

const EmailWalletStatus = styled.div`
    font-size: 14px;
    color: #5eb7ff;
    margin-bottom: 10px;
`;

const Separator = styled.hr`
    border: none;
    height: 1px;
    background-color: #d4d4d4;
    margin: 10px 0;
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
    color: rgba(144, 151, 166, 0.6);
    text-align: center;
`;

const QRCodeContainer = styled.div`
    display: flex;
    justify-content: center;
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
