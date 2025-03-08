// API URL - make sure this matches your backend server
const API_URL = 'http://localhost:3000/api';

// Handle Login
async function handleLogin(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store token
    localStorage.setItem('token', data.token);
    
    // Redirect to dashboard
    window.location.href = '/AFTER_INTERFACE1.html';
  } catch (error) {
    alert(error.message);
  }
}

// Handle Registration
async function handleRegister(email, password, fullName) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Store token
    localStorage.setItem('token', data.token);
    
    // Redirect to dashboard
    window.location.href = '/AFTER_INTERFACE1.html';
  } catch (error) {
    alert(error.message);
  }
}

// Check Authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/claudeP1.html';
  }
  return token;
}