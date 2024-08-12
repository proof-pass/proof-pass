/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
    prepare,
    evm,
    credential,
    credType,
    babyzkTypes,
    babyzk,
} from '@galxe-identity-protocol/sdk';
import { ethers } from 'ethers';
import { DefaultApi, Configuration, Event } from '@/api';
import { getToken } from '@/utils/auth';

interface ScannerError extends Error {
    status?: number;
    body?: {
        message?: string;
    };
}

const CheckInPage: React.FC = () => {
    const router = useRouter();
    const { eventId } = router.query;
    const [adminCode, setAdminCode] = useState('');
    const [isHostLoggedIn, setIsHostLoggedIn] = useState(false);
    const [eventName, setEventName] = useState<string>('');
    const [event, setEvent] = useState<Event | null>(null);
    const [showLoginMessage, setShowLoginMessage] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [isQuickCheckIn, setIsQuickCheckIn] = useState(false);
    const [eventDetailsFetched, setEventDetailsFetched] = useState(false);
    const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSuccess, setPopupSuccess] = useState(false);

    const unauthenticatedApi = useMemo(() => {
        return new DefaultApi(
            new Configuration({
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'omit',
            }),
        );
    }, []);

    const autoLogin = useCallback(
        async (code: string) => {
            if (event && code) {
                setIsHostLoggedIn(true);
            }
        },
        [event],
    );

    const onScanFailure = (error: string) => {
        // console.warn(`Code scan error = ${error}`);
    };

    const handleHostLogin = async (
        event?: React.MouseEvent<HTMLButtonElement>,
    ) => {
        event?.preventDefault();
        if (!adminCode) {
            setPopupMessage('Please enter an admin code');
            setPopupSuccess(false);
            setShowPopup(true);
            return;
        }
        await autoLogin(adminCode);
    };

    const verifyProof = useCallback(
        async (proof: babyzkTypes.WholeProof): Promise<true | string> => {
            try {
                const provider = new ethers.JsonRpcProvider(
                    'https://cloudflare-eth.com',
                );
                const statefulVerifier = evm.v1.createBabyzkStatefulVerifier({
                    signerOrProvider: provider,
                });

                const expectedTypeID = credType.primitiveTypes.unit.type_id;
                const expectedContextID = BigInt(event!.contextId!);
                const expectedIssuerID = BigInt(event!.issuerKeyId!);

                const actualContextID = babyzk.defaultPublicSignalGetter(
                    credential.IntrinsicPublicSignal.Context,
                    proof,
                );
                const actualKeyId = babyzk.defaultPublicSignalGetter(
                    credential.IntrinsicPublicSignal.KeyId,
                    proof,
                );

                if (actualContextID === undefined) {
                    return 'Invalid proof: Context ID not found';
                }

                console.log('Expected Context ID:', expectedContextID.toString());
                console.log('Actual Context ID:', actualContextID.toString());

                if (actualContextID.toString() !== expectedContextID.toString()) {
                    console.log('Context ID mismatch');
                    return 'This ticket is for a different event. Please check and try again.';
                }

                if (actualKeyId !== undefined) {
                    console.log('Actual Key ID:', actualKeyId.toString());
                }

                const result = await statefulVerifier.verifyWholeProofFull(
                    expectedTypeID,
                    expectedContextID,
                    expectedIssuerID,
                    proof,
                );

                console.log('Verification Result Raw:', result);

                console.log(
                    'Verification Result:',
                    evm.verifyResultToString(result),
                );

                if (result === evm.VerifyResult.OK) {
                    return true;
                } else {
                    return `Verification failed`;
                }
            } catch (error) {
                console.error('Error in verifyProof:', error);
                return 'Failed to verify the proof. Please try again.';
            }
        },
        [eventId, event],
    );

    const recordAttendance = useCallback(
        async (
            eventId: string,
            proof: babyzkTypes.WholeProof,
            adminCode: string,
        ): Promise<true | string> => {
            try {
                const publicSignals = babyzk.defaultPublicSignalGetter;

                const token = getToken();
                const headers: { [key: string]: string } = {
                    'Content-Type': 'application/json',
                };

                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const apiConfig = new Configuration({ headers });
                const authenticatedApi = new DefaultApi(apiConfig);

                await authenticatedApi.eventsEventIdAttendancePost({
                    eventId,
                    recordAttendanceRequest: {
                        type: credType.primitiveTypes.unit.type_id.toString(),
                        context:
                            publicSignals(
                                credential.IntrinsicPublicSignal.Context,
                                proof,
                            )?.toString() || '',
                        nullifier:
                            publicSignals(
                                credential.IntrinsicPublicSignal.Nullifier,
                                proof,
                            )?.toString() || '',
                        keyId:
                            publicSignals(
                                credential.IntrinsicPublicSignal.KeyId,
                                proof,
                            )?.toString() || '',
                        eventId: eventId,
                        adminCode: adminCode,
                    },
                });

                console.log('Attendance recorded successfully');
                return true;
            } catch (error: unknown) {
                console.error('Error recording attendance:', error);
                if (error instanceof Error) {
                    const scannerError = error as ScannerError;
                    switch (scannerError.status) {
                        case 401:
                            return 'Invalid admin code. Please enter the correct code.';
                        case 404:
                            return 'Event not found. Please check the event details and try again.';
                        case 400:
                            return 'Invalid credential type. Please check your ticket and try again.';
                        case 409:
                            return 'Attendance was previously recorded for this event.';
                        default:
                            return (
                                scannerError.body?.message ||
                                'Failed to record attendance. Please try again.'
                            );
                    }
                } else {
                    return 'An unexpected error occurred. Please try again.';
                }
            }
        },
        [],
    );

    const onScanSuccess = useCallback(
        async (decodedText: string) => {
            if (!event) return;

            try {
                await prepare();
                const proof: babyzkTypes.WholeProof = JSON.parse(decodedText);
                const verificationResult = await verifyProof(proof);

                if (verificationResult === true) {
                    if (isHostLoggedIn) {
                        const recordResult = await recordAttendance(event.id!, proof, adminCode);
                        if (recordResult === true) {
                            setPopupMessage('Verified, attendance recorded!');
                            setPopupSuccess(true);
                        } else {
                            setPopupMessage(recordResult);
                            setPopupSuccess(false);
                        }
                    } else {
                        setPopupMessage('Verified!');
                        setPopupSuccess(true);
                    }
                } else {
                    setPopupMessage(verificationResult);
                    setPopupSuccess(false);
                }
                setShowPopup(true);
            }  catch (error: unknown) {
                console.error('Error verifying proof:', error);
    
                if (error instanceof Error) {
                    setPopupMessage(error.message);
                } else {
                    setPopupMessage('An unexpected error occurred. Please try again.');
                }
                setPopupSuccess(false);
                setShowPopup(true);
            }
        },
        [event, isHostLoggedIn, adminCode, verifyProof, recordAttendance],
    );

    const handleGoBack = async () => {
        if (isQuickCheckIn) {
            return;
        }

        const token = getToken();
        if (!token) {
            setShowLoginMessage(true);
            setTimeout(() => {
                setShowLoginMessage(false);
            }, 5000);
        } else {
            router.push(`/events/${eventId}`);
        }
    };

    useEffect(() => {
        const fetchEventDetails = async () => {
            const { eventId, 'admin-code': urlAdminCode } = router.query;

            if (eventId && !isFetching && !eventDetailsFetched) {
                setIsFetching(true);
                try {
                    const event = await unauthenticatedApi.eventsEventIdGet({
                        eventId: eventId as string,
                    });
                    setEvent(event);
                    console.log('setEvent: ', event);
                    setEventName(event.name!);
                    setEventDetailsFetched(true);

                    if (urlAdminCode) {
                        setIsQuickCheckIn(true);
                        setAdminCode(urlAdminCode as string);
                        await autoLogin(urlAdminCode as string);
                    }
                } catch (error) {
                    console.error('Error fetching event details:', error);
                    setEventName('Unknown Event');
                } finally {
                    setIsFetching(false);
                }
            }
        };
        fetchEventDetails();
    }, [
        router.query,
        unauthenticatedApi,
        autoLogin,
        eventDetailsFetched,
        isFetching,
    ]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !scanner && eventDetailsFetched) {
            const newScanner = new Html5QrcodeScanner(
                'reader',
                {
                    fps: 5,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                false,
            );
            setScanner(newScanner);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [scanner, eventDetailsFetched]);

    useEffect(() => {
        if (scanner) {
            scanner.render(onScanSuccess, onScanFailure);
        }
    }, [scanner, onScanSuccess]);

    return (
        <MainContainer>
            <GlobalStyle />
            <Header>
                {!isQuickCheckIn && (
                    <GoBackButton onClick={handleGoBack}>
                        <Image
                            src="/left-arrow.svg"
                            alt="go back"
                            width={20}
                            height={20}
                        />
                        <span>Event Details</span>
                    </GoBackButton>
                )}
                <PlanetOverlay>
                    <Image
                        src="/planet.svg"
                        alt="Planet"
                        width={200}
                        height={200}
                    />
                </PlanetOverlay>
            </Header>
            {showLoginMessage && (
                <LoginMessage>
                    Please log in to view event details.
                </LoginMessage>
            )}
            <Card>
                <TitleContainer>
                    <TitleMain>Check in for: {eventName}</TitleMain>
                </TitleContainer>
                <AdminContainer>
                    <AdminCodeInput
                        type="text"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="Enter admin code"
                        disabled={isHostLoggedIn}
                    />
                    <HostLoginButton
                        onClick={handleHostLogin}
                        disabled={isHostLoggedIn}
                    >
                        {isHostLoggedIn ? 'Host Logged In' : 'Host Login'}
                    </HostLoginButton>
                </AdminContainer>
                <ScannerWrapper>
                    <div id="reader"></div>
                </ScannerWrapper>
            </Card>
            <SVGIconSpace>
                <Image
                    src="/proof-summer-icon.svg"
                    alt="proof-summer"
                    width={187}
                    height={104}
                />
            </SVGIconSpace>
            {showPopup && (
                <Popup>
                    <PopupText
                        style={{ color: popupSuccess ? '#4ecdc4' : '#ff6b6b' }}
                    >
                        {popupMessage}
                    </PopupText>
                    <PopupButton onClick={() => setShowPopup(false)}>
                        Close
                    </PopupButton>
                </Popup>
            )}
        </MainContainer>
    );
};

const MainContainer = styled.div`
    background-color: #fff;
    display: flex;
    flex-direction: column;
    max-width: 480px;
    min-height: 100vh;
    margin: 0 auto;
    padding: 0;
    font-family: 'Inter', sans-serif;
`;

const GlobalStyle = createGlobalStyle`
@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

.qr-scanner-overlay, .qr-scanner-region-highlight-svg, canvas {
    transition: opacity 0.3s ease-out;
}

.fade-out {
    animation: fadeOut 0.3s ease-out forwards;
}

#reader {
    width: 100% !important;
  }

  #reader__scan_region {
    min-height: 400px;
  }

  #reader__dashboard_section_swaplink {
    text-decoration: underline;
    color: #FF8151;
    font-weight: bold;
  }

  /* Hide the default header as we already have a title */
  #reader__header_message {
    display: none;
  }
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

const LoginMessage = styled.div`
    background-color: #f8d7da;
    color: #721c24;
    padding: 10px;
    margin: 10px 20px;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    text-align: center;
    animation: fadeInOut 5s ease-in-out forwards;

    @keyframes fadeInOut {
        0% {
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }
`;
const Popup = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    text-align: center;
    animation: fadeIn 0.3s ease-out;

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

const PopupText = styled.p`
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
`;

const PopupButton = styled.button`
    background-color: #ff8151;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
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

const Card = styled.div`
    background-color: #fff;
    color: #000;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
`;

const TitleContainer = styled.div`
    margin-bottom: 20px;
    text-align: center;
`;

const TitleMain = styled.h1`
    font-size: 20px;
    color: #ff8151;
    font-weight: 600;
    margin-bottom: 8px;
`;

const AdminContainer = styled.div`
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
`;

const AdminCodeInput = styled.input`
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #fff;
    color: #000;
    margin-right: 10px;
`;

const HostLoginButton = styled.button`
    background: ${(props) => (props.disabled ? '#4ecdc4' : '#FF8151')};
    border: none;
    border-radius: 4px;
    color: white;
    cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};
    font-size: 14px;
    font-weight: 600;
    padding: 10px 20px;
    opacity: ${(props) => (props.disabled ? 0.7 : 1)};
`;

const ScannerWrapper = styled.div`
    width: 100%;
    margin-bottom: 20px;
`;

const SVGIconSpace = styled.div`
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding: 20px;
`;

export default CheckInPage;
