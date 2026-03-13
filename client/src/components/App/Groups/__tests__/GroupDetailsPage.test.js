import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import GroupDetailsPage from '../GroupDetailsPage';

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ groupId: '1' }),
  useNavigate: () => jest.fn()
}));

// Silence act warnings, React Router warnings, and other console noise
const originalConsole = { log: console.log, warn: console.warn, error: console.error };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

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

const mockGroupPrivate = {
  ...mockGroup,
  is_private: 1
};

const mockMembers = [{ user_id: 1, display_name: 'Test User', role: 'owner' }];

function createFetchMock(groupOverride = {}) {
  return (url) => {
    const u = typeof url === 'string' ? url : String(url || '');
    if ((u === '/api/groups/1' || u.endsWith('/api/groups/1')) && !u.includes('/members') && !u.includes('/invite')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...mockGroup, ...groupOverride })
      });
    }
    if (u.includes('/api/groups/1/members')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMembers)
      });
    }
    if (u.includes('/api/users/') && u.includes('/groups/member')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ group_id: 1 }])
      });
    }
    if (u.includes('/api/groups/1/invite')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ invitedName: 'Jane Doe' })
      });
    }
    return Promise.reject(new Error('Not found'));
  };
}

describe('GroupDetailsPage', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    localStorage.setItem('currentUserId', '1');
    fetch.mockImplementation(createFetchMock());
  });

  test('renders loading state', () => {
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
    });
  });

  describe('invite modal and feedback', () => {
    test('shows Invite button for owner of private group', async () => {
      fetch.mockImplementation(createFetchMock(mockGroupPrivate));

      render(
        <BrowserRouter>
          <GroupDetailsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('+ Invite')).toBeInTheDocument();
      });
    });

    test('opens invite modal when Invite is clicked', async () => {
      fetch.mockImplementation(createFetchMock(mockGroupPrivate));

      render(
        <BrowserRouter>
          <GroupDetailsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('+ Invite')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Invite'));

      await waitFor(() => {
        expect(screen.getByText('Invite by email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Send Invite/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      });
    });

    test('shows Invitation sent feedback after successful invite', async () => {
      fetch.mockImplementation(createFetchMock(mockGroupPrivate));

      render(
        <BrowserRouter>
          <GroupDetailsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('+ Invite')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Invite'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'jane@uwaterloo.ca' } });

      const sendBtn = screen.getByRole('button', { name: /Send Invite/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/Invitation sent to Jane Doe/)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    test('shows already a member feedback when invite target is member', async () => {
      fetch.mockImplementation((url, options) => {
        const u = typeof url === 'string' ? url : String(url || '');
        if (u.includes('/api/groups/1/invite')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ code: 'already_member', userName: 'John Smith' })
          });
        }
        return createFetchMock(mockGroupPrivate)(url);
      });

      render(
        <BrowserRouter>
          <GroupDetailsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('+ Invite')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Invite'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'john@uwaterloo.ca' } });

      const sendBtn = screen.getByRole('button', { name: /Send Invite/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/John Smith is already a member of the group/)).toBeInTheDocument();
      });
    });
  });
});