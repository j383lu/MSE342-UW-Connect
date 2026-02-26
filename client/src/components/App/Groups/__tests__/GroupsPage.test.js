import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import GroupsPage from '../GroupsPage';

// Mock fetch globally
global.fetch = jest.fn();

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
  },
  {
    group_id: 2,
    name: 'Study Group',
    description: 'CS study sessions',
    category: 'Academic',
    creator_id: 2,
    member_count: 3,
    max_members: 10,
    is_private: 0,
    image_url: null
  }
];

const mockTags = [
  { tag_id: 1, tag_name: 'Sports' },
  { tag_id: 2, tag_name: 'Academic' },
  { tag_id: 3, tag_name: 'Social' }
];

const mockMemberships = [1]; // User is a member of group 1

describe('GroupsPage Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock successful responses
    fetch.mockImplementation((url) => {
      if (url === '/api/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTags)
        });
      }
      if (url === '/api/groups') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGroups)
        });
      }
      if (url === '/api/users/1/groups/member') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGroups.filter(g => g.group_id === 1))
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('renders loading state initially', () => {
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
      expect(screen.getByText('Soccer Team')).toBeInTheDocument();
      expect(screen.getByText('Study Group')).toBeInTheDocument();
    });
  });

  test('correctly categorizes owned groups', async () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Group 1 is owned by user 1
      const ownedSection = screen.getByText('Owned Groups').parentElement;
      expect(ownedSection).toHaveTextContent('Soccer Team');
      expect(ownedSection).toHaveTextContent('👑 Owner');
    });
  });

  test('correctly categorizes my groups', async () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const myGroupsSection = screen.getByText('My Groups').parentElement;
      expect(myGroupsSection).toHaveTextContent('Soccer Team');
      expect(myGroupsSection).not.toHaveTextContent('Study Group');
    });
  });

  test('filter dropdown loads tags from API', async () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const select = screen.getByLabelText(/Category/i);
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Sports')).toBeInTheDocument();
      expect(screen.getByText('Academic')).toBeInTheDocument();
    });
  });

  test('search input filters groups', async () => {
    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Soccer Team')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search groups/i);
    fireEvent.change(searchInput, { target: { value: 'Study' } });

    await waitFor(() => {
      expect(screen.queryByText('Soccer Team')).not.toBeInTheDocument();
      expect(screen.getByText('Study Group')).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('API Error'))
    );

    render(
      <BrowserRouter>
        <GroupsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load groups/i)).toBeInTheDocument();
    });
  });
});