import React from 'react';
import styled, { keyframes, css } from 'styled-components';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  animate?: boolean;
}

const dropIn = keyframes`
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  type = 'button', 
  onClick, 
  disabled = false,
  animate = false,
  ...props
}) => {
  return (
    <StyledButton 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      $animate={animate}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

const StyledButton = styled.button<{ disabled: boolean; $animate: boolean }>`
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background-color: ${props => props.disabled ? '#cccccc' : '#ff8151'};
  min-height: 50px;
  width: 100%;
  color: ${props => props.disabled ? '#666666' : '#ffffff'};
  padding: 13px 32px;
  font: 700 16px Inter, sans-serif;
  border: none;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.3s ease;
  ${props => props.$animate && css`
    animation: ${dropIn} 0.5s ease-out;
  `}

  &:hover {
    background-color: ${props => props.disabled ? '#cccccc' : '#e66f3e'};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 129, 81, 0.3);
  }
`;