import React, { useState, useEffect, useRef } from 'react';
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

const ScanQRPage: React.FC = () => {
 const router = useRouter();
 const { eventId, eventName } = router.query;
 const videoRef = useRef<HTMLVideoElement>(null);
 const [verified, setVerified] = useState<boolean | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [isScanning, setIsScanning] = useState(false);
 const qrScannerRef = useRef<QrScanner | null>(null);
 const [isExpanded, setIsExpanded] = useState(false);

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
   setVerified(null);
  
   // Stop and destroy previous scanner if it exists
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
     const proof: babyzkTypes.WholeProof = JSON.parse(scannedData);
     console.log('Parsed Proof:', proof);
     const verificationResult = await verifyProof(proof);
     setVerified(verificationResult);
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
       return false;
     }
      if (actualContextID !== expectedContextID) {
       console.error('Context ID mismatch');
       console.log('Expected Context ID:', expectedContextID.toString());
       console.log('Actual Context ID:', actualContextID.toString());
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
     return false;
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
       {error && <ErrorText>{error}</ErrorText>}
       <ScanButton onClick={startScanning} disabled={isScanning}>
         {isScanning ? 'Scanning...' : 'Start Scanning'}
       </ScanButton>
       <Result>
         {verified !== null && (
           verified ? <Verified>Verified</Verified> : <NotVerified>Not Verified</NotVerified>
         )}
       </Result>
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

const Result = styled.div`
 color: rgba(255, 255, 255, 0.8);
 text-align: center;
 margin: 0;
 font-size: 16px;
 line-height: 1.6;
`;

const Verified = styled.p`
 color: green;
 font-weight: bold;
`;

const NotVerified = styled.p`
 color: red;
 font-weight: bold;
`;

const ErrorText = styled.p`
 color: red;
 text-align: center;
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
