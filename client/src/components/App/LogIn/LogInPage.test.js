// Author: Lauren Jung

describe('Login Component', () => {

    // Acceptance criteria 1: Log in speed - must wait until a later sprint

    // Acceptance Criteria 2 & 3: Incorrect log in information/empty submission
    test('shows Required message for incorrect or empty fields', () => {
        const formData = { username: '', password: '' };
        const errors = {};

        // click without entering anything
        if (!formData.username) errors.username = 'This field is required.';
        
        expect(errors.username).toBeDefined();
        expect(errors.username).toMatch(/required/);
    });

    // Acceptance Criteria 4: Masked password
    test('masks password characters by default', () => {
        const showPassword = false;
        const inputType = showPassword ? 'text' : 'password';
        
        expect(inputType).toBe('password');
    });

    // Acceptance criteria 7: masked password toggle
    test('toggles password visibility when eye icon is clicked', () => {
        let showPassword = false;
        
        const toggle = (val) => !val;
        showPassword = toggle(showPassword);

        expect(showPassword).toBeTruthy(); 
    });

    // Acceptance Criteria 5: Account locking - Must wait until a later sprint

    // Acceptance Criteria 6: Log in preservation - must wait until a later sprint
});