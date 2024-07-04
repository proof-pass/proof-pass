import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useRouter } from 'next/router';
import Image from 'next/image';
import withAuth from '@/components/withAuth';
import QrScanner from 'qr-scanner';
import {
  prepare,
  evm,
  credential,
  credType,
  babyzkTypes,
  babyzk,
} from "@galxe-identity-protocol/sdk";
import { ethers } from "ethers";
import { DefaultApi, Configuration, FetchAPI } from '@/api';
import { getToken } from '@/utils/auth';

const ScanQRPage: React.FC = () => {
  const router = useRouter();
  const { eventId, eventName, adminCode } = router.query;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminCodeError, setAdminCodeError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAttendedBefore, setHasAttendedBefore] = useState<boolean>(false);
  const [contextMismatchError, setContextMismatchError] = useState<string | null>(null);

  const api = useMemo(() => {
    const token = getToken();

    const customFetch: FetchAPI = async (input: RequestInfo, init?: RequestInit) => {
      if (!init) {
        init = {};
      }
      if (!init.headers) {
        init.headers = {};
      }

      if (token) {
        (init.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }

      return fetch(input, init);
    };

    const config = new Configuration({
      accessToken: token,
      fetchApi: customFetch
    });

    return new DefaultApi(config);
  }, []);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      clearScannerOverlay();
    };
  }, []);

  const startScanning = async () => {
    console.log("Start scanning clicked");
    setError(null);
    setAdminCodeError(null);
    setContextMismatchError(null);
    setVerified(null);
    setHasAttendedBefore(false);
  
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    
    clearScannerOverlay();
  
    if (videoRef.current) {
      try {
        setIsScanning(true);
        console.log("Creating QR scanner");
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          result => {
            console.log("QR code scanned:", result.data);
            handleScan(result.data);
            if (qrScannerRef.current) {
              qrScannerRef.current.stop();
            }
            setIsScanning(false);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );
        console.log("Starting QR scanner");
        await qrScannerRef.current.start();
        console.log("QR Scanner started successfully");
      } catch (error) {
        console.error("Failed to start QR scanner:", error);
        setError(`Failed to start camera: ${error instanceof Error ? error.message : String(error)}`);
        setIsScanning(false);
      }
    } else {
      console.error("Video ref is null");
      setError("Failed to initialize camera. Please try again.");
    }
  };

  const handleScan = async (scannedData: string) => {
    try {
      await prepare();
      setError(null);
      setContextMismatchError(null);
      const proof: babyzkTypes.WholeProof = JSON.parse(scannedData);
      console.log('Parsed Proof:', proof);
      const verificationResult = await verifyProof(proof);
      setVerified(verificationResult);
  
      if (verificationResult && adminCode) {
        await recordAttendance(eventId as string, proof, adminCode as string);
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      setVerified(false);
      setError('Failed to verify the QR code. Please try again.');
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
      setAdminCodeError(null);
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
    } catch (error) {
      console.error('Error recording attendance:', error);
      setVerified(false);
      
      if (error instanceof Error) {
        const errorResponse = error as { status?: number; body?: { message?: string } };
        switch (errorResponse.status) {
          case 401:
            setAdminCodeError('Invalid admin code. Please go back and enter the correct code.');
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

  const clearScannerOverlay = () => {
    const scannerElements = document.querySelectorAll('.qr-scanner-overlay, .qr-scanner-region-highlight-svg, canvas');
    scannerElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300); 
      } else {
        el.remove(); 
      }
    });
  };

  const handleGoBack = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    clearScannerOverlay();
    router.push('/events');
  };

  return (
    <MainContainer>
      <GlobalStyle />
      <Card>
        <Header>
          <GoBackButton onClick={handleGoBack}>
            <Image src="/left-arrow.svg" alt="go back" width={20} height={20} />
            <ButtonTitle>Events</ButtonTitle>
          </GoBackButton>
        </Header>
        <TitleContainer>
          <TitleMain>Scan QR Code for Event:</TitleMain>
          <EventNameContainer>
            <EventName isExpanded={isExpanded}>
              {eventName}
            </EventName>
            {eventName && eventName.length > 30 && (
              <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? 'Show less' : 'Show more'}
              </ExpandButton>
            )}
          </EventNameContainer>
        </TitleContainer>
        <ScannerContainer>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '300px',
              objectFit: 'cover',
              borderRadius: '12px',
              display: isScanning ? 'block' : 'none',
            }}
          />
          {!isScanning && (
            <PlaceholderText>Press &apos;Start Scanning&apos; to begin</PlaceholderText>
          )}
        </ScannerContainer>
        {error && (
          <ErrorContainer>
            <ErrorText>{error}</ErrorText>
          </ErrorContainer>
        )}
        {adminCodeError && (
          <ErrorContainer>
            <ErrorText>{adminCodeError}</ErrorText>
          </ErrorContainer>
        )}
        {contextMismatchError && (
          <ErrorContainer>
            <ErrorText>{contextMismatchError}</ErrorText>
          </ErrorContainer>
        )}
        {verified === true && (
          <SuccessContainer>
            {hasAttendedBefore ? (
              <WarningText>
                Attendance was previously recorded for this event.
              </WarningText>
            ) : (
              <SuccessText>Attendance recorded successfully!</SuccessText>
            )}
          </SuccessContainer>
        )}
        <ScanButton onClick={startScanning} disabled={isScanning}>
          {isScanning ? 'Scanning...' : 'Start Scanning'}
        </ScanButton>
      </Card>
    </MainContainer>
  );
};

const MainContainer = styled.div`
  background-color: #121212;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
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

const Card = styled.div`
  background-color: #1e1e1e;
  color: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 480px;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const GoBackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 16px;
  padding: 0;
`;

const ButtonTitle = styled.span`
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const TitleContainer = styled.div`
  margin-bottom: 20px;
  text-align: center;
`;

const TitleMain = styled.h1`
  font-size: 20px;
  color: white;
  font-weight: 600;
  margin-bottom: 8px;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const EventNameContainer = styled.div`
  margin-top: 8px;
`;

const EventName = styled.h2<{ isExpanded: boolean }>`
  font-size: 18px;
  color: white;
  font-weight: 500;
  margin: 0;
  ${({ isExpanded }) => !isExpanded && `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #ff6b6b;
  font-size: 14px;
  padding: 4px 0;
  margin-top: 4px;
`;

const ScannerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #1e1e1e;
  border-radius: 16px;
  margin-bottom: 24px;
  overflow: hidden;
  position: relative;
  height: 300px;
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
  background: linear-gradient(45deg, #ff6b6b, #feca57);
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

const PlaceholderText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  font-size: 16px;
`;

export default withAuth(ScanQRPage);