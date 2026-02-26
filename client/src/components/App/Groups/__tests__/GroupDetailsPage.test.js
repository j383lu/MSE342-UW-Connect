import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import GroupDetailsPage from '../GroupDetailsPage';

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ groupId: '1' }),
  useNavigate: () => jest.fn()
}));

global.fetch = jest.fn();

const mockGroup = {
  group_id: 1,
  name: 'Soccer Team',
  description: 'Weekly soccer games',
  category: 'Sports',
  creator_id: 1,
  member_count: 5,
  max_members: 20,
  is_private: 0,
  image_url: 'test-image.jpg'
};

const mockMembers = [
  { user_id: 1, display_name: 'John Doe', role: 'owner' },
  { user_id: 2, display_name: 'Jane Smith', role: 'member' },
  { user_id: 3, display_name: 'Bob Johnson', role: 'member' }
];

describe('GroupDetailsPage Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock successful responses
    fetch.mockImplementation((url) => {
      if (url === '/api/groups/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGroup)
        });
      }
      if (url === '/api/groups/1/members') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMembers)
        });
      }
      if (url === '/api/users/1/groups/member') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockGroup])
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Loading group/i)).toBeInTheDocument();
  });

  test('displays group details after loading', async () => {
    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Soccer Team')).toBeInTheDocument();
      expect(screen.getByText(/Weekly soccer games/i)).toBeInTheDocument();
      expect(screen.getByText('Sports')).toBeInTheDocument();
    });
  });

  test('displays member list with correct roles', async () => {
    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('👑 Owner')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getAllByText('Member')[0]).toBeInTheDocument();
    });
  });

  test('shows correct button for member (Leave)', async () => {
    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const leaveButton = screen.getByText('Leave Group');
      expect(leaveButton).toBeInTheDocument();
    });
  });

  test('shows correct button for non-member (Join)', async () => {
    // Mock user not being a member
    fetch.mockImplementation((url) => {
      if (url === '/api/users/1/groups/member') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url === '/api/groups/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGroup)
        });
      }
      if (url === '/api/groups/1/members') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMembers)
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const joinButton = screen.getByText('Join Group');
      expect(joinButton).toBeInTheDocument();
    });
  });

  test('displays error message when group not found', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Group not found' })
      })
    );

    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Group not found/i)).toBeInTheDocument();
    });
  });

  test('handles join button click', async () => {
    const mockJoin = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Successfully joined group' })
    });

    fetch.mockImplementation((url, options) => {
      if (url === '/api/groups/1/join' && options.method === 'POST') {
        return mockJoin();
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGroup)
      });
    });

    render(
      <BrowserRouter>
        <GroupDetailsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const joinButton = screen.getByText('Join Group');
      fireEvent.click(joinButton);
      expect(mockJoin).toHaveBeenCalled();
    });
  });
});