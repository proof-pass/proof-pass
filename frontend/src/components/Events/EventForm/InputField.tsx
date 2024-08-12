import React from 'react';
import styled from 'styled-components';

interface InputFieldProps {
  label: string;
  id: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const InputField: React.FC<InputFieldProps> = ({ label, id, value, onChange }) => {
  return (
    <FieldContainer>
      <Label htmlFor={id}>{label}</Label>
      <StyledInput 
        id={id} 
        name={id}
        type="text" 
        value={value} 
        onChange={onChange}
      />
    </FieldContainer>
  );
};

const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 13px;
`;

const Label = styled.label`
  color: #ff8151;
  font: 800 16px Inter, sans-serif;
  margin-bottom: 5px;
`;

const StyledInput = styled.input`
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background-color: rgba(144, 151, 166, 0.11);
  height: 50px;
  padding: 0 10px;
  font: 400 16px Inter, sans-serif;
`;