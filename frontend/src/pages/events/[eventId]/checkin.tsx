import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Html5Qrcode } from 'html5-qrcode';
import {
  prepare,
  evm,
  credential,
  credType,
  babyzkTypes,
  babyzk,
} from "@galxe-identity-protocol/sdk";
import { ethers } from "ethers";
import { DefaultApi, Configuration } from '@/api';
import { getToken } from '@/utils/auth';

interface EventDetails {
    id: string;
    name: string;
}

const CheckInPage: React.FC = () => {
    const router = useRouter();
    const { eventId } = router.query;
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [verified, setVerified] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [hasAttendedBefore, setHasAttendedBefore] = useState<boolean>(false);
    const [contextMismatchError, setContextMismatchError] = useState<string | null>(null);
    const [adminCode, setAdminCode] = useState('');
    const [isHostLoggedIn, setIsHostLoggedIn] = useState(false);
    const [eventName, setEventName] = useState<string>('');
    const [event, setEvent] = useState<EventDetails | null>(null);
    const [showLoginMessage, setShowLoginMessage] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const hasFeatchedRef = useRef(false);

    const api = useMemo(() => {
      return new DefaultApi(new Configuration({}));
    }, []);
  
    const autoLogin = useCallback(async (code: string) => {
      if (event && code) {
        setIsHostLoggedIn(true);
        setError(null);
      }
    }, [event]);  
  
    useEffect(() => {
      const { eventId, 'admin-code': urlAdminCode } = router.query;
      
      const fetchEventDetails = async () => {
        if (eventId && !isFetching && !hasFeatchedRef.current) {
          hasFeatchedRef.current = true;
          setIsFetching(true);
          try {
            const eventDetails = await api.eventsEventIdGet({ eventId: eventId as string });
            setEvent(eventDetails as EventDetails);
            setEventName(eventDetails.name || 'Unknown Event');
            setError(null);
            
            if (urlAdminCode) {
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
      };
      
      fetchEventDetails();
      
      return () => {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(console.error);
        }
      };

    }, [router.query, api, autoLogin, isFetching]);
    
    const handleHostLogin = async (event?: React.MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      if (!adminCode) {
        setError('Please enter an admin code');
        return;
      }
      await autoLogin(adminCode);
    };
  
    const startScanning = async () => {
      setError(null);
      setContextMismatchError(null);
      setVerified(null);
      setHasAttendedBefore(false);
      setIsScanning(true);
  
      if (scannerRef.current) {
        await scannerRef.current.clear();
      }
      
      try {
        scannerRef.current = new Html5Qrcode("reader");
        const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgePercentage = 0.8; 
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return { width: qrboxSize, height: qrboxSize };
        };
  
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 60, qrbox: qrboxFunction, aspectRatio: 1.0, disableFlip: false },
          handleScan,
          (errorMessage) => { console.error("QR Code scanning failed:", errorMessage); }
        );
      } catch (error) {
        console.error("Failed to start QR scanner:", error);
        setError(`Failed to start camera: ${error instanceof Error ? error.message : String(error)}`);
        setIsScanning(false);
      }
    };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleScan = async (decodedText: string) => {
    try {
      await prepare();
      setError(null);
      setContextMismatchError(null);
      const proof: babyzkTypes.WholeProof = JSON.parse(decodedText);
      const verificationResult = await verifyProof(proof);
      setVerified(verificationResult);
  
      if (verificationResult) {
        if (isHostLoggedIn) {
          await recordAttendance(eventId as string, proof, adminCode);
        } else {
          setVerified(true);
        }
        await stopScanning(); 
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      setVerified(false);
      setError('Failed to verify the QR code. Please try again.');
    } finally {
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }
      setIsScanning(false);
    }
  };

  const verifyProof = async (proof: babyzkTypes.WholeProof): Promise<boolean> => {
    try {
      const provider = new ethers.JsonRpcProvider("https://cloudflare-eth.com");
      const statefulVerifier = evm.v1.createBabyzkStatefulVerifier({
        signerOrProvider: provider,
      });
  
      const expectedTypeID = credType.primitiveTypes.unit.type_id;
      const expectedEventId = eventId as string;
      const expectedContextID = credential.computeContextID(`Event Ticket: ${expectedEventId}`);
      const expectedIssuerID = BigInt("0x15f4a32c40152a0f48E61B7aed455702D1Ea725e");
  
      const actualContextID = babyzk.defaultPublicSignalGetter(credential.IntrinsicPublicSignal.Context, proof);
  
      if (actualContextID === undefined) {
        console.error('Context ID not found in the proof');
        setError('Invalid proof: Context ID not found');
        return false;
      }
  
      if (actualContextID !== expectedContextID) {
        console.error('Context ID mismatch');
        console.log('Expected Context ID:', expectedContextID.toString());
        console.log('Actual Context ID:', actualContextID.toString());
        setContextMismatchError('This ticket is for a different event. Please check and try again.');
        return false;
      }
  
      const result = await statefulVerifier.verifyWholeProofFull(
        expectedTypeID,
        expectedContextID,
        expectedIssuerID,
        proof
      );
  
      console.log('Verification Result:', evm.verifyResultToString(result));
  
      return result === evm.VerifyResult.OK;
    } catch (error) {
      console.error('Error in verifyProof:', error);
      setError('Failed to verify the proof. Please try again.');
      return false;
    }
  };

  const recordAttendance = async (eventId: string, proof: babyzkTypes.WholeProof, adminCode: string) => {
    try {
      setError(null);
      setHasAttendedBefore(false);
      const publicSignals = babyzk.defaultPublicSignalGetter;
  
      await api.eventsEventIdAttendancePost({
        eventId,
        recordAttendanceRequest: {
          type: credType.primitiveTypes.unit.type_id.toString(),
          context: publicSignals(credential.IntrinsicPublicSignal.Context, proof)?.toString(),
          nullifier: publicSignals(credential.IntrinsicPublicSignal.Nullifier, proof)?.toString(),
          keyId: publicSignals(credential.IntrinsicPublicSignal.KeyId, proof)?.toString(),
          eventId: eventId,
          adminCode: adminCode
        }
      });
      console.log('Attendance recorded successfully');
      setVerified(true);
      setIsHostLoggedIn(true);
    } catch (error) {
      console.error('Error recording attendance:', error);
      setVerified(false);
      
      if (error instanceof Error) {
        const errorResponse = error as { status?: number; body?: { message?: string } };
        switch (errorResponse.status) {
          case 401:
            setError('Invalid admin code. Please enter the correct code.');
            setAdminCode('');
            setIsHostLoggedIn(false);
            break;
          case 404:
            setError('Event not found. Please check the event details and try again.');
            break;
          case 400:
            setError('Invalid credential type. Please check your ticket and try again.');
            break;
          case 409: 
            setHasAttendedBefore(true);
            setVerified(true);
            break;
          default:
            setError(errorResponse.body?.message || 'Failed to record attendance. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleGoBack = async () => {
    try {
        if (scannerRef.current) {
            await scannerRef.current.stop();
        }
    } catch (error) {
        console.error("Error stopping scanner:", error);
    } finally {
        const token = getToken();
        if (!token) {
            setShowLoginMessage(true);
            setTimeout(() => {
                setShowLoginMessage(false);
            }, 5000);
        } else {
            router.push(`/events/${eventId}`);
        }
    }
};

  return (
    <MainContainer>
      <GlobalStyle />
      <Header>
        <GoBackButton onClick={handleGoBack}>
          <Image src="/left-arrow.svg" alt="go back" width={20} height={20} />
          <span>Event Details</span>
        </GoBackButton>
        <PlanetOverlay>
          <Image src="/planet.svg" alt="Planet" layout="fill" objectFit="contain" />
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
          <HostLoginButton onClick={handleHostLogin} disabled={isHostLoggedIn}>
            {isHostLoggedIn ? 'Host Logged In' : 'Host Login'}
          </HostLoginButton>
        </AdminContainer>
        <ScannerContainer>
          <div id="reader" style={{
            width: '100%',
            height: '100%',
            display: isScanning ? 'block' : 'none',
          }}></div>
          {isScanning && (
            <ScannerOverlay>
              <ScannerMarker />
            </ScannerOverlay>
          )}
          {!isScanning && (
            <PlaceholderText>Press &apos;Start Scanning&apos; to begin</PlaceholderText>
          )}
        </ScannerContainer>
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
                  Attendance was previously recorded for this event.
                </WarningText>
              ) : (
                <SuccessText>Verified, attendance recorded!</SuccessText>
              )
            ) : (
              <SuccessText>Verified!</SuccessText>
            )}
          </SuccessContainer>
        )}
        <ScanButton onClick={startScanning} disabled={isScanning}>
          {isScanning ? 'Scanning...' : 'Start Scanning'}
        </ScanButton>
        {isScanning && (
          <CancelButton onClick={stopScanning}>
            Cancel
          </CancelButton>
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
`;

const Header = styled.header`
background-color: #FFD166;
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
color: #FF8151;
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
        0% { opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { opacity: 0; }
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
  color: #FF8151;
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
  background: ${props => props.disabled ? '#4ecdc4' : '#FF8151'};
  border: none;
  border-radius: 4px;
  color: white;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  opacity: ${props => props.disabled ? 0.7 : 1};
`;

const ScannerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 16px;
  margin-bottom: 24px;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 360px;
`;

const ScannerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScannerMarker = styled.div`
  width: 70%;
  height: 70%;
  border: 2px solid #FF8151;
  border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
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

const ScanButton = styled.button`
  background-color: #FF8151;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  margin-bottom: 16px;
  width: 100%;
  transition: opacity 0.3s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  background: none;
  border: 2px solid #FF8151;
  border-radius: 8px;
  color: #FF8151;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  padding: 10px 22px;
  margin-top: 12px;
  width: 100%;
  transition: background-color 0.3s ease, color 0.3s ease;

  &:hover {
    background-color: #FF8151;
    color: white;
  }
`;

const PlaceholderText = styled.p`
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
  font-size: 16px;
`;

const SVGIconSpace = styled.div`
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding: 20px;
`;

export default CheckInPage;