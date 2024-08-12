import React from 'react';
import styled from 'styled-components';

interface TextAreaProps {
  label: string;
  id: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, id, value, onChange }) => {
  return (
    <FieldContainer>
      <Label htmlFor={id}>{label}</Label>
      <StyledTextArea 
        id={id}
        name={id}
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

const StyledTextArea = styled.textarea`
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background-color: rgba(144, 151, 166, 0.11);
  width: 100%;
  height: 170px;
  padding: 10px;
  font: 400 16px Inter, sans-serif;
  resize: vertical;
`;