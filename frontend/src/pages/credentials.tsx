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
  } from "@galxe-identity-protocol/sdk";
import { ethers } from "ethers";

const CredentialsPage: React.FC = () => {
  const router = useRouter();
  const [ticketCredentials, setTicketCredentials] = useState<TicketCredential[]>([]);
  const [eventNames, setEventNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeValues, setQrCodeValues] = useState<Record<string, string>>({});
  const [isGeneratingProof, setIsGeneratingProof] = useState<Record<string, boolean>>({});

  const api = useMemo(() => {
    const token = getToken();
    const customFetch: FetchAPI = async (input: RequestInfo, init?: RequestInit) => {
      if (!init) init = {};
      if (!init.headers) init.headers = {};
      if (token) (init.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
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

        const uniqueEventIds = Array.from(new Set(credentials.map(cred => cred.eventId).filter(Boolean)));
        const names: Record<string, string> = {};
        await Promise.all(uniqueEventIds.map(async (eventId) => {
          if (eventId) {
            const event = await api.eventsEventIdGet({ eventId });
            names[eventId] = event.name ?? 'Unknown Event';
          }
        }));
        setEventNames(names);
      } catch (error) {
        console.error('Error fetching ticket credentials:', error);
        setError('Failed to fetch ticket credentials. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketCredentials();
  }, [api]);

  const handleGenerateProof = async (ticket: TicketCredential) => {
    const eventId = ticket.eventId || 'unknown';
    setIsGeneratingProof(prev => ({ ...prev, [eventId]: true }));
    setError(null);
    try {
        console.log('Generate proof for:', ticket);
        const proofData = await generateProof(ticket, api);
        setQrCodeValues(prev => ({
            ...prev,
            [eventId]: proofData
        }));
    } catch (error) {
        console.error('Error generating proof:', error);
        setError('Failed to generate proof. Please try it again.');
    } finally {
        setIsGeneratingProof(prev => ({ ...prev, [eventId]: false }));
    }
};
  
  const generateProof = async (ticket: TicketCredential, api: DefaultApi): Promise<string> => {
    try {
      await prepare();
  
      const provider = new ethers.JsonRpcProvider("https://cloudflare-eth.com");
  
      const u = new user.User();
      const userDetails = await api.userMeGet();
      
      if (!userDetails.encryptedIdentitySecret || !userDetails.encryptedInternalNullifier) {
        throw new Error('User details are incomplete');
      }
  
      const identitySlice: user.IdentitySlice = {
        identitySecret: BigInt(userDetails.encryptedIdentitySecret),
        internalNullifier: BigInt(userDetails.encryptedInternalNullifier),
        domain: "evm"
      };
  
      u.addIdentitySlice(identitySlice);
      console.log('User set up successfully.');
  
      const identityCommitment = u.getIdentityCommitment("evm");
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
      const unitType = errors.unwrap(credType.createTypeFromSpec(unitTypeSpec));
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
          {}  // Empty object for unit type
        )
      );
      console.log('Credential object created successfully:', cred);

      // Add the event ID as an attachment to uniquely identify the credential
      cred.attachments["event_id"] = ticket.eventId || "unknown";
  
      // Add a signature to the credential
      const dummyIssuerEvmAddr = "0x15f4a32c40152a0f48E61B7aed455702D1Ea725e";
      const dummyKey = utils.decodeFromHex("0xfd60ceb442aca7f74d2e56c1f0e93507798e8a6e02c4cd1a5585a36167fa7b03");
      const myIssuer = new issuer.BabyzkIssuer(dummyKey, BigInt(dummyIssuerEvmAddr), BigInt(1)); // mainnet
      myIssuer.sign(cred, {
        sigID: BigInt(100),
        expiredAt: BigInt(Math.ceil(new Date().getTime() / 1000) + 7 * 24 * 60 * 60), // 7 days from now
        identityCommitment: identityCommitment,
      });
      console.log('Signature added to the credential');
  
      // Set up proof generation parameters
      const externalNullifier = utils.computeExternalNullifier(contextString);
      const expiredAtLowerBound = BigInt(Math.ceil(new Date().getTime() / 1000) + 3 * 24 * 60 * 60);
      const equalCheckId = BigInt(0);
      const pseudonym = BigInt("0xdeadbeef");
      console.log('Proof generation parameters set up successfully.');
  
      console.log("Downloading proof generation gadgets...");
      const proofGenGadgets = await user.User.fetchProofGenGadgetsByTypeID(
        cred.header.type,
        provider
      );
      console.log("Proof generation gadgets downloaded successfully.");
  
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
        `
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
      <MainContainer>
        <Header>
          <GoBackButton onClick={() => router.push('/dashboard')}>
            <Image src="/left-arrow.svg" alt="go back" width={20} height={20} />
            <Title>Homepage</Title>
          </GoBackButton>
        </Header>
        {isLoading ? (
          <LoadingIndicator>Loading...</LoadingIndicator>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <CredentialSection>
            <CredentialTitle>Ticket Credentials</CredentialTitle>
            {ticketCredentials.length > 0 ? (
              ticketCredentials.map((ticket, index) => (
                <CredentialItem key={index}>
                  <p>Event: {eventNames[ticket.eventId ?? ''] ?? 'Unknown Event'}</p>
                  <p>Issued At: {new Date(ticket.issuedAt ?? '').toLocaleString()}</p>
                  <p>Expires At: {new Date(ticket.expireAt ?? '').toLocaleString()}</p>
                  <GenerateProofButton 
                      onClick={() => handleGenerateProof(ticket)} 
                      loading={!!isGeneratingProof[ticket.eventId || 'unknown']}
                      disabled={!!isGeneratingProof[ticket.eventId || 'unknown']}
                  >
                      {isGeneratingProof[ticket.eventId || 'unknown'] ? 'Generating...' : 'Generate Proof'}
                  </GenerateProofButton>
                  {qrCodeValues[ticket.eventId ?? ''] && (
                  <QRCodeContainer>
                      <QRCode 
                        id={`qr-code-${ticket.eventId || 'unknown'}`} 
                        value={qrCodeValues[ticket.eventId || ''] || ''}
                      />
                      <DownloadButton onClick={() => handleDownloadQR(ticket.eventId || 'unknown')}>
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
                No ticket credentials found. Please go to the Events page to request a ticket credential.
              </NoCredentialText>
            )}
          </CredentialSection>
        )}
      </MainContainer>
    </PageContainer>
  );
};

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #060708;
  padding: 24px;
`;

const MainContainer = styled.div`
  color: #fff;
  max-width: 480px;
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  background-color: #060708;
  justify-content: center;
`;

const GoBackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 16px;
  margin-right: 10px;
`;

const Title = styled.span`
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const CredentialSection = styled.div`
  margin: 24px 0;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const CredentialTitle = styled.h2`
  color: rgba(255, 255, 255, 0.8);
  font-size: 20px;
  margin-bottom: 16px;
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
  background-color: rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const NoCredentialText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
`;

const Button = styled.button`
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  &:active {
    transform: translateY(0);
  }
`;

const GenerateProofButton = styled(Button)<{ loading?: boolean }>`
  background: ${({ loading }) => (loading ? '#888' : 'linear-gradient(45deg, #4ecdc4, #45b7d8)')};
  color: white;
  padding: 8px 16px;
  font-size: 14px;
  margin-top: 8px;
  cursor: ${({ loading }) => (loading ? 'not-allowed' : 'pointer')};
`;

const CredentialItem = styled.div`
  background-color: rgba(255, 255, 255, 0.1);
  padding: 16px;
  margin: 16px 0;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const LoadingIndicator = styled.div`
  color: #fff;
  font-size: 18px;
  text-align: center;
  margin-top: 20px;
`;

const ErrorMessage = styled.div`
  color: red;
  font-size: 18px;
  text-align: center;
  margin-top: 20px;
`;

export default withAuth(CredentialsPage);