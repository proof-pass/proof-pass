import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { InputField } from './InputField';
import { DateField } from './DateField';
import { TextArea } from './TextArea';
import { Button } from './Button';
import { CreateEventRequest } from '@/api';

interface EventFormProps {
  onSubmit: (formData: CreateEventRequest) => Promise<void>;
}

export const EventForm: React.FC<EventFormProps> = ({ onSubmit }) => {
    const [formData, setFormData] = useState<CreateEventRequest>({
        name: '',
        description: '',
        url: '',
        adminCode: '',
        startDate: new Date(),
        endDate: new Date(),
    });
    const [formState, setFormState] = useState<'initial' | 'confirming' | 'publishing' | 'published'>('initial');
    const [countdown, setCountdown] = useState(10);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name: string, date: Date) => {
        setFormData(prev => ({ ...prev, [name]: date }));
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (formState === 'confirming' && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (formState === 'confirming' && countdown === 0) {
            handleConfirm();
        }
        return () => clearTimeout(timer);
    }, [formState, countdown]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormState('confirming');
        setCountdown(10);
    };

    const handleConfirm = async () => {
        setFormState('publishing');
        try {
            await onSubmit(formData);
            setFormState('published');
        } catch (error) {
            console.error('Error submitting form:', error);
            setFormState('initial');
        }
    };

    const handleCancel = () => {
        setFormState('initial');
        setCountdown(10);
    };

    return (
        <StyledForm onSubmit={handleSubmit}>
            <InputField 
                label="Event Name" 
                id="name" 
                value={formData.name} 
                onChange={handleChange} 
            />
            <InputField 
                label="Event Link" 
                id="url" 
                value={formData.url} 
                onChange={handleChange} 
            />
            <DateFieldContainer>
                <DateField 
                    label="Start Date" 
                    id="startDate" 
                    value={formData.startDate} 
                    onChange={handleDateChange} 
                />
                <DateField 
                    label="End Date" 
                    id="endDate" 
                    value={formData.endDate} 
                    onChange={handleDateChange} 
                />
            </DateFieldContainer>
            <InputField 
                label="Admin Code" 
                id="adminCode" 
                value={formData.adminCode} 
                onChange={handleChange} 
            />
            <TextArea 
                label="Description" 
                id="description" 
                value={formData.description} 
                onChange={handleChange} 
            />
            <ButtonContainer>
                {formState === 'initial' && (
                    <Button type="submit">Publish Event</Button>
                )}
                {formState === 'confirming' && (
                    <>
                        <Button onClick={() => handleConfirm()} type="button">
                            Looks Good ({countdown})
                        </Button>
                        <CancelButton onClick={handleCancel} type="button">Cancel</CancelButton>
                    </>
                )}
                {formState === 'publishing' && (
                    <Button disabled>Publishing...</Button>
                )}
                {formState === 'published' && (
                    <Button disabled>Published! ✓</Button>
                )}
            </ButtonContainer>
        </StyledForm>
    );
};

const StyledForm = styled.form`
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    padding: 20px;
`;

const DateFieldContainer = styled.div`
    display: flex;
    gap: 16px;
    margin-top: 13px;
`;

const ButtonContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 13px;
    height: 90px; 
`;

const CancelButton = styled(Button)`
    background-color: #e0e0e0;
    color: #333;

    &:hover {
        background-color: #d0d0d0;
    }
`;