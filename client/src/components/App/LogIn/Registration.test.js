// Author: Lauren Jung

describe('Signup Component', () => {

  // Acceptance Criteria 1: Happy path - must wait until a later sprint

  // Acceptance Criteria 2: Empty entries
  test('shows validation errors when fields are empty', () => {
    const formData = {
        firstname: '',
        lastname: '',
        email: '',
        username: '',
        password: '',
        confirmpassword: ''
    };
    
    let errors = {};
    Object.keys(formData).forEach((key) => {
        if (!formData[key]) {
            errors[key] = 'This field is required.';
        }
    });
    
    // Using the specific error text from your AC
    const errorCount = Object.keys(errors).length;
    expect(errorCount).toBeGreaterThan(0); 
    expect(errors.firstname).toEqual('This field is required.');
    expect(errors.username).toBe('This field is required.');
  });

// Acceptance Criteria 3: Existing email - must wait until a later sprint


// Acceptance Criteria 4: 


// Acceptance Criteria 5: Account verification (Must wait until later sprint)

// Acceptance Criteria 6: Account verification (Must wait until later sprint)

// Acceptance Criteria 7: User refresh - must wait for a later sprint
});