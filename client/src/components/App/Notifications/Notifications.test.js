import React from 'react';
import 'whatwg-fetch';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Notifications from './Notifications';
import { useUser } from '../../../contexts/UserContext';
import apiRequest from '../../../utils/api';

jest.mock('../../../contexts/UserContext');
jest.mock('../../../utils/api');

const mockNotifications = [
  {
    id: 1,
    action_type: 'JOIN',
    message: 'John Doe joined the group',
    is_read: 0,
    created_at: '2023-10-01T10:00:00Z',
  },
  {
    id: 2,
    action_type: 'LEAVE',
    message: 'Jane Smith left the group',
    is_read: 1,
    created_at: '2023-10-01T11:00:00Z',
  },
];

describe('Notifications Component', () => {
  beforeEach(() => {
    // set up default mock return values
    useUser.mockReturnValue({
      dbUser: { userId: 'user-123' },
    });

    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<Notifications />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders JOIN notification with correct icon and message', async () => {
    render(<Notifications />);

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    expect(screen.getByText('John Doe joined the group')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  test('renders LEAVE notification with correct message', async () => {
    render(<Notifications />);

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    expect(screen.getByText('Jane Smith left the group')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  test('displays empty state when no notifications exist', async () => {
    apiRequest.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });
  });

  test('marks all notifications as read when button is clicked', async () => {
    render(<Notifications />);

    await waitFor(() => screen.getByText('Mark All as Read'));
    
    const markBtn = screen.getByText('Mark All as Read');
    
    apiRequest.mockResolvedValueOnce({ ok: true });

    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(screen.queryByText('Mark All as Read')).not.toBeInTheDocument();
      const statusPills = screen.getAllByText('Read');
      expect(statusPills.length).toBe(2); 
    });
  });
});