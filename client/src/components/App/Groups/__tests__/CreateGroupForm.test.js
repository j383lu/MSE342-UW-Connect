import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CreateGroupForm from '../CreateGroupForm';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

global.fetch = jest.fn();

const mockTags = [
  { tag_id: 1, tag_name: 'Sports' },
  { tag_id: 2, tag_name: 'Academic' },
  { tag_id: 3, tag_name: 'Social' }
];

describe('CreateGroupForm Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockNavigate.mockClear();
    
    // Mock tags API
    fetch.mockImplementation((url) => {
      if (url === '/api/tags') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTags)
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('renders form with all fields', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Group Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Privacy/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Maximum Members/i)).toBeInTheDocument();
    });
  });

  test('loads tags from API', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      const select = screen.getByLabelText(/Category/i);
      expect(select).toBeInTheDocument();
      
      // Check if tags are loaded
      mockTags.forEach(tag => {
        expect(screen.getByText(tag.tag_name)).toBeInTheDocument();
      });
    });
  });

  test('validates required fields', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    // Try to submit without filling fields
    const submitButton = screen.getByText('Create Group');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Group name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a category/i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a privacy option/i)).toBeInTheDocument();
    });
  });

  test('updates completion percentage as fields are filled', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/0% Complete/i)).toBeInTheDocument();
    });

    // Fill group name
    const nameInput = screen.getByLabelText(/Group Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Group' } });
    expect(screen.getByText(/25% Complete/i)).toBeInTheDocument();

    // Fill description
    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'This is a test group description' } });
    expect(screen.getByText(/50% Complete/i)).toBeInTheDocument();

    // Select category
    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'Sports' } });
    expect(screen.getByText(/75% Complete/i)).toBeInTheDocument();

    // Select privacy
    const publicRadio = screen.getByLabelText('Public');
    fireEvent.click(publicRadio);
    expect(screen.getByText(/100% Complete/i)).toBeInTheDocument();
  });

  test('handles image upload', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Group Cover Image/i).querySelector('input[type="file"]');
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
  });

  test('submits form with correct data', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 123, message: 'Group created successfully' })
    });

    fetch.mockImplementation((url, options) => {
      if (url === '/api/groups' && options.method === 'POST') {
        return mockSubmit();
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTags)
      });
    });

    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Fill out the form
      fireEvent.change(screen.getByLabelText(/Group Name/i), { 
        target: { value: 'Test Group' } 
      });
      fireEvent.change(screen.getByLabelText(/Description/i), { 
        target: { value: 'This is a test group' } 
      });
      fireEvent.change(screen.getByLabelText(/Category/i), { 
        target: { value: 'Sports' } 
      });
      fireEvent.click(screen.getByLabelText('Public'));
      fireEvent.change(screen.getByLabelText(/Maximum Members/i), { 
        target: { value: '15' } 
      });

      // Submit the form
      fireEvent.click(screen.getByText('Create Group'));
      
      expect(mockSubmit).toHaveBeenCalled();
    });
  });

  test('handles API error on submit', async () => {
    fetch.mockImplementation((url, options) => {
      if (url === '/api/groups' && options.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to create group' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTags)
      });
    });

    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/Group Name/i), { 
        target: { value: 'Test Group' } 
      });
      fireEvent.change(screen.getByLabelText(/Description/i), { 
        target: { value: 'This is a test group' } 
      });
      fireEvent.change(screen.getByLabelText(/Category/i), { 
        target: { value: 'Sports' } 
      });
      fireEvent.click(screen.getByLabelText('Public'));
      fireEvent.click(screen.getByText('Create Group'));

      expect(screen.getByText(/Failed to create group/i)).toBeInTheDocument();
    });
  });

  test('cancels and navigates back', async () => {
    render(
      <BrowserRouter>
        <CreateGroupForm />
      </BrowserRouter>
    );

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith('/groups');
    });
  });
});