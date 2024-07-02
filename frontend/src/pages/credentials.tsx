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
    utils
  } from "@galxe-identity-protocol/sdk";
import { ethers } from "ethers";

// conviniently unwrap the result of a function call by throwing an error if the result is an error.
const unwrap = errors.unwrap;

// Use cloudflare's free open rpc in this example.
const MAINNET_RPC = "https://cloudflare-eth.com";
const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

const CredentialsPage: React.FC = () => {
  const router = useRouter();
  const [ticketCredentials, setTicketCredentials] = useState<TicketCredential[]>([]);
  const [eventNames, setEventNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);

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

  async function setupUser(api: DefaultApi): Promise<user.User | null> {
    try {
        const userDetails = await api.userMeGet();

        if (!userDetails.identityCommitment || !userDetails.encryptedIdentitySecret || !userDetails.encryptedInternalNullifier) {
            console.error('User details are incomplete');
            return null;
        }

        console.log('User Details:', userDetails);

        const u = new user.User();
        const reconstructedSlice: user.IdentitySlice = {
            identitySecret: BigInt(userDetails.identityCommitment),
            internalNullifier: BigInt(userDetails.encryptedInternalNullifier),
        };

        console.log('Reconstructed Slice:', reconstructedSlice);

        u.addIdentitySlice(reconstructedSlice);
        return u;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}


const handleGenerateProof = async (ticket: TicketCredential) => {
    try {
        console.log('Generate proof for:', ticket);
        const proofData = await generateProof(ticket, api);
        setQrCodeValue(proofData);
    } catch (error) {
        console.error('Error generating proof:', error);
        setError('Failed to generate proof. Please try logging in again.');
    }
};

  const generateProof = async (ticket: TicketCredential, api: DefaultApi): Promise<string> => {
    try {
        // Prepare the SDK
        await prepare();

        // Set up the user
        const u = await setupUser(api);
        if (!u) {
            throw new Error('Failed to set up user. Please log in again.');
        }

        // Parse the ticket credential data
        if (!ticket.data) {
            throw new Error('Ticket data is missing');
        }
        const ticketData = JSON.parse(ticket.data);

        // Create a credential type for the unit type
        const unitTypeSpec = credType.primitiveTypes.unit;
        const unitType = unwrap(credType.createTypeFromSpec(unitTypeSpec));

        // Create a credential object from the ticket data
        const cred = unwrap(
            credential.Credential.create(
                {
                    type: unitType,
                    contextID: credential.computeContextID(ticketData.header.context),
                    userID: BigInt(ticketData.header.id),
                },
                {}  // Empty object for unit type
            )
        );

        // Generate the proof using the set up user object
        const proof = await proofGenProcess(cred, u);

        // Convert the proof to a string for QR code generation
        return JSON.stringify(proof);
    } catch (error) {
        console.error('Error generating proof:', error);
        throw new Error('Failed to generate proof');
    }
};

  async function proofGenProcess(myCred: credential.Credential, u: user.User) {
    const externalNullifier = utils.computeExternalNullifier(
      "Galxe Identity Protocol tutorial's verification"
    );
    console.log("Downloading proof generation gadgets...");
    const proofGenGadgets = await user.User.fetchProofGenGadgetsByTypeID(
      myCred.header.type,
      provider
    );
    console.log("Proof generation gadgets downloaded successfully.");
    const proof = await u.genBabyzkProof(
      u.getIdentityCommitment("evm")!,
      myCred,
      {
        expiratedAtLowerBound: BigInt(
          Math.ceil(new Date().getTime() / 1000) + 3 * 24 * 60 * 60
        ),
        externalNullifier: externalNullifier,
        equalCheckId: BigInt(0),
        pseudonym: BigInt("0xdeadbeef"),
      },
      proofGenGadgets,
      []  // Empty array of statements for a unit credential
    );
    return proof;
  }

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code');
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
                  <GenerateProofButton onClick={() => handleGenerateProof(ticket)}>
                    Generate Proof
                  </GenerateProofButton>
                  {qrCodeValue && (
                    <QRCodeContainer>
                      <QRCode id="qr-code" value={qrCodeValue} />
                      <DownloadButton onClick={handleDownloadQR}>
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

const GenerateProofButton = styled(Button)`
  background: linear-gradient(45deg, #4ecdc4, #45b7d8);
  color: white;
  padding: 8px 16px;
  font-size: 14px;
  margin-top: 8px;
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