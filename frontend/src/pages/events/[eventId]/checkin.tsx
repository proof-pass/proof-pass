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
import { DefaultApi, Configuration } from '@/api';
import { getToken } from '@/utils/auth';

interface EventDetails {
    id: string;
    name: string;
}

interface ScannerError extends Error {
    status?: number;
    body?: {
        message?: string;
    };
}

const CheckInPage: React.FC = () => {
    const router = useRouter();
    const { eventId } = router.query;
    const [verified, setVerified] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasAttendedBefore, setHasAttendedBefore] = useState<boolean>(false);
    const [contextMismatchError, setContextMismatchError] = useState<
        string | null
    >(null);
    const [adminCode, setAdminCode] = useState('');
    const [isHostLoggedIn, setIsHostLoggedIn] = useState(false);
    const [eventName, setEventName] = useState<string>('');
    const [event, setEvent] = useState<EventDetails | null>(null);
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
                setError(null);
            }
        },
        [event],
    );

    const onScanFailure = (error: string) => {
        console.warn(`Code scan error = ${error}`);
    };

    const handleHostLogin = async (
        event?: React.MouseEvent<HTMLButtonElement>,
    ) => {
        event?.preventDefault();
        if (!adminCode) {
            setError('Please enter an admin code');
            return;
        }
        await autoLogin(adminCode);
    };

    const verifyProof = useCallback(
        async (proof: babyzkTypes.WholeProof): Promise<boolean> => {
            try {
                const provider = new ethers.JsonRpcProvider(
                    'https://cloudflare-eth.com',
                );
                const statefulVerifier = evm.v1.createBabyzkStatefulVerifier({
                    signerOrProvider: provider,
                });

                const expectedTypeID = credType.primitiveTypes.unit.type_id;
                const expectedEventId = eventId as string;
                const expectedContextID = credential.computeContextID(
                    `Event Ticket: ${expectedEventId}`,
                );
                const expectedIssuerID = BigInt(
                    '0x15f4a32c40152a0f48E61B7aed455702D1Ea725e',
                );

                const actualContextID = babyzk.defaultPublicSignalGetter(
                    credential.IntrinsicPublicSignal.Context,
                    proof,
                );
                const actualKeyId = babyzk.defaultPublicSignalGetter(
                    credential.IntrinsicPublicSignal.KeyId,
                    proof,
                );

                if (actualContextID === undefined) {
                    console.error('Context ID not found in the proof');
                    setError('Invalid proof: Context ID not found');
                    return false;
                }

                if (actualContextID !== expectedContextID) {
                    console.error('Context ID mismatch');
                    console.log(
                        'Expected Context ID:',
                        expectedContextID.toString(),
                    );
                    console.log(
                        'Actual Context ID:',
                        actualContextID.toString(),
                    );
                    setContextMismatchError(
                        'This ticket is for a different event. Please check and try again.',
                    );
                    return false;
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

                console.log(
                    'Verification Result:',
                    evm.verifyResultToString(result),
                );

                return result === evm.VerifyResult.OK;
            } catch (error) {
                console.error('Error in verifyProof:', error);
                setError('Failed to verify the proof. Please try again.');
                return false;
            }
        },
        [eventId, setError, setContextMismatchError],
    );

    const recordAttendance = useCallback(
        async (
            eventId: string,
            proof: babyzkTypes.WholeProof,
            adminCode: string,
        ) => {
            try {
                setError(null);
                setHasAttendedBefore(false);
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
                setVerified(true);
                setIsHostLoggedIn(true);
            } catch (error: unknown) {
                console.error('Error recording attendance:', error);
                setVerified(false);

                if (error instanceof Error) {
                    const scannerError = error as ScannerError;
                    switch (scannerError.status) {
                        case 401:
                            setError(
                                'Invalid admin code. Please enter the correct code.',
                            );
                            setAdminCode('');
                            setIsHostLoggedIn(false);
                            break;
                        case 404:
                            setError(
                                'Event not found. Please check the event details and try again.',
                            );
                            break;
                        case 400:
                            setError(
                                'Invalid credential type. Please check your ticket and try again.',
                            );
                            break;
                        case 409:
                            setHasAttendedBefore(true);
                            setVerified(true);
                            break;
                        default:
                            setError(
                                scannerError.body?.message ||
                                    'Failed to record attendance. Please try again.',
                            );
                    }
                } else {
                    setError('An unexpected error occurred. Please try again.');
                }
            }
        },
        [
            setError,
            setHasAttendedBefore,
            setVerified,
            setIsHostLoggedIn,
            setAdminCode,
        ],
    );

    const onScanSuccess = useCallback(
        async (decodedText: string) => {
            if (!event) return;
    
            try {
                await prepare();
                setError(null);
                setContextMismatchError(null);
                const proof: babyzkTypes.WholeProof = JSON.parse(decodedText);
                const verificationResult = await verifyProof(proof);
                setVerified(verificationResult);
    
                if (verificationResult) {
                    if (isHostLoggedIn) {
                        await recordAttendance(event.id, proof, adminCode);
                        setPopupMessage('Verified, attendance recorded!');
                        setPopupSuccess(true);
                    } else {
                        setVerified(true);
                        setPopupMessage('Verified!');
                        setPopupSuccess(true);
                    }
                } else {
                    setPopupMessage('Verification failed. Please try again.');
                    setPopupSuccess(false);
                }
                setShowPopup(true);
            } catch (error: unknown) {
                console.error('Error verifying proof:', error);
                setVerified(false);
    
                if (error instanceof Error) {
                    if (error.message.includes('Context ID mismatch')) {
                        setPopupMessage('This ticket is for a different event. Please check and try again.');
                    } else {
                        setPopupMessage('Failed to verify the QR code. Please try again.');
                    }
                } else {
                    setPopupMessage('An unexpected error occurred. Please try again.');
                }
                setPopupSuccess(false);
                setShowPopup(true);
            }
        },
        [event, isHostLoggedIn, adminCode, verifyProof, recordAttendance]
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

    const fetchEventDetails = useCallback(async () => {
        const { eventId, 'admin-code': urlAdminCode } = router.query;

        if (eventId && !isFetching && !eventDetailsFetched) {
            setIsFetching(true);
            try {
                const eventDetails = await unauthenticatedApi.eventsEventIdGet({
                    eventId: eventId as string,
                });
                setEvent(eventDetails as EventDetails);
                setEventName(eventDetails.name || 'Unknown Event');
                setError(null);
                setEventDetailsFetched(true);

                if (urlAdminCode) {
                    setIsQuickCheckIn(true);
                    setAdminCode(urlAdminCode as string);
                    await autoLogin(urlAdminCode as string);
                }
            } catch (error) {
                console.error('Error fetching event details:', error);
                setError('Failed to fetch event details');
                setEventName('Unknown Event');
            } finally {
                setIsFetching(false);
            }
        }
    }, [
        router.query,
        unauthenticatedApi,
        autoLogin,
        eventDetailsFetched,
        isFetching,
    ]);

    useEffect(() => {
        fetchEventDetails();
    }, [fetchEventDetails]);

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
                {error && (
                    <ErrorContainer>
                        <ErrorText>{error}</ErrorText>
                    </ErrorContainer>
                )}
                {contextMismatchError && (
                    <ErrorContainer>
                        <ErrorText>{contextMismatchError}</ErrorText>
                    </ErrorContainer>
                )}
                {verified === true && (
                    <SuccessContainer>
                        {isHostLoggedIn ? (
                            hasAttendedBefore ? (
                                <WarningText>
                                    Attendance was previously recorded for this
                                    event.
                                </WarningText>
                            ) : (
                                <SuccessText>
                                    Verified, attendance recorded!
                                </SuccessText>
                            )
                        ) : (
                            <SuccessText>Verified!</SuccessText>
                        )}
                    </SuccessContainer>
                )}
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
                <PopupText style={{ color: popupSuccess ? '#4ecdc4' : '#ff6b6b' }}>
                    {popupMessage}
                </PopupText>
                <PopupButton onClick={() => setShowPopup(false)}>Close</PopupButton>
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
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const PopupText = styled.p`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
`;

const PopupButton = styled.button`
  background-color: #FF8151;
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

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 20px;
`;

const ErrorText = styled.p`
    color: #ff6b6b;
    text-align: center;
    font-weight: bold;
`;

const SuccessContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 20px;
`;

const SuccessText = styled.p`
    color: #4ecdc4;
    text-align: center;
    font-weight: bold;
`;

const WarningText = styled.p`
    color: #feca57;
    text-align: center;
    font-weight: bold;
`;

const SVGIconSpace = styled.div`
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding: 20px;
`;

export default CheckInPage;
