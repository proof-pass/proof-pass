import React from 'react';
import styled from 'styled-components';

interface DateFieldProps {
  label: string;
  id: string;
  value?: Date;
  onChange: (name: string, date: Date) => void;
}

export const DateField: React.FC<DateFieldProps> = ({ label, id, value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    onChange(id, date);
  };

  return (
    <FieldContainer>
      <Label htmlFor={id}>{label}</Label>
      <StyledInput 
        id={id} 
        name={id}
        type="date" 
        value={value?.toISOString().split('T')[0]}
        onChange={handleChange}
        placeholder="mm/dd/yyyy" 
      />
    </FieldContainer>
  );
};

const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Label = styled.label`
  color: #ff8151;
  font: 800 16px Inter, sans-serif;
  margin-bottom: 5px;
`;

const StyledInput = styled.input`
  align-self: stretch;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background-color: rgba(144, 151, 166, 0.11);
  min-height: 50px;
  color: rgba(144, 151, 166, 0.6);
  text-align: center;
  letter-spacing: 0.5px;
  padding: 10px 16px 10px 5px;
  font: 400 16px/24px Roboto, sans-serif;

  &::placeholder {
    color: rgba(144, 151, 166, 0.6);
  }
`;