import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Image from 'next/image';

interface ZKEmailLoginFormProps {
  onSubmit: (email: string, username: string | null, isSignUp: boolean) => void;
  onClose: () => void;
  onReset: () => void;
  isLoading: boolean;
  error: string | null;
  isEmailSent: boolean;
}

const ZKEmailLoginForm: React.FC<ZKEmailLoginFormProps> = ({ 
  onSubmit, 
  onClose, 
  onReset,
  isLoading, 
  error, 
  isEmailSent 
}) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isEmailSent && !error) {
      setShowInstructions(true);
    } else {
      setShowInstructions(false);
    }
  }, [isEmailSent, error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, isSignUp ? username : null, isSignUp);
  };

  const handleTryAgain = () => {
    setEmail('');
    setUsername('');
    setShowInstructions(false);
    onReset();
  };

  const handleClose = () => {
    onClose();
    onReset();
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setUsername('');
  };

  return (
    <FormContainer>
      <CloseButton onClick={handleClose} disabled={isLoading}>
        <Image src="/close-button.svg" alt="Close" width={24} height={24} />
      </CloseButton>
      <FormHeader>
        {showInstructions ? 'Check Your Email' : `${isSignUp ? 'Sign Up' : 'Sign In'} to Email Wallet`}
      </FormHeader>
      {!showInstructions ? (
        <StyledForm onSubmit={handleSubmit}>
          <EmailInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            disabled={isLoading}
          />
          {isSignUp && (
            <UsernameInput
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              disabled={isLoading}
            />
          )}
          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? <LoadingSpinner /> : isSignUp ? 'Sign Up' : 'Sign In'}
          </SubmitButton>
          <ToggleModeButton type="button" onClick={toggleMode} disabled={isLoading}>
            {isSignUp ? 'Already have an account? Sign In' : 'New user? Sign Up'}
          </ToggleModeButton>
          {error && (
            <ErrorMessage>
              {error}
              <TryAgainButton onClick={handleTryAgain}>Try Again</TryAgainButton>
            </ErrorMessage>
          )}
        </StyledForm>
      ) : (
        <InstructionMessage>
          We've sent an email to <strong>{email}</strong>. Please check your inbox and follow the instructions to complete the {isSignUp ? 'sign-up' : 'sign-in'} process.
          <TryAgainButton onClick={handleTryAgain}>Use a different email</TryAgainButton>
        </InstructionMessage>
      )}
    </FormContainer>
  );
};

const FormContainer = styled.div`
  background-color: white;
  border-radius: 20px;
  padding: 30px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const CloseButton = styled.button<{ disabled: boolean }>`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
`;

const FormHeader = styled.h2`
  font-size: 24px;
  text-align: center;
  margin-bottom: 20px;
  color: #333;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const EmailInput = styled.input`
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  font-size: 16px;
  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`;

const UsernameInput = styled(EmailInput)``;

const SubmitButton = styled.button<{ disabled: boolean }>`
  padding: 15px;
  border-radius: 10px;
  border: none;
  background-color: #5eb7ff;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.7 : 1};
  transition: background-color 0.3s, opacity 0.3s;
  &:hover {
    background-color: ${props => props.disabled ? '#5eb7ff' : '#4da8ff'};
  }
`;

const ToggleModeButton = styled.button<{ disabled: boolean }>`
  background: none;
  border: none;
  color: #5eb7ff;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 14px;
  text-decoration: underline;
  opacity: ${props => props.disabled ? 0.7 : 1};
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top: 2px solid #4ecdc4;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.p`
  color: #ff6b6b;
  font-size: 14px;
  text-align: center;
  margin-top: 10px;
`;

const InstructionMessage = styled.p`
  font-size: 16px;
  text-align: center;
  color: #333;
  margin-top: 20px;
  line-height: 1.5;
`;

const TryAgainButton = styled.button`
  background: none;
  border: none;
  color: #5eb7ff;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
  text-decoration: underline;
  display: block;
  width: 100%;
`;

export default ZKEmailLoginForm;