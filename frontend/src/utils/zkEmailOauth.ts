import { useState, useCallback, useEffect } from 'react';
import { OauthClient } from "@zk-email/oauth-sdk";
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const CORE_ADDRESS = '0x3C0bE6409F828c8e5810923381506e1A1e796c2F';
const OAUTH_ADDRESS = '0x8bFcBe6662e0410489d210416E35E9d6B62AF659';
const RELAYER_HOST = "https://oauth-api.emailwallet.org";
const TRANSPORT_HOST = "https://sepolia.base.org";

interface SessionData {
    ephemeralPrivateKey: string;
    email: string;
    walletAddress: `0x${string}` | null;
}

export const useZkEmailOAuth = () => {
    const [oauthClient, setOauthClient] = useState<OauthClient<typeof baseSepolia> | null>(null);
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [emailWalletStatus, setEmailWalletStatus] = useState('Not connected');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [isConnectingEmailWallet, setIsConnectingEmailWallet] = useState(false);
    const [requestId, setRequestId] = useState<number | null>(null);

    const initOauthClient = useCallback(() => {
        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(TRANSPORT_HOST),
        });
        const client = new OauthClient<typeof baseSepolia>(publicClient, CORE_ADDRESS, OAUTH_ADDRESS, RELAYER_HOST);
        setOauthClient(client);
    }, []);

    const checkConnectionStatus = useCallback(() => {
        const storedSessionData = localStorage.getItem('zkEmailSession');
        if (storedSessionData) {
            const parsedSessionData = JSON.parse(storedSessionData);
            setSessionData(parsedSessionData);
            setEmailWalletStatus('Connected');
        } else {
            setSessionData(null);
            setEmailWalletStatus('Not connected');
        }
    }, []);

    const handleZKEmailSubmit = useCallback(async (email: string, username: string | null, isSignUp: boolean) => {
        if (!oauthClient) {
            throw new Error('OAuth client not initialized');
        }
    
        setIsConnectingEmailWallet(true);
        setEmailError(null);
        setIsEmailSent(false);
        
        try {
            // If cached ephemeral private key and wallet address are available,
            // skip the email wallet connection process
            if (sessionData?.ephemeralPrivateKey && sessionData?.walletAddress) {
                setEmailWalletStatus('Connected');
                return true;
            }
    
            const reqId = await oauthClient.setup(email, username, null, null);
            setRequestId(reqId);
            setIsEmailSent(true);
            
            const isActivated = await oauthClient.waitEpheAddrActivated(reqId);
            
            if (isActivated) {
                const walletAddress = oauthClient.getWalletAddress();
                const ephePrivateKey = oauthClient.getEphePrivateKey();
    
                const newSessionData: SessionData = {
                    ephemeralPrivateKey: ephePrivateKey,
                    email,
                    walletAddress,
                };
                setSessionData(newSessionData);
                localStorage.setItem('zkEmailSession', JSON.stringify(newSessionData));
                setEmailWalletStatus('Connected');
                return true;
            } else {
                throw new Error('Failed to activate ephemeral address');
            }
        } catch (error) {
            setEmailError(error instanceof Error ? error.message : 'An unknown error occurred');
            setIsEmailSent(false);
            return false;
        } finally {
            setIsConnectingEmailWallet(false);
        }
    }, [oauthClient, sessionData]);

    const handleResetEmailProcess = useCallback(() => {
        setEmailError(null);
        setIsEmailSent(false);
        setIsConnectingEmailWallet(false);
        setRequestId(null);
        setSessionData(null);
        localStorage.removeItem('zkEmailSession');
        setEmailWalletStatus('Not connected');
        
        initOauthClient();
    }, [initOauthClient]);

    // On mount, check if the user is already connected to an email wallet
    useEffect(() => {
        checkConnectionStatus();
    }, [checkConnectionStatus]);

    return {
        initOauthClient,
        handleZKEmailSubmit,
        handleResetEmailProcess,
        sessionData,
        emailWalletStatus,
        emailError,
        isEmailSent,
        isConnectingEmailWallet,
        checkConnectionStatus,
    };
};