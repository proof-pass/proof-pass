import React from 'react';
import styled from 'styled-components';

interface JsonDisplayProps {
  data: Record<string, unknown> | null | undefined;
}

const JsonDisplay: React.FC<JsonDisplayProps> = ({ data }) => {
  if (!data) {
    return <div>No data available</div>;
  }

  const renderValue = (value: unknown): JSX.Element => {
    if (typeof value === 'object' && value !== null) {
      return <pre>{JSON.stringify(value, null, 2)}</pre>;
    }
    return <span>{JSON.stringify(value)}</span>;
  };

  return (
    <JsonContainer>
      {Object.entries(data).map(([key, value]) => (
        <JsonItem key={key}>
          <JsonKey>{key}:</JsonKey> {renderValue(value)}
        </JsonItem>
      ))}
    </JsonContainer>
  );
};

const JsonContainer = styled.div`
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
`;

const JsonItem = styled.div`
  margin-bottom: 8px;
`;

const JsonKey = styled.span`
  font-weight: bold;
  color: #881391;
`;

export default JsonDisplay;