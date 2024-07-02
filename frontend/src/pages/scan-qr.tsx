import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import Image from 'next/image';
import withAuth from '@/components/withAuth';
import QrScanner from 'qr-scanner';
import {
    prepare,
    evm,
    credential,
    credType,
    babyzk,
    babyzkTypes,
  } from "@galxe-identity-protocol/sdk";
import { ethers } from "ethers";

// Use Cloudflare's free open RPC in this example.
const MAINNET_RPC = "https://cloudflare-eth.com";
const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

// This is a dummy issuer's EVM address that has been registered on mainnet.
// Because it authorizes the private key that is public to everyone, it should not be used in production!
const dummyIssuerEvmAddr = "0x15f4a32c40152a0f48E61B7aed455702D1Ea725e";

const ScanQRPage: React.FC = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
    };
  }, []);

  const startScanning = async () => {
    console.log("Start scanning clicked");
    setError(null);
    setVerified(null);
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
      const proof = JSON.parse(scannedData);
      const verificationResult = await verifyByOffchain(proof);
      setVerified(verificationResult);
    } catch (error) {
      setError("Verification failed. Please try again.");
      setVerified(false);
    }
  };

  const verifyByOffchain = async (proof: babyzkTypes.WholeProof): Promise<boolean> => {
    const expectedContextID = credential.computeContextID("Number of transactions");
    const expectedIssuerID = BigInt(dummyIssuerEvmAddr);
    const expectedTypeID = credType.primitiveTypes.scalar.type_id;

    const tpRegistry = evm.v1.createTypeRegistry({
      signerOrProvider: provider,
    });
    const verifier = await tpRegistry.getVerifier(
      expectedTypeID,
      credential.VerificationStackEnum.BabyZK
    );
    const vKey = await verifier.getVerificationKeysRaw();
    await babyzk.verifyProofRaw(vKey, proof);

    const IssuerRegistry = evm.v1.createIssuerRegistry({
      signerOrProvider: provider,
    });
    const pubkeyId = babyzk.defaultPublicSignalGetter(
      credential.IntrinsicPublicSignal.KeyId,
      proof
    );
    if (pubkeyId === undefined) {
      return false;
    }
    const isActive = await IssuerRegistry.isPublicKeyActiveForStack(
      expectedIssuerID,
      pubkeyId,
      credential.VerificationStackEnum.BabyZK
    );
    if (!isActive) {
      return false;
    }
    const contextId = babyzk.defaultPublicSignalGetter(
      credential.IntrinsicPublicSignal.Context,
      proof
    );
    if (contextId === undefined) {
      return false;
    }
    if (contextId !== expectedContextID) {
      return false;
    }
    const expiredAtLb = babyzk.defaultPublicSignalGetter(
      credential.IntrinsicPublicSignal.ExpirationLb,
      proof
    );
    if (expiredAtLb === undefined) {
      return false;
    }
    if (expiredAtLb < BigInt(Math.ceil(new Date().getTime() / 1000))) {
      return false;
    }
    return true;
  };

  const handleGoBack = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    router.push('/events');
  };

  return (
    <MainContainer>
      <Card>
        <Header>
          <GoBackButton onClick={handleGoBack}>
            <Image src="/left-arrow.svg" alt="go back" width={20} height={20} />
            <ButtonTitle>Events</ButtonTitle>
          </GoBackButton>
        </Header>
        <Title>Scan QR Code</Title>
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

const Title = styled.h1`
  font-size: 24px;
  color: white;
  font-weight: 600;
  text-align: center;
  margin-bottom: 24px;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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