import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import GroupsPage from '../GroupsPage';
import apiRequest from '../../../../utils/api';

jest.mock('../../../../utils/api');

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

const mockGroups = [
  {
    group_id: 1,
    name: 'Soccer Team',
    description: 'Weekly soccer games',
    category: 'Sports',
    creator_id: 1,
    member_count: 5,
    max_members: 20,
    is_private: 0,
    image_url: null
  }
];

const mockTags = [
  { tag_id: 1, tag_name: 'Sports' }
];

const mockInvites = [
  {
    invite_id: 10,
    group_id: 2,
    group_name: 'Test User - Group',
    inviter_name: 'New Test User'
  }
];

function createApiMock(overrides = {}) {
  return (url, options) => {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    if (u.includes('/api/tags') || u === '/api/tags') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.tags || mockTags)
      });
    }
    if (u.includes('/api/groups') && !u.includes('/api/groups/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.groups || mockGroups)
      });
    }
    if (u && u.includes('/api/users/') && u.includes('/groups/member')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.memberGroups || [])
      });
    }
    if (u && u.includes('/api/users/') && u.includes('/invites')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.invites || [])
      });
    }
    if (u && u.includes('/api/users/') && u.includes('/join-requests-as-owner')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.joinRequests || [])
      });
    }
    if (u.includes('/api/posts')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(overrides.posts || [])
      });
    }
    if (u && u.includes('/api/invites/') && u.includes('/respond')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Invite declined' })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    });
  };
}

describe('GroupsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('currentUserId', '1');
    apiRequest.mockImplementation(createApiMock());
  });

  test('renders loading state', () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Loading groups/i)).toBeInTheDocument();
  });

  test('displays groups after loading', async () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Groups')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
    });
  });

  describe('user-specific groups', () => {
    test('uses currentUserId from localStorage for Owned Groups', async () => {
      localStorage.setItem('currentUserId', '1');
      apiRequest.mockImplementation(createApiMock({
        memberGroups: [{ group_id: 1, name: 'Soccer Team' }]
      }));

      render(
        <BrowserRouter>
          <GroupsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Owned Groups')).toBeInTheDocument();
      });
    });
  });

  describe('invitation banner', () => {
    beforeEach(() => {
      localStorage.setItem('currentUserId', '1');
      apiRequest.mockImplementation(createApiMock({
        invites: mockInvites
      }));
    });

    test('shows invitation banner when user has pending invites', async () => {
      render(
        <BrowserRouter>
          <GroupsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
        expect(screen.getAllByText(/Test User - Group/).length).toBeGreaterThanOrEqual(1);
      }, { timeout: 5000 });
    });

    test('shows notification badge with invite count when invites exist', async () => {
      render(
        <BrowserRouter>
          <GroupsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    test('displays feedback popup after clicking Decline', async () => {
      render(
        <BrowserRouter>
          <GroupsPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
      });

      const declineBtn = screen.getByRole('button', { name: /Decline/i });
      fireEvent.click(declineBtn);

      await waitFor(() => {
        expect(screen.getByText(/You have declined the invitation to join group/)).toBeInTheDocument();
        expect(screen.getAllByText(/Test User - Group/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      });
    });

    test('displays feedback popup after clicking Accept', async () => {
      const u = (url) => (typeof url === 'string' ? url : (url && url.url) || String(url || ''));
      apiRequest.mockImplementation((url, opts) => {
        if (u(url).includes('/api/invites/') && u(url).includes('/respond')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: 'Invite accepted' })
          });
        }
        return createApiMock({ invites: mockInvites })(url, opts);
      });

      render(
        <BrowserRouter>
          <GroupsPage />
        </BrowserRouter>
      );

      const acceptBtn = await screen.findByRole('button', { name: /Accept/i }, { timeout: 5000 });
      fireEvent.click(acceptBtn);

      await waitFor(() => {
        expect(screen.getByText(/You have accepted the invitation/i)).toBeInTheDocument();
      });
    });
  });
});