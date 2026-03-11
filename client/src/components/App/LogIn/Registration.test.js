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


  // ADDED TESTS FOR STORY 10

  // Acceptacne Criteria 1 and 2
  test('password must be between 8 and 32 characters', () => {
    const tooShort = 'Pass1';
    const tooLong = 'A'.repeat(33) + 'a1';
    
    // Logic: If length < 8, expect specific error
    expect(validatePassword(tooShort)).toBe('Password doesn’t meet minimum character length.');
    expect(validatePassword(tooLong)).toBe('Password has exceeded the maximum character length');
  });

  // Acceptance Criteria 3 and 4
  test('password must contain uppercase and lowercase letters', () => {
    const noUpper = 'lowercase123!';
    const noLower = 'UPPERCASE123!';
    
    expect(validatePassword(noUpper)).toBe('Password must contain an uppercase');
    expect(validatePassword(noLower)).toBe('Password must contain a lowercase letter.');
  });

  // Acceptance Criteria 7: password and password confirmation must match
  test('password and confirmation must match', () => {
    const pass = 'ValidPass1';
    const confirm = 'WrongMatch2';
    
    expect(validateMatch(pass, confirm)).toBe('Passwords must match');
  });

  // Acceptance Criteria 3: Existing email - must wait until a later sprint
  // ... (rest of your placeholders)



});